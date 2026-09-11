#!/bin/sh
# Build the vlmcsd container image for the local architecture.
#
# Usage: [VERSION=<version>] [IMAGE=<name>] ./build.sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
IMAGE=${IMAGE:-vlmcsd}

# debian/changelog holds the version of record (keep the Dockerfile ARG in sync).
VERSION=${VERSION:-$(sed -n '1s/^[^(]*(\([^)]*\)).*/\1/p' "$ROOT/debian/changelog")}

if [ -z "$VERSION" ]; then
	echo "error: cannot read a version from debian/changelog" >&2
	exit 1
fi

docker build \
	--build-arg "VLMCSD_VERSION=$VERSION" \
	--tag "$IMAGE:$VERSION" \
	--tag "$IMAGE:latest" \
	"$ROOT"

printf '\nBuilt %s:%s (also tagged %s:latest)\n' "$IMAGE" "$VERSION" "$IMAGE"
printf 'Run with: docker run -d -p 1688:1688 --name vlmcsd %s:latest\n' "$IMAGE"
