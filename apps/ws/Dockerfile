FROM node:16-alpine3.16

WORKDIR /usr/src/app

RUN npm install -g pnpm@7.5.0 --loglevel notice
RUN npm i pm2 -g

COPY .npmrc .
COPY package.json .

COPY apps/ws ./apps/ws
COPY libs/dal ./libs/dal
COPY libs/shared ./libs/shared
COPY libs/testing ./libs/testing
COPY packages/client ./packages/client
COPY packages/stateless ./packages/stateless
COPY packages/node ./packages/node

COPY ["tsconfig.json","tsconfig.base.json","nx.json","pnpm-workspace.yaml","pnpm-lock.yaml", ".npmrc", "./"]

RUN pnpm install --reporter=silent
RUN pnpm build:ws

WORKDIR /usr/src/app/apps/ws

RUN cp src/.example.env dist/src/.env
RUN cp src/.env.test dist/src/.env.test
RUN cp src/.env.development dist/src/.env.development
RUN cp src/.env.production dist/src/.env.production

CMD [ "pm2-runtime", "dist/src/main.js" ]
