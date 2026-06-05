# vlmcsd

Fully Microsoft compatible KMS Key Management Service server emulator. Supports KMS protocol versions 4, 5 and 6, and activates Windows and Office products using a local KMS server.

> This is not meant for use with pirated software. It helps owners of legal copies use their software without restrictions.

## Builds

- `vlmcsd` -- KMS server daemon
- `vlmcs` -- KMS client/testing tool
- `vlmcsdmulti` -- multi-call binary (server or client depending on invocation)

## Docker

```sh
docker build -t vlmcsd .
docker run -d -p 1688:1688 --name vlmcsd vlmcsd
```

Test:

```sh
docker exec vlmcsd vlmcsd -V
```

## Build from Source

Requires only a C compiler (gcc or clang). No external libraries needed.

```sh
make
# or just the server:
make vlmcsd
```

Options: `make CC=clang`, `make THREADS=1`, `make CRYPTO=openssl`

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