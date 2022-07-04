FROM node:18-buster-slim

WORKDIR /usr/src/app

RUN npm install -g pnpm@7.3.0 --loglevel notice

COPY .npmrc .
COPY package.json .

COPY apps/web ./apps/web

COPY libs/dal ./libs/dal
COPY libs/testing ./libs/testing
COPY libs/shared ./libs/shared
COPY packages/notification-center ./packages/notification-center

COPY tsconfig.json .
COPY tsconfig.base.json .

COPY nx.json .
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .

RUN pnpm install
RUN pnpm add @babel/core -w

COPY .eslintrc.js .
COPY .prettierrc .
COPY .prettierignore .

RUN pnpm build:web

CMD [ "pnpm", "start:static:web" ]
