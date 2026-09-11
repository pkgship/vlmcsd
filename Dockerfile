# syntax=docker/dockerfile:1

# Pinned to the current Alpine stable release so that builds are reproducible.
# Bump deliberately: --build-arg ALPINE_VERSION=3.25
ARG ALPINE_VERSION=3.24

# ---------------------------------------------------------------------------
# Stage 1: build from source
# ---------------------------------------------------------------------------
FROM alpine:${ALPINE_VERSION} AS builder

# Version of record is debian/changelog; keep this default in sync with it so a
# plain `docker build` still reports a real version. CI overrides it.
ARG VLMCSD_VERSION=1113

RUN apk add --no-cache build-base

WORKDIR /build

COPY GNUmakefile Makefile ./
COPY src/ src/
COPY etc/vlmcsd.kmd etc/vlmcsd.kmd

# CRYPTO=internal keeps the image free of external crypto libraries.
RUN make vlmcsd CRYPTO=internal FEATURES=full VLMCSD_VERSION="${VLMCSD_VERSION}"

# ---------------------------------------------------------------------------
# Stage 2: runtime
# ---------------------------------------------------------------------------
FROM alpine:${ALPINE_VERSION}

ARG VLMCSD_VERSION=1113

LABEL org.opencontainers.image.title="vlmcsd" \
      org.opencontainers.image.description="Microsoft-compatible KMS server emulator" \
      org.opencontainers.image.version="${VLMCSD_VERSION}" \
      org.opencontainers.image.url="https://github.com/pkgship/vlmcsd" \
      org.opencontainers.image.source="https://github.com/pkgship/vlmcsd" \
      org.opencontainers.image.licenses="LGPL-2.1-or-later"

RUN addgroup -S vlmcsd \
 && adduser -S -D -H -G vlmcsd -s /sbin/nologin vlmcsd \
 && mkdir -p /etc/vlmcsd

COPY --from=builder /build/bin/vlmcsd /usr/local/bin/vlmcsd
COPY --from=builder /build/etc/vlmcsd.kmd /etc/vlmcsd/vlmcsd.kmd

USER vlmcsd
EXPOSE 1688/tcp

# -D: stay in the foreground, -e: log to stderr (container friendly)
ENTRYPOINT ["vlmcsd"]
CMD ["-D", "-e"]
