FROM node:16.13.1

WORKDIR /usr/src/app

RUN npm i pnpm@6.32.11 -g --loglevel notice --force
RUN pnpm i pm2 -g

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
