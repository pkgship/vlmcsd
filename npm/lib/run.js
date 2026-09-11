"use strict";

// Thin wrapper. The real programs are native binaries shipped by the
// per-platform optional dependency; this only picks the right one and hands
// over argv, stdio and the exit status.

const path = require("node:path");
const { spawn } = require("node:child_process");

const platforms = require("./platforms.js");

const PACKAGES = {};
for (const [id, meta] of Object.entries(platforms)) {
  PACKAGES[`${meta.os}-${meta.cpu}`] = `@pkgship/vlmcsd-${id}`;
}

module.exports = function run(program) {
  const platform = `${process.platform}-${process.arch}`;
  const packageName = PACKAGES[platform];

  if (!packageName) {
    console.error(`vlmcsd: no prebuilt binary for ${platform}`);
    process.exit(1);
  }

  let binDir;
  try {
    binDir = require(packageName);
  } catch {
    console.error(
      `vlmcsd: the optional dependency ${packageName} is not installed.\n` +
        "Reinstall without --omit=optional, for example `npm install vlmcsd`.",
    );
    process.exit(1);
  }

  const file = path.join(
    binDir,
    process.platform === "win32" ? `${program}.exe` : program,
  );

  // A missing or non-executable binary is reported as a plain message. Where
  // that surfaces depends on the platform: some spawn failures throw, others
  // arrive as an 'error' event.
  const fail = (error) => {
    console.error(`vlmcsd: cannot run ${file}: ${error.message}`);
    process.exit(1);
  };

  let child;
  try {
    child = spawn(file, process.argv.slice(2), { stdio: "inherit" });
  } catch (error) {
    fail(error);
  }
  child.on("error", fail);

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code === null ? 0 : code);
    }
  });
};
