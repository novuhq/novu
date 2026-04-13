FROM node:22.22-alpine3.23 AS dev_base
RUN apk add --no-cache g++ make py3-pip
ENV NX_DAEMON=false

# Install global dependencies
RUN npm --no-update-notifier --no-fund --global install pm2 pnpm@10.33.0&& \
    pnpm --version

# Set non-root user
USER 1000
WORKDIR /usr/src/app

FROM dev_base AS dev
ARG PACKAGE_PATH

COPY --chown=1000:1000 ./meta .
COPY --chown=1000:1000 ./deps .
COPY --chown=1000:1000 ./pkg .

RUN --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && \
    if [ -n "${BULL_MQ_PRO_NPM_TOKEN}" ] ; then echo 'Building with Enterprise Edition of Novu'; rm -f .npmrc ; cp .npmrc-cloud .npmrc ; fi

RUN --mount=type=cache,id=pnpm-store-api,target=/root/.pnpm-store\
    --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && \
 pnpm install --filter "novuhq" --filter "{${PACKAGE_PATH}}..."\
 --frozen-lockfile\
 --unsafe-perm

RUN --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && NODE_ENV=production NX_DAEMON=false pnpm build:api

WORKDIR /usr/src/app/apps/api

RUN cp src/dotenvcreate.mjs dist/dotenvcreate.mjs
RUN cp src/.example.env dist/.env
RUN cp src/.env.development dist/.env.development
RUN cp src/.env.production dist/.env.production

WORKDIR /usr/src/app

# ------- ASSETS BUILD ----------
FROM dev AS assets

WORKDIR /usr/src/app

# Remove source files but KEEP node_modules (already compiled)
RUN pnpm recursive exec -- rm -rf ./src

# ------- PRODUCTION BUILD ----------
FROM node:22.22-alpine3.23 AS prod

ARG PACKAGE_PATH

ENV CI=true
ENV NX_DAEMON=false

RUN apk upgrade --no-cache && \
    # Manually upgrade packages from edge/main to patch CVEs
    # until fixes are backported to the alpine3.23 stable repo
    apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/edge/main --upgrade libcrypto3 libssl3 musl musl-utils && \
    npm --no-update-notifier --no-fund --global install pm2 pnpm@10.33.0 && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
           /usr/local/lib/node_modules/pnpm /usr/local/bin/pnpm /usr/local/bin/pnpx

# Set non-root user
USER 1000
WORKDIR /usr/src/app

COPY --chown=1000:1000 ./meta .

# Copy build artifacts AND pre-compiled node_modules from assets
COPY --chown=1000:1000 --from=assets /usr/src/app .


ENV NEW_RELIC_NO_CONFIG_FILE=true

WORKDIR /usr/src/app/apps/api
ENTRYPOINT [ "sh", "-c", "node dist/dotenvcreate.mjs -s=$SECRET_NAME -r=$NOVU_REGION -e=$NOVU_ENTERPRISE -v=$NODE_ENV -h=$IS_SELF_HOSTED && pm2-runtime start dist/main.js -i max" ]
