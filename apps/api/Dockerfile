FROM node:16.13.1

WORKDIR /usr/src/app

RUN npm install -g pnpm@7.3.0 --loglevel notice
RUN npm i pm2 -g

COPY package.json .
COPY .npmrc .

COPY apps/api ./apps/api
COPY libs/dal ./libs/dal
COPY libs/testing ./libs/testing
COPY libs/shared ./libs/shared
COPY providers ./providers

COPY tsconfig.json .
COPY tsconfig.base.json .

COPY nx.json .
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .

RUN pnpm i
RUN pnpm build:api

WORKDIR /usr/src/app/apps/api
RUN cp src/.example.env dist/src/.env
RUN cp src/.env.test dist/src/.env.test
RUN cp src/.env.development dist/src/.env.development
RUN cp src/.env.production dist/src/.env.production

CMD [ "pm2-runtime", "dist/src/main.js" ]
