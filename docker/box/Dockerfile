# syntax=docker/dockerfile:1.7
#
# Novu Box base image: tools only, no Novu code. The Novu checkout, node_modules,
# builds and database files live under /data (a Cloudflare snapshot, or a named
# volume locally), so this image changes rarely and every snapshot can share it.
#
#   docker build -t novu-box docker/box
#   docker run --rm -v novu-box-data:/data -e GITHUB_TOKEN [-e BULL_MQ_PRO_NPM_TOKEN] novu-box bake
#   docker run --rm -v novu-box-data:/data -p 14200:4200 -p 13000:3000 -p 18887:8887 -p 4566:4566 -p 18025:8025 novu-box

FROM mongo:8.0.17@sha256:9814652e33f0cf8b9fddea8b46dfc9d8e19b130dcfdd7b510ca58bb0d40c8b71 AS mongo
FROM clickhouse/clickhouse-server:24.3@sha256:85b97f63dcfff47790d26bb5d5801637aaddb2b93e5e9aee27a686c2fb2b9916 AS clickhouse
FROM caddy:2.10@sha256:c3d7ee5d2b11f9dc54f947f68a734c84e9c9666c92c88a7f30b9cba5da182adb AS caddy
FROM versity/versitygw:v1.8.0@sha256:30292fc2eeacc67a36993b01f7a7a5e3361a19cced0e80c1d71cfa2a4b0a2499 AS s3
FROM redis:7.2-bookworm@sha256:46f15cf64fdef63e483dcda99e74e3d51c017b1175547b6bb874152ee2391aad AS redis
FROM axllent/mailpit:v1.27@sha256:e22dce5b36f93c77082e204a3942fb6b283b7896e057458400a4c88344c3df68 AS mailpit
FROM stripe/stripe-cli:v1.53.1@sha256:11c46caeead82e329f14823dd622d494b4cc8c1b9766f724d122d2af42c97540 AS stripe
FROM softwaremill/elasticmq-native:1.7.1@sha256:e4580ab9ad1bd5cd37b4ba04911bc5ccc8cd2d9ab4de56ece65acee71c24e05c AS sqs
FROM node:22.23.0-bookworm-slim@sha256:d9f850096136edbc402debdd8729579a288aac64574ada0ff4db26b6ae58b0b2 AS node

FROM ubuntu:24.04@sha256:534baea6a22c03a63003dbc8dbe78fe34bc0d7e595d9a9dc9834884ff530eb55

ARG TARGETARCH
ARG PROCESS_COMPOSE_VERSION=v1.122.0
ARG PROCESS_COMPOSE_SHA256_amd64=9b6dbc38324c0b0481f1cd1dd828ffdc78117129ec797678f4bf8c4023311281
ARG PROCESS_COMPOSE_SHA256_arm64=52fa7d5a2d5e0db470faec5976204fc215ed7e3d13689e930cf522becfb63778

ENV DEBIAN_FRONTEND=noninteractive

# build-essential and python3 are for native npm modules during `box bake`; libcurl4t64 is for mongod;
# openssl makes the Redis TLS certificates and provides the libssl that redis-server links against.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
      build-essential ca-certificates curl git libcurl4t64 openssl procps python3 tini

COPY --link --from=mongo /usr/bin/mongod /usr/local/bin/mongod
COPY --link --from=clickhouse /usr/bin/clickhouse /usr/local/bin/clickhouse
COPY --link --from=caddy /usr/bin/caddy /usr/local/bin/caddy
COPY --link --from=s3 /usr/local/bin/versitygw /usr/local/bin/versitygw
COPY --link --from=redis /usr/local/bin/redis-server /usr/local/bin/redis-cli /usr/local/bin/
COPY --link --from=mailpit /mailpit /usr/local/bin/mailpit
COPY --link --from=stripe /bin/stripe /usr/local/bin/stripe
COPY --link --from=sqs /opt/elasticmq/bin/elasticmq-native-server /usr/local/bin/elasticmq
COPY --link --from=node /usr/local/bin/node /usr/local/bin/node
COPY --link --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules

# pm2 runs the API and Worker the way the production images do (pm2-runtime, cluster mode).
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
 && ln -s ../lib/node_modules/corepack/dist/corepack.js /usr/local/bin/corepack \
 && corepack enable \
 && npm --no-update-notifier --no-fund --global install pm2@6.0.14 \
 && eval "expected=\$PROCESS_COMPOSE_SHA256_${TARGETARCH}" \
 && curl -fsSL -o /tmp/pc.tgz "https://github.com/F1bonacc1/process-compose/releases/download/${PROCESS_COMPOSE_VERSION}/process-compose_linux_${TARGETARCH}.tar.gz" \
 && echo "${expected}  /tmp/pc.tgz" | sha256sum -c - \
 && tar -xzf /tmp/pc.tgz -C /usr/local/bin process-compose \
 && rm /tmp/pc.tgz \
 && mongod --version >/dev/null && clickhouse --version >/dev/null && caddy version >/dev/null \
 && versitygw --version >/dev/null && process-compose version >/dev/null && node --version >/dev/null \
 && redis-server --version >/dev/null && mailpit version >/dev/null && pm2-runtime --version >/dev/null \
 && stripe version >/dev/null

# Everything that has to survive a snapshot lives under /data.
ENV COREPACK_HOME=/data/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NX_DAEMON=false \
    NX_NO_CLOUD=true \
    WRANGLER_SEND_METRICS=false \
    # `pnpm deploy --prod` marks the workspace prod-only, so pnpm would reinstall it without devDependencies
    # before every script. box.mjs runs `pnpm install` itself when the lockfile or a package.json changes.
    pnpm_config_verify_deps_before_run=false \
    BOX_HOME=/opt/box

COPY --link . /opt/box/

EXPOSE 3000 4200 4566 8025 8887
ENTRYPOINT ["tini", "--", "node", "/opt/box/box.mjs"]
CMD ["start"]
