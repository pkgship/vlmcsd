#!/usr/bin/env node
"use strict";

// Assemble the npm packages published for a release:
//
//   @pkgship/vlmcsd-<platform>   the three binaries for one platform
//   @pkgship/vlmcsd              shims plus one optionalDependency per platform
//
// The binaries are read from the per-platform CI artifacts (<dist>/bin-<id>),
// so this script never touches the network and can be run locally against any
// directory laid out the same way.
//
// It prints the packages in publish order (platform packages first, so the
// root package never briefly points at packages that do not exist yet) to
// <out>/.packages as tab separated "<directory>\t<name>\t<version>" lines.

const fs = require("node:fs");
const path = require("node:path");

const platforms = require("../lib/platforms.js");

const REPO_ROOT = path.join(__dirname, "..", "..");
const PACKAGE_DIR = path.join(__dirname, "..");
const SCOPE = "@pkgship";
const PROGRAMS = ["vlmcsd", "vlmcs", "vlmcsdmulti"];
const SHIPPED = [
  "bin/vlmcsd.js",
  "bin/vlmcs.js",
  "bin/vlmcsdmulti.js",
  "lib/run.js",
  "lib/platforms.js",
];

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

const options = { version: null, dist: "artifacts", out: "publish" };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2) {
  const key = argv[i].replace(/^--/, "");
  if (!(key in options)) fail(`unknown option ${argv[i]}`);
  if (i + 1 >= argv.length) fail(`${argv[i]} needs a value`);
  options[key] = argv[i + 1];
}
if (!options.version) fail("--version is required");

// npm insists on a strict x.y.z, while debian/changelog and the release tags
// carry free-form versions such as `1113` or `2020.03.28`.
function toNpmVersion(version) {
  const parts = version
    .split(/[+-]/)[0]
    .split(".")
    .map((part) => String(Number(part) || 0));
  while (parts.length < 3) parts.push("0");
  const result = parts.slice(0, 3).join(".");
  if (result === "0.0.0")
    fail(`cannot derive an npm version from "${version}"`);
  return result;
}

const version = toNpmVersion(options.version);
const source = path.resolve(options.dist);
const out = path.resolve(options.out);

fs.rmSync(out, { recursive: true, force: true });

function copy(from, to, mode) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  if (mode !== undefined) fs.chmodSync(to, mode);
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

const entries = [];

for (const [id, meta] of Object.entries(platforms)) {
  const from = path.join(source, `bin-${id}`);
  const target = path.join(out, SCOPE, `vlmcsd-${id}`);

  for (const program of PROGRAMS) {
    const file = [`${program}`, `${program}.exe`].find((name) =>
      fs.existsSync(path.join(from, name)),
    );
    if (!file)
      fail(`${path.relative(process.cwd(), from)} has no ${program} binary`);
    // Artifacts do not carry the executable bit, and npm publishes exactly
    // the modes it finds on disk.
    copy(path.join(from, file), path.join(target, "bin", file), 0o755);
  }

  writeJson(path.join(target, "package.json"), {
    name: `${SCOPE}/vlmcsd-${id}`,
    version,
    description: `vlmcsd, vlmcs and vlmcsdmulti binaries for ${id}`,
    license: "LGPL-2.1-or-later",
    homepage: "https://github.com/pkgship/vlmcsd#readme",
    repository: {
      type: "git",
      url: "git+https://github.com/pkgship/vlmcsd.git",
    },
    os: [meta.os],
    cpu: [meta.cpu],
    main: "index.js",
    files: ["bin", "index.js"],
  });

  fs.writeFileSync(
    path.join(target, "index.js"),
    "'use strict';\n\n// The directory holding this platform's binaries.\nmodule.exports = require('node:path').join(__dirname, 'bin');\n",
  );

  fs.writeFileSync(
    path.join(target, "README.md"),
    `# @pkgship/vlmcsd-${id}\n\n` +
      `The \`vlmcsd\`, \`vlmcs\` and \`vlmcsdmulti\` binaries for \`${id}\`, built by the\n` +
      "[vlmcsd](https://github.com/pkgship/vlmcsd) release workflow.\n\n" +
      "Install `@pkgship/vlmcsd` instead: it pulls in the right package for the\n" +
      "machine automatically.\n",
  );

  entries.push([`${SCOPE}/vlmcsd-${id}`, target]);
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(PACKAGE_DIR, "package.json"), "utf8"),
);

const expected = Object.keys(platforms)
  .map((id) => `${SCOPE}/vlmcsd-${id}`)
  .sort();
const declared = Object.keys(manifest.optionalDependencies || {}).sort();
if (expected.join() !== declared.join()) {
  fail(
    "npm/package.json optionalDependencies no longer match npm/lib/platforms.js",
  );
}

manifest.version = version;
for (const name of Object.keys(manifest.optionalDependencies)) {
  manifest.optionalDependencies[name] = version;
}

const root = path.join(out, SCOPE, "vlmcsd");
for (const file of SHIPPED)
  copy(path.join(PACKAGE_DIR, file), path.join(root, file));
copy(path.join(REPO_ROOT, "README.md"), path.join(root, "README.md"));
writeJson(path.join(root, "package.json"), manifest);
entries.push([manifest.name, root]);

fs.writeFileSync(
  path.join(out, ".packages"),
  `${entries
    .map(([name, dir]) =>
      [path.relative(out, dir).split(path.sep).join("/"), name, version].join(
        "\t",
      ),
    )
    .join("\n")}\n`,
);

console.log(
  `prepared ${entries.length} packages (${options.version} -> npm ${version}) in ${path.relative(process.cwd(), out)}`,
);
