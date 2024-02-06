FROM node:20-alpine3.19

ENV NX_DAEMON=false

RUN npm install -g pnpm@8.9.0 --loglevel notice
RUN npm i pm2 -g
RUN apk --no-cache add g++ make py3-pip

USER 1000
WORKDIR /usr/src/app

COPY --chown=1000:1000 .npmrc .
COPY --chown=1000:1000 .npmrc-cloud .

COPY --chown=1000:1000 package.json .

COPY --chown=1000:1000 providers ./providers
COPY --chown=1000:1000 apps/ws ./apps/ws
COPY --chown=1000:1000 libs/dal ./libs/dal
COPY --chown=1000:1000 libs/shared ./libs/shared
COPY --chown=1000:1000 libs/testing ./libs/testing
COPY --chown=1000:1000 packages/client ./packages/client
COPY --chown=1000:1000 packages/stateless ./packages/stateless
COPY --chown=1000:1000 packages/node ./packages/node
COPY --chown=1000:1000 packages/application-generic ./packages/application-generic

COPY --chown=1000:1000 ["tsconfig.json","tsconfig.base.json","nx.json","pnpm-workspace.yaml","pnpm-lock.yaml", ".npmrc", "./"]

RUN --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && \
    if [ -n "${BULL_MQ_PRO_NPM_TOKEN}" ] ; then echo 'Building with Enterprise Edition of Novu'; rm -f .npmrc ; cp .npmrc-cloud .npmrc ; fi

RUN --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && \
    pnpm install --verbose && \
    pnpm build:ws

RUN --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && \
    if $BULL_MQ_PRO_NPM_TOKEN ; then rm -f .npmrc ; fi

WORKDIR /usr/src/app/apps/ws

RUN cp src/.example.env dist/src/.env
RUN cp src/.env.test dist/src/.env.test
RUN cp src/.env.development dist/src/.env.development
RUN cp src/.env.production dist/src/.env.production

CMD [ "pm2-runtime", "dist/src/main.js" ]
