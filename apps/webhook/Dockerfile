FROM node:20-alpine3.19 as dev_base
RUN apk add g++ make py3-pip
ENV NX_DAEMON=false

RUN npm i pm2 -g
RUN npm --no-update-notifier --no-fund --global install pnpm@8.9.0
RUN pnpm --version

USER 1000
WORKDIR /usr/src/app

# ------- DEV BUILD ----------
FROM dev_base AS dev
ARG PACKAGE_PATH


COPY --chown=1000:1000 ./meta .
COPY --chown=1000:1000 ./deps .
COPY --chown=1000:1000 ./pkg .

RUN --mount=type=cache,id=pnpm-store-webhook,target=/root/.pnpm-store\
 pnpm install --reporter=silent --filter "novuhq" --filter "{${PACKAGE_PATH}}..."\
 --frozen-lockfile\
 --unsafe-perm\
 --reporter=silent

RUN NODE_ENV=production pnpm build:webhook

WORKDIR /usr/src/app/apps/webhook

RUN cp src/.example.env dist/src/.env
RUN cp src/.env.test dist/src/.env.test
RUN cp src/.env.development dist/src/.env.development
RUN cp src/.env.production dist/src/.env.production

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

WORKDIR /usr/src/app

COPY --chown=1000:1000 ./meta .

# Get the build artifacts that only include dist folders
COPY --chown=1000:1000 --from=assets /usr/src/app .

RUN --mount=type=cache,id=pnpm-store-webhook,target=/root/.pnpm-store\
 pnpm install --reporter=silent --filter "{${PACKAGE_PATH}}..."\
 --frozen-lockfile\
 --unsafe-perm\
 --reporter=silent

WORKDIR /usr/src/app/apps/webhook
CMD [ "pm2-runtime", "dist/main.js" ]
