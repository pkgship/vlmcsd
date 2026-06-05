# Multi-stage build for vlmcsd KMS server
# Stage 1: Build from source on Alpine
FROM alpine:latest AS builder

RUN apk add --no-cache gcc make musl-dev

WORKDIR /build
COPY src/ src/
COPY GNUmakefile Makefile ./
COPY etc/vlmcsd.kmd etc/vlmcsd.kmd

# Build server only, internal crypto (no external deps)
RUN make vlmcsd CRYPTO=internal FEATURES=full

# Stage 2: Minimal runtime image
FROM alpine:latest

RUN adduser -D -h /app vlmcsd

COPY --from=builder /build/bin/vlmcsd /usr/local/bin/vlmcsd
COPY --from=builder /build/etc/vlmcsd.kmd /etc/vlmcsd/vlmcsd.kmd

USER vlmcsd
EXPOSE 1688

# -D = foreground (don't daemonize), -e = log to stderr
CMD ["vlmcsd", "-D", "-e"]
