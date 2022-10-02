FROM nikolaik/python-nodejs:python3.10-nodejs16-slim as dev_base

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

RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store\
 pnpm install --filter "novuhq" --filter "{${PACKAGE_PATH}}..."\
 --frozen-lockfile\
 --unsafe-perm\
 | grep -v "cross-device link not permitted\|Falling back to copying packages from store"
 # ↑ Unfortunately using Docker's 'cache' mount type causes Docker to place the pnpm content-addressable store
 # on a different virtual drive, which prohibits pnpm from symlinking its content to its virtual store
 # (in node_modules/.pnpm), and that causes pnpm to fall back on copying the files.
 # And that's fine!, except pnpm emits many warnings of this, so here we filter those out.


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

# Remove all dependencies so later we can only install prod dependencies without devDepen
RUN rm -rf node_modules && pnpm recursive exec -- rm -rf ./src ./node_modules

# ------- PRODUCTION BUILD ----------
FROM dev_base AS prod
ARG PACKAGE_PATH

ENV CI=true

WORKDIR /usr/src/app

COPY ./meta .

# Get the build artifacts that only include dist folders
COPY --from=assets /usr/src/app .

RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store\
 pnpm install --filter "{${PACKAGE_PATH}}..."\
     --frozen-lockfile\
     --unsafe-perm\
 | grep -v "cross-device link not permitted\|Falling back to copying packages from store"

WORKDIR /usr/src/app/apps/webhook
CMD [ "pm2-runtime", "dist/src/main.js" ]
