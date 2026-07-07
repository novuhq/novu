Docker is the easiest way to get started with self-hosted Novu.
For production-style self-hosting, see [Deploy with Docker](/community/self-hosting-novu/deploy-with-docker).
For Kubernetes deployments, see [Helm](kubernetes/helm/Readme.md) or [Kustomize](kubernetes/helm/Readme.md).

The `docker/local/` compose file is for **local development dependencies only** — it does not start the Novu API, Worker, WebSocket, or Dashboard services.

## Before you begin

You need the following installed in your system:

- [Docker](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Git](https://git-scm.com/downloads)
- Node.js v22.22.1 and pnpm 11.x (to run Novu application services from source)

## Quick Start (local development)

### 1. Start dependency services

From the repo root:

```sh
docker compose -f docker/local/docker-compose.yml up -d
```

This starts MongoDB, Redis, and LocalStack.

### 2. Install and run Novu from source

Follow the [Run Novu in local machine](https://docs.novu.co/community/run-in-local-machine) guide:

```sh
npm run setup:project
pnpm dev:portless
```

The Dashboard dev server runs at [http://127.0.0.1:4201](http://127.0.0.1:4201) by default.

### Managing services

#### Running all dependency services

```sh
docker compose -f docker/local/docker-compose.yml up -d
```

#### Running specific services

If you only need specific services (for example, to avoid port conflicts):

```sh
docker compose -f docker/local/docker-compose.yml up -d redis
```

### Securing your setup

While we provide example secrets for getting started, you should NEVER deploy your Novu setup using the defaults provided.

### Update Secrets

Update the `.env` files under `apps/` with your own secrets. In particular, these are required:

- `JWT_SECRET`: used by the API to generate JWT keys
- `STORE_ENCRYPTION_KEY`: used to encrypt/decrypt provider credentials (32 characters)

### Redis config

Redis TLS can be configured by adding the following variables to the `.env` file:

- `REDIS_TLS={"servername":"localhost"}`
- `REDIS_CACHE_SERVICE_TLS={"servername":"localhost"}`

## Configuration

To keep the setup simple, we made some choices that may not be optimal for production:

- the database is on the same machine as the servers
- the storage uses LocalStack or the filesystem backend instead of S3

We strongly recommend that you decouple your database before deploying.

## Next steps

- Full local development guide: [docs.novu.co/community/run-in-local-machine](https://docs.novu.co/community/run-in-local-machine)
- Self-hosted Docker deployment: [docs.novu.co/community/self-hosting-novu/deploy-with-docker](https://docs.novu.co/community/self-hosting-novu/deploy-with-docker)
- Got a question? [Ask here](https://discord.gg/novu).
