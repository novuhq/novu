# Mock Server

A generated HTTP mock server based on your OpenAPI Specification (OAS). Use this mock server for integration and contract testing.

## Usage

The server can be built and started via the [Go programming language toolchain](https://go.dev/) or [Docker](https://www.docker.com/).

If you have Go installed, start the server directly via:

```shell
go run .
```

Otherwise, if you have Docker installed, build and run the server via:

```shell
docker build -t mockserver .
docker run -i -p 18080:18080 -t --rm mockserver
```

By default, the server runs on port `18080`.

### Server Paths

The server contains generated paths from the OAS and the following additional built-in paths.

| Path | Description |
|---|---|
| [`/_mockserver/health`](https://localhost:18080/_mockserver/health) | verify server is running |
| [`/_mockserver/log`](https://localhost:18080/_mockserver/log) | view per-OAS-operation logs |

Any request outside the generated and built-in paths will return a `404 Not Found` response.

### Server Customization

The server supports the following flags for customization.

| Flag | Default | Description |
|---|---|---|
| `-address` | `:18080` | server listen address |
| `-log-format` | `text` | logging format (supported: `JSON`, `text`) |
| `-log-level` | `INFO` | logging level (supported: `DEBUG`, `INFO`, `WARN`, `ERROR`) |

For example, enabling server debug logging:

```shell
# via `go run`
go run . -log-level=DEBUG
# via `docker run`
docker run -i -p 18080:18080 -t --rm mockserver -log-level=DEBUG
```
