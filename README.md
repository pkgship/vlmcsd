# vlmcsd

Fully Microsoft compatible KMS Key Management Service server emulator. Supports KMS protocol versions 4, 5 and 6, and activates Windows and Office products using a local KMS server.

> This is not meant for use with pirated software. It helps owners of legal copies use their software without restrictions.

## Builds

- `vlmcsd` -- KMS server daemon
- `vlmcs` -- KMS client/testing tool
- `vlmcsdmulti` -- multi-call binary (server or client depending on invocation)

## Versioning

`debian/changelog` holds the version used by local builds and by builds that are
not triggered by a tag (`1113`). For a release the git tag is authoritative:
pushing a `v*` tag makes CI prepend a changelog entry for that version before
building, so the `.deb` and the container image are both versioned from the tag.
Tagging `v2020.03.28` therefore publishes `2020.03.28` everywhere. npm is the
one exception: it insists on a strict `x.y.z`, so the tag is normalised for the
npm packages only (`v1113` becomes `1113.0.0`, `v2020.03.28` becomes
`2020.3.28`).

## Docker

```sh
./build.sh
docker run -d -p 1688:1688 --name vlmcsd vlmcsd:latest
```

The image is tagged both `<version>` and `latest`. The base image is pinned to
the current Alpine stable release, so builds are reproducible; override it with
`--build-arg ALPINE_VERSION=<version>`.

Test:

```sh
docker exec vlmcsd vlmcsd -V
```

## Debian and Ubuntu packages

Standard Debian packaging lives in `debian/`. Build a package for the
distribution you are running with:

```sh
apt-get install build-essential debhelper
dpkg-buildpackage -us -uc -b
```

The `.deb` is written to the parent directory, for example
`vlmcsd_1113_amd64.deb`. It contains `vlmcsd`, `vlmcs`, `vlmcsdmulti`, their
manual pages, the configuration in `/etc/vlmcsd` and a systemd service that is
enabled on installation.

Releases are built once per architecture (`amd64`, `arm64`) on Debian 12.
Nothing outside libc is linked, so that single build also installs on Debian 13
and Ubuntu 24.04/26.04; the required glibc version is recorded automatically in
the package's dependency list.

## Prebuilt binaries

Every `v*` tag also builds `vlmcsd`, `vlmcs`, and `vlmcsdmulti` as standalone
binaries:

| Platform                                               | Toolchain             | Notes                                                     |
| ------------------------------------------------------ | --------------------- | --------------------------------------------------------- |
| `linux-amd64`, `linux-arm64`, `linux-arm`, `linux-386` | Alpine (musl)         | statically linked, no libc or dynamic loader to depend on |
| `darwin-amd64`, `darwin-arm64`                         | macOS runners         | deployment target macOS 11                                |
| `windows-amd64`, `windows-arm64`                       | mingw-w64, llvm-mingw | statically linked `.exe`                                  |
| `freebsd-amd64`                                        | FreeBSD 14            |                                                           |

These names are also the npm package suffixes, so `linux-amd64` is published as
`@pkgship/vlmcsd-linux-amd64`.

`vlmcsd-<version>-<platform>.tar.gz` (`.zip` on Windows) is attached to the
[releases page](https://github.com/pkgship/vlmcsd/releases). The same binaries
are what the npm packages below ship.

## npm

```sh
npm install -g @pkgship/vlmcsd
vlmcsd -D -e
```

`@pkgship/vlmcsd` provides `vlmcsd`, `vlmcs`, and `vlmcsdmulti`. It contains no
binaries itself: it depends on one `@pkgship/vlmcsd-<platform>` package per
platform as an _optional_ dependency, so npm downloads only the one matching
the machine. The shims simply exec the matching binary and pass argv, stdio and
the exit status through.

Publishing runs on tag pushes and authenticates through npm's trusted
publishing (OIDC), so no long-lived token is stored in the repository. npm only
lets you register a trusted publisher for a package that already exists, and
the workflow publishes ten of them, so the names are created once with
placeholders:

```sh
npm login          # the account needs two-factor authentication enabled
node npm/scripts/bootstrap.js --repository pkgship/vlmcsd
```

That publishes `0.0.0` for every package and registers this repository's
`build.yml` workflow as the trusted publisher for each one. It is safe to
re-run: packages that already exist, and trust relationships that are already
in place, are skipped.

## Build from Source

Requires only a C compiler (gcc or clang). No external libraries needed.

```sh
make
# or just the server:
make vlmcsd
```

Options: `make CC=clang`, `make THREADS=1`, `make CRYPTO=openssl`, `make VLMCSD_VERSION=<version>`

## Usage

```sh
vlmcsd -d &              # daemon mode (background)
vlmcsd -D                # foreground, for containers
vlmcsd -l 0.0.0.0:1688   # listen on a specific address
vlmcsd -c /etc/vlmcsd.ini   # use a config file
```

See `man vlmcsd.8` for full details.

## License

This project is based on [vlmcsd by Hotbird64](https://github.com/Wind4/vlmcsd).
