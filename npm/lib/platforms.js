"use strict";

// The platforms vlmcsd binaries are published for.
//
// The key is used as the npm package suffix (`@pkgship/vlmcsd-<key>`) and as
// the CI artifact suffix (`bin-<key>`). `os` and `cpu` are Node's
// process.platform/process.arch values, which is what npm matches against when
// it decides whether to install an optional dependency.
module.exports = {
  "linux-amd64": { os: "linux", cpu: "x64" },
  "linux-arm64": { os: "linux", cpu: "arm64" },
  "linux-arm": { os: "linux", cpu: "arm" },
  "linux-386": { os: "linux", cpu: "ia32" },
  "darwin-amd64": { os: "darwin", cpu: "x64" },
  "darwin-arm64": { os: "darwin", cpu: "arm64" },
  "windows-amd64": { os: "win32", cpu: "x64" },
  "windows-arm64": { os: "win32", cpu: "arm64" },
  "freebsd-amd64": { os: "freebsd", cpu: "x64" },
};
