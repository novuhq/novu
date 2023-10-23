FROM node:16-alpine3.16

ARG BULL_MQ_PRO_TOKEN
ENV BULL_MQ_PRO_NPM_TOKEN=$BULL_MQ_PRO_TOKEN
ENV NX_DAEMON=false

WORKDIR /usr/src/app

RUN npm install -g pnpm@8.9.0 --loglevel notice
RUN npm i pm2 -g

COPY .npmrc .
COPY .npmrc-cloud .

COPY package.json .

COPY providers ./providers
COPY apps/ws ./apps/ws
COPY libs/dal ./libs/dal
COPY libs/shared ./libs/shared
COPY libs/testing ./libs/testing
COPY packages/client ./packages/client
COPY packages/stateless ./packages/stateless
COPY packages/node ./packages/node
COPY packages/application-generic ./packages/application-generic

COPY ["tsconfig.json","tsconfig.base.json","nx.json","pnpm-workspace.yaml","pnpm-lock.yaml", ".npmrc", "./"]

RUN if [ -n '${BULL_MQ_PRO_NPM_TOKEN}' ] ; then echo 'Building with Enterprise Edition of Novu' ; fi
RUN if [ -n '${BULL_MQ_PRO_NPM_TOKEN}' ]; then rm -f .npmrc ; fi
RUN if [ -n '${BULL_MQ_PRO_NPM_TOKEN}' ]; then cp .npmrc-cloud .npmrc; fi

RUN pnpm install --reporter=silent
RUN pnpm build:ws

RUN if $BULL_MQ_PRO_NPM_TOKEN ; then rm -f .npmrc ; fi

WORKDIR /usr/src/app/apps/ws

RUN cp src/.example.env dist/src/.env
RUN cp src/.env.test dist/src/.env.test
RUN cp src/.env.development dist/src/.env.development
RUN cp src/.env.production dist/src/.env.production

CMD [ "pm2-runtime", "dist/src/main.js" ]
