FROM node:16.13.1

WORKDIR /usr/src/app

RUN npm i pnpm -g --loglevel notice --force

COPY package.json .

COPY libs/sdk ./libs/sdk

COPY tsconfig.json .
COPY tsconfig.base.json .

COPY nx.json .
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .

RUN pnpm install

CMD [ "pnpm", "start:docker:sdk" ]
