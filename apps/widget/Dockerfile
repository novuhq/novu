FROM nikolaik/python-nodejs:python3.10-nodejs16-alpine

WORKDIR /usr/src/app

RUN npm install -g pnpm@7.5.0 --loglevel notice

COPY .npmrc .
COPY package.json .

COPY apps/widget ./apps/widget

COPY libs/dal ./libs/dal
COPY packages/client ./packages/client
COPY libs/testing ./libs/testing
COPY libs/shared ./libs/shared
COPY packages/notification-center ./packages/notification-center
COPY packages/stateless ./packages/stateless
COPY packages/node ./packages/node

COPY tsconfig.json .
COPY tsconfig.base.json .

COPY .eslintrc.js .
COPY .prettierrc .
COPY .prettierignore .
COPY nx.json .
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .

RUN pnpm install --reporter=silent
RUN pnpm build

RUN pnpm build:widget

CMD [ "pnpm", "start:static:widget" ]
