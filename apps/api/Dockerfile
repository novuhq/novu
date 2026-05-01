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
RUN rm -f dist/.env.test dist/.env.ci

WORKDIR /usr/src/app

# ------- DEPLOY ----------
FROM dev AS deploy

WORKDIR /usr/src/app
RUN --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && \
    pnpm --filter @novu/api-service deploy --legacy --prod /usr/src/deploy && \
    if [ -n "${BULL_MQ_PRO_NPM_TOKEN}" ]; then \
      cd $(mktemp -d) && \
      echo "@taskforcesh:registry=https://npm.taskforce.sh/" > .npmrc && \
      echo "//npm.taskforce.sh/:_authToken=${BULL_MQ_PRO_NPM_TOKEN}" >> .npmrc && \
      npm init -y > /dev/null 2>&1 && \
      npm install @taskforcesh/bullmq-pro@6.11.0 2>/dev/null && \
      cp -r node_modules/@taskforcesh /usr/src/deploy/node_modules/@taskforcesh && \
      rm -rf node_modules/@taskforcesh && \
      mv node_modules /usr/src/deploy/node_modules/@taskforcesh/bullmq-pro/node_modules; \
    fi

# ------- PRODUCTION BUILD ----------
FROM node:22.22-alpine3.23 AS prod

ENV CI=true

RUN apk upgrade --no-cache && \
    apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/edge/main --upgrade libcrypto3 libssl3 musl musl-utils && \
    npm --no-update-notifier --no-fund --global install pm2 && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Set non-root user
USER 1000
WORKDIR /usr/src/app

# Flat node_modules from pnpm deploy (no symlinks, no hoisting issues)
COPY --chown=1000:1000 --from=deploy /usr/src/deploy .

# Built output (not included by pnpm deploy because dist is gitignored)
COPY --chown=1000:1000 --from=dev /usr/src/app/apps/api/dist ./dist

# The NestJS swagger plugin generates dist/metadata.js with hardcoded
# monorepo-relative paths (e.g. ../../../packages/shared/dist/...).
# These break in the flat pnpm-deploy layout. Rewrite them so they
# resolve against node_modules instead.
RUN if [ -f dist/metadata.js ]; then \
      sed -i \
        -e 's|../../../packages/shared/dist|../node_modules/@novu/shared/dist|g' \
        -e 's|../../../libs/application-generic/build|../node_modules/@novu/application-generic/build|g' \
        -e 's|../../../libs/dal/dist|../node_modules/@novu/dal/dist|g' \
        dist/metadata.js; \
    fi

ENV NEW_RELIC_NO_CONFIG_FILE=true

ENTRYPOINT [ "sh", "-c", "node dist/dotenvcreate.mjs -s=$SECRET_NAME -r=$NOVU_REGION -e=$NOVU_ENTERPRISE -v=$NODE_ENV -h=$IS_SELF_HOSTED && pm2-runtime start dist/main.js -i max" ]
