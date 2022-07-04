FROM node:18-buster-slim

WORKDIR /usr/src/app

RUN npm install -g pnpm@7.3.0 --loglevel notice
RUN npm i pm2 -g

COPY .npmrc .
COPY package.json .

COPY apps/ws ./apps/ws
COPY libs/dal ./libs/dal
COPY libs/shared ./libs/shared
COPY libs/testing ./libs/testing

COPY tsconfig.json .
COPY tsconfig.base.json .

COPY nx.json .
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .

RUN pnpm install
RUN pnpm build:ws

WORKDIR /usr/src/app/apps/ws
RUN cp src/.example.env dist/src/.env
RUN cp src/.env.test dist/src/.env.test
RUN cp src/.env.development dist/src/.env.development
RUN cp src/.env.production dist/src/.env.production

CMD [ "pm2-runtime", "dist/src/main.js" ]
