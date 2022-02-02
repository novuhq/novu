FROM node:16.13.1

WORKDIR /usr/src/app

RUN npm i pnpm -g --loglevel notice --force

COPY package.json .

COPY apps/web ./apps/web

COPY libs/dal ./libs/dal
COPY libs/testing ./libs/testing
COPY libs/shared ./libs/shared

COPY tsconfig.json .
COPY tsconfig.base.json .

COPY nx.json .
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .

RUN pnpm install
RUN pnpm add @babel/core -W

CMD [ "pnpm", "start:docker:web" ]
