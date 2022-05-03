FROM node:16.13.1

WORKDIR /usr/src/app

RUN npm i pnpm@6.32.11 -g --loglevel notice --force

COPY package.json .

COPY libs/embed ./libs/embed

COPY tsconfig.json .
COPY tsconfig.base.json .

COPY nx.json .
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .

RUN pnpm install

CMD [ "pnpm", "start:docker:embed" ]
