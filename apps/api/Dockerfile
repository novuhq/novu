FROM node:20-alpine3.19 as dev_base
RUN apk add g++ make py3-pip

ENV NX_DAEMON=false \
    NODE_ENV=production

RUN npm --no-update-notifier --no-fund --global install pnpm@8.9.0

USER 1000
WORKDIR /usr/src/app

# ------- DEV BUILD ----------
FROM dev_base AS dev
ARG PACKAGE_PATH

COPY --chown=1000:1000 ./meta ./deps ./pkg ./

RUN --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && \
    if [ -n "${BULL_MQ_PRO_NPM_TOKEN}" ] ; then echo 'Building with Enterprise Edition of Novu'; rm -f .npmrc ; cp .npmrc-cloud .npmrc ; fi

RUN --mount=type=cache,id=pnpm-store-api,target=/root/.pnpm-store\
    --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && \
 pnpm install --filter "novuhq" --filter "{${PACKAGE_PATH}}..."\
 --frozen-lockfile\
 --unsafe-perm

RUN --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && NODE_ENV=production NX_DAEMON=false pnpm build:api

WORKDIR /usr/src/app/apps/api

RUN <<EOF
cp src/.env.production dist/src/.env.production
EOF

WORKDIR /usr/src/app

# ------- ASSETS BUILD ----------
FROM dev AS assets

WORKDIR /usr/src/app

# Remove all dependencies so later we can only install prod dependencies without devDependencies
RUN rm -rf node_modules && pnpm recursive exec -- rm -rf ./src ./node_modules

# ------- PRODUCTION BUILD ----------
FROM dev_base AS prod

ARG PACKAGE_PATH

ENV CI=true \
    NODE_ENV=production \
    NEW_RELIC_NO_CONFIG_FILE=true

WORKDIR /usr/src/app

COPY --chown=1000:1000 ./meta .

# Get the build artifacts that only include dist folders
COPY --chown=1000:1000 --from=assets /usr/src/app .

RUN --mount=type=cache,id=pnpm-store-api,target=/root/.pnpm-store\
    --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && \
 pnpm install --filter "{${PACKAGE_PATH}}..." \
 --frozen-lockfile \
 --unsafe-perm

WORKDIR /usr/src/app/apps/api
CMD [ "dump-init", "node", "dist/main.js" ]
