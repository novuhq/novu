FROM nikolaik/python-nodejs:python3.10-nodejs16-alpine as dev_base

ARG BULL_MQ_PRO_TOKEN
ENV BULL_MQ_PRO_NPM_TOKEN=$BULL_MQ_PRO_TOKEN
ENV NX_DAEMON=false

RUN npm i pm2 -g
RUN npm --no-update-notifier --no-fund --global install pnpm@8.9.0
RUN pnpm --version


WORKDIR /usr/src/app

# ------- DEV BUILD ----------
FROM dev_base AS dev
ARG PACKAGE_PATH

COPY ./meta .
COPY ./deps .
COPY ./pkg .

RUN if [ -n '${BULL_MQ_PRO_NPM_TOKEN}' ] ; then echo 'Building with Enterprise Edition of Novu' ; fi
RUN if [ -n '${BULL_MQ_PRO_NPM_TOKEN}' ]; then rm -f .npmrc ; fi
RUN if [ -n '${BULL_MQ_PRO_NPM_TOKEN}' ]; then cp .npmrc-cloud .npmrc; fi

RUN --mount=type=cache,id=pnpm-store-inbound-mail,target=/root/.pnpm-store\
 pnpm install --reporter=silent --filter "novuhq" --filter "{${PACKAGE_PATH}}..."\
 --frozen-lockfile\
 --unsafe-perm\
 --reporter=silent

RUN NODE_ENV=production pnpm build:inbound-mail

WORKDIR /usr/src/app/apps/inbound-mail

RUN cp src/.env.test dist/src/.env.test
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

WORKDIR /usr/src/app

RUN chown -R 1000:root .

COPY ./meta .

# Get the build artifacts that only include dist folders
COPY --from=assets /usr/src/app .

RUN --mount=type=cache,id=pnpm-store-inbound-mail,target=/root/.pnpm-store\
 pnpm install --reporter=silent --filter "{${PACKAGE_PATH}}..."\
 --frozen-lockfile\
 --unsafe-perm\
 --reporter=silent

RUN chown -R 1000:root .

WORKDIR /usr/src/app/apps/inbound-mail
CMD [ "pm2-runtime", "dist/src/main.js" ]
