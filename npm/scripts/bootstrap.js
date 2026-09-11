#!/usr/bin/env node
"use strict";

// One-off bootstrap for the npm packages.
//
// npm only lets you configure a trusted publisher for a package that already
// exists, but the release workflow publishes ten of them. This script claims
// all ten names with a 0.0.0 placeholder and then points each one at this
// repository as its trusted publisher, so that tag builds can publish later
// without any long-lived token.
//
//   node npm/scripts/bootstrap.js --repository <owner>/<repo>
//                                [--workflow build.yml] [--dry-run]
//
// Needs `npm login` first. The account must have two-factor authentication
// enabled (npm refuses to manage trust relationships otherwise) and rights on
// the scope. npm will ask for a one-time code as it goes.

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const platforms = require("../lib/platforms.js");

const SCOPE = "@pkgship";
const VERSION = "0.0.0";
const REPO_ROOT = path.join(__dirname, "..", "..");
const WORK_DIR = path.join(REPO_ROOT, ".tmp", "npm-bootstrap");

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

const options = { repository: null, workflow: "build.yml", dryRun: false };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--dry-run") options.dryRun = true;
  else if (argv[i] === "--repository" || argv[i] === "--repo")
    options.repository = argv[++i];
  else if (argv[i] === "--workflow") options.workflow = argv[++i];
  else fail(`unknown option ${argv[i]}`);
}
if (!options.repository) fail("--repository <owner>/<repo> is required");
if (!/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(options.repository))
  fail("--repository must look like owner/repo");
if (!/^[A-Za-z0-9._-]+\.ya?ml$/.test(options.workflow))
  fail("--workflow must be a workflow filename ending in .yml or .yaml");

// npm is a cmd shim on Windows and cannot be spawned directly, so commands go
// through a shell. Nothing interpolated into one can contain shell syntax: the
// options above are restricted to name characters and every other value comes
// from platforms.js or is a fixed token. Package directories are passed as cwd
// rather than as paths, so no argument is ever a path.
function npm(command, { capture = false, cwd } = {}) {
  const result = spawnSync(`npm ${command}`, {
    shell: true,
    encoding: "utf8",
    cwd,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.error) fail(`cannot run npm: ${result.error.message}`);
  return result;
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

// Platform packages first, so the root package never points at names that do
// not exist yet.
function packageList() {
  return [
    ...Object.keys(platforms).map((id) => ({
      id,
      name: `${SCOPE}/vlmcsd-${id}`,
    })),
    { id: null, name: `${SCOPE}/vlmcsd` },
  ];
}

function generate() {
  fs.rmSync(WORK_DIR, { recursive: true, force: true });
  return packageList().map(({ id, name }) => {
    const dir = path.join(WORK_DIR, ...name.split("/"));
    writeJson(path.join(dir, "package.json"), {
      name,
      version: VERSION,
      description: id
        ? `Placeholder reserving this name; the ${id} binaries are published by the release workflow.`
        : "Microsoft-compatible KMS server emulator",
      license: "LGPL-2.1-or-later",
      homepage: "https://github.com/pkgship/vlmcsd#readme",
      repository: {
        type: "git",
        url: "git+https://github.com/pkgship/vlmcsd.git",
      },
      ...(id ? { os: [platforms[id].os], cpu: [platforms[id].cpu] } : {}),
    });
    fs.writeFileSync(
      path.join(dir, "README.md"),
      `# ${name}\n\n` +
        `Placeholder published at \`${VERSION}\` to reserve the name and register the\n` +
        "release workflow as a trusted publisher. Real builds follow.\n",
    );
    return { name, dir };
  });
}

const isPublished = (name) =>
  npm(`view ${name}@${VERSION} version`, { capture: true }).status === 0;

// The shape of `npm trust list --json` is not documented, so look for the
// repository and workflow anywhere in it rather than parsing it.
function isTrusted(name) {
  const result = npm(`trust list ${name} --json`, { capture: true });
  if (result.status !== 0) return false;
  const output = `${result.stdout || ""}`;
  return (
    output.includes(options.repository) && output.includes(options.workflow)
  );
}

function report(action, name) {
  console.log(`  ${options.dryRun ? `would ${action}` : action}: ${name}`);
}

if (!options.dryRun) {
  const whoami = npm("whoami", { capture: true });
  if (whoami.status !== 0) {
    fail(
      "not authenticated against npm; run `npm login` (the account needs 2FA enabled)",
    );
  }
  console.log(`npm user: ${`${whoami.stdout}`.trim()}\n`);
}

const packages = generate();

console.log(`Reserving ${packages.length} package names at ${VERSION}:`);
for (const { name, dir } of packages) {
  if (isPublished(name)) {
    report("skip, already on npm", name);
  } else if (options.dryRun) {
    report("publish", name);
  } else {
    const result = npm("publish --access public", { cwd: dir });
    if (result.status !== 0) fail(`npm publish failed for ${name}`);
    report("published", name);
  }
}

console.log(
  `\nRegistering ${options.repository} (${options.workflow}) as trusted publisher:`,
);
const failed = [];
for (const { name } of packages) {
  if (isTrusted(name)) {
    report("skip, already trusted", name);
  } else if (options.dryRun) {
    report("trust", name);
  } else {
    const result = npm(
      `trust github ${name} --file ${options.workflow} --repository ${options.repository} --allow-publish --yes`,
    );
    if (result.status === 0) report("trusted", name);
    else failed.push(name);
  }
}

if (failed.length) {
  console.error(
    `\nfailed to register a trusted publisher for: ${failed.join(", ")}`,
  );
  console.error(
    "Fix the cause and re-run; already configured packages are skipped.",
  );
  process.exit(1);
}

console.log(
  options.dryRun
    ? "\nDry run, nothing was published. Re-run without --dry-run."
    : "\nDone. Push a v* tag and the workflow publishes the real versions without a token.",
);
