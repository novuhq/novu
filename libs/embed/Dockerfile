FROM nikolaik/python-nodejs:python3.10-nodejs16-alpine

WORKDIR /usr/src/app

RUN npm install -g pnpm@7.5.0 --loglevel notice --force

COPY .npmrc .
COPY package.json .

COPY libs/testing ./libs/testing
COPY libs/dal ./libs/dal
COPY libs/shared ./libs/shared
COPY packages/client ./packages/client
COPY libs/embed ./libs/embed
COPY packages/notification-center ./packages/notification-center

COPY tsconfig.json .
COPY tsconfig.base.json .

COPY nx.json .
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .

RUN pnpm install --reporter=silent
RUN pnpm build

CMD [ "pnpm", "start:docker:embed" ]
