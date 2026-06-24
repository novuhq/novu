# How to build Novu container images locally

## Novu API

Prepare the build kit 
```
docker buildx create \
  --name amd64builder \
  --driver docker-container \
  --driver-opt network=host \
  --use
amd64builder
```

Start the build-kit container
```
docker buildx inspect --bootstrap
```

Build container image
```
DOCKER_BUILD_ARGUMENTS="--platform linux/amd64 -t hubfinance-novu-api:3.17.0" pnpm --filter @novu/api-service docker:build
```
# How to run Novu Docker-compose stack locally

```
cd docker/community
cp .env.example .env
```
Then update these secrets in your local `.env` file

```
JWT_SECRET=
STORE_ENCRYPTION_KEY=
NOVU_SECRET_KEY=
```

Update the container image tag version if necessary in `docker-compose.yaml` file

Then start the docker compose stack

```
docker compose up -d
```
