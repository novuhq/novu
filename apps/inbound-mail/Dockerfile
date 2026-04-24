
FROM node:22.22.1-alpine3.22 as dev_base
RUN apk add g++ make py3-pip

ENV NX_DAEMON=false

RUN npm i pm2 -g
RUN npm --no-update-notifier --no-fund --global install pnpm@10.33.0
RUN pnpm --version

USER 1000
WORKDIR /usr/src/app

# ------- DEV BUILD ----------
FROM dev_base AS dev
ARG PACKAGE_PATH

COPY --chown=1000:1000 ./meta .
COPY --chown=1000:1000 ./deps .
COPY --chown=1000:1000 ./pkg .

RUN --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && \
    if [ -n "${BULL_MQ_PRO_NPM_TOKEN}" ] ; then echo 'Building with Enterprise Edition of Novu'; rm -f .npmrc ; cp .npmrc-cloud .npmrc ; fi

RUN --mount=type=cache,id=pnpm-store-inbound-mail,target=/root/.pnpm-store\
    --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && \
 pnpm install --reporter=silent --filter "novuhq" --filter "{${PACKAGE_PATH}}..."\
 --frozen-lockfile\
 --unsafe-perm\
 --reporter=silent

RUN --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && NODE_ENV=production pnpm build:inbound-mail

WORKDIR /usr/src/app/apps/inbound-mail

RUN cp src/dotenvcreate.mjs dist/dotenvcreate.mjs
RUN cp src/.env.development dist/src/.env.development
RUN cp src/.env.production dist/src/.env.production

RUN cp -r src/python dist/python

WORKDIR /usr/src/app

# ------- ASSETS BUILD ----------
FROM dev AS assets

WORKDIR /usr/src/app

# Remove all dependencies so later we can only install prod dependencies without devDependencies
RUN rm -rf node_modules && pnpm recursive exec -- rm -rf ./src ./node_modules

# ------- PRODUCTION BUILD ----------
FROM dev_base AS prod
ARG PACKAGE_PATH

ENV CI=true

# Allow the non-root USER 1000 to bind to privileged ports (SMTP :25).
# NET_BIND_SERVICE is in Fargate's default container capability set, so the
# kernel honors this file capability on exec without any linuxParameters changes.
USER root
RUN apk add --no-cache libcap && \
    setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(which node)")"
USER 1000

WORKDIR /usr/src/app

COPY --chown=1000:1000 ./meta .

# Get the build artifacts that only include dist folders
COPY --chown=1000:1000 --from=assets /usr/src/app .

RUN --mount=type=cache,id=pnpm-store-inbound-mail,target=/root/.pnpm-store\
    --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && \
 pnpm install --reporter=silent --filter "{${PACKAGE_PATH}}..."\
 --frozen-lockfile\
 --unsafe-perm\
 --reporter=silent

WORKDIR /usr/src/app/apps/inbound-mail
ENTRYPOINT [ "sh", "-c", "node dist/dotenvcreate.mjs -s=$SECRET_NAME -r=$NOVU_REGION -e=$NOVU_ENTERPRISE -v=$NODE_ENV && pm2-runtime start dist/src/main.js" ]
