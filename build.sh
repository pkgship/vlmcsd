#!/bin/sh
# Build Docker image for vlmcsd KMS server
set -e

IMAGE_NAME="vlmcsd"
TAG="latest"

# Try to get version from git tag
if command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then
    GIT_TAG=$(git describe --tags --always 2>/dev/null || true)
    if [ -n "$GIT_TAG" ]; then
        TAG="$GIT_TAG"
    fi
fi

echo "Building ${IMAGE_NAME}:${TAG} ..."
docker build -t "${IMAGE_NAME}:${TAG}" -t "${IMAGE_NAME}:latest" .

echo ""
echo "Done. Run with:"
echo "  docker run -d -p 1688:1688 --name vlmcsd ${IMAGE_NAME}:latest"
echo ""
echo "Test with:"
echo "  docker exec vlmcsd vlmcsd -V"