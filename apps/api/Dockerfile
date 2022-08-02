ARG PNPM_VERSION=7.3.0

FROM node:16-buster-slim as prod_base
RUN npm i pm2 -g
RUN npm --no-update-notifier --no-fund --global install pnpm@${PNPM_VERSION}

FROM nikolaik/python-nodejs:python3.10-nodejs16-slim as dev_base
WORKDIR /usr/src/app

RUN npm --no-update-notifier --no-fund --global install pnpm@${PNPM_VERSION}

# ------- DEV BUILD ----------
FROM dev_base AS dev
ARG PACKAGE_PATH

COPY ./meta .
RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store\
 pnpm install --filter "novuhq" --filter "{${PACKAGE_PATH}}..."\
 --frozen-lockfile\
 --unsafe-perm\
 | grep -v "cross-device link not permitted\|Falling back to copying packages from store"
 # ↑ Unfortunately using Docker's 'cache' mount type causes Docker to place the pnpm content-addressable store
 # on a different virtual drive, which prohibits pnpm from symlinking its content to its virtual store
 # (in node_modules/.pnpm), and that causes pnpm to fall back on copying the files.
 # And that's fine!, except pnpm emits many warnings of this, so here we filter those out.

COPY ./deps .
COPY ./pkg .

RUN NODE_ENV=production pnpm build:api

WORKDIR /usr/src/app/apps/api

RUN cp src/.example.env dist/src/.env
RUN cp src/.env.test dist/src/.env.test
RUN cp src/.env.development dist/src/.env.development
RUN cp src/.env.production dist/src/.env.production

WORKDIR /usr/src/app

# ------- ASSETS BUILD ----------
FROM dev AS assets

WORKDIR /usr/src/app

# Remove all dependencies so later we can only install prod dependencies without devDepen
RUN rm -rf node_modules && pnpm recursive exec -- rm -rf ./src ./node_modules

# ------- PRODUCTION BUILD ----------
FROM prod_base AS prod
ARG PACKAGE_PATH

ENV CI=true

COPY ./meta .

RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store\
 pnpm install --filter "{${PACKAGE_PATH}}..."\
     --frozen-lockfile\
     --unsafe-perm\
     --prod\
 | grep -v "cross-device link not permitted\|Falling back to copying packages from store"

# Get the build artifacts that only include dist folders
COPY --from=assets /usr/src/app /usr/src/app

WORKDIR /usr/src/app/apps/api

CMD [ "pm2-runtime", "dist/src/main.js" ]
