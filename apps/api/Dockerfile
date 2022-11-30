FROM nikolaik/python-nodejs:python3.10-nodejs16-alpine as dev_base

RUN npm i pm2 -g
RUN npm --no-update-notifier --no-fund --global install pnpm@7.5.0
RUN pnpm --version

WORKDIR /usr/src/app

# ------- DEV BUILD ----------
FROM dev_base AS dev
ARG PACKAGE_PATH

COPY ./meta .
COPY ./deps .
COPY ./pkg .

RUN --mount=type=cache,id=pnpm-store-api,target=/root/.pnpm-store\
 pnpm install --filter "novuhq" --filter "{${PACKAGE_PATH}}..."\
 --frozen-lockfile\
 --unsafe-perm\
 --reporter=silent

RUN NODE_ENV=production NX_DAEMON=false pnpm build:api

WORKDIR /usr/src/app/apps/api

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

COPY ./meta .

# Get the build artifacts that only include dist folders
COPY --from=assets /usr/src/app .

RUN --mount=type=cache,id=pnpm-store-api,target=/root/.pnpm-store\
 pnpm install --filter "{${PACKAGE_PATH}}..." \
 --frozen-lockfile \
 --unsafe-perm \
 --reporter=silent

WORKDIR /usr/src/app/apps/api
CMD [ "pm2-runtime","start", "dist/main.js" ]
