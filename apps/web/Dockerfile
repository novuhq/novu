FROM nikolaik/python-nodejs:python3.10-nodejs16-alpine

WORKDIR /usr/src/app

RUN npm install -g pnpm@7.5.0 --loglevel notice

COPY .npmrc .
COPY package.json .

COPY apps/web ./apps/web

COPY libs/dal ./libs/dal
COPY libs/testing ./libs/testing
COPY packages/client ./packages/client
COPY libs/shared ./libs/shared
COPY packages/notification-center ./packages/notification-center
COPY packages/stateless ./packages/stateless
COPY packages/node ./packages/node

COPY tsconfig.json .
COPY tsconfig.base.json .

COPY nx.json .
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .

RUN --mount=type=cache,id=pnpm-store-web,target=/root/.pnpm-store\
  pnpm install --reporter=silent

RUN pnpm add @babel/core -w

COPY [".eslintrc.js",".prettierrc",".prettierignore","./"]

RUN NX_DAEMON=false pnpm build:web

CMD [ "pnpm", "start:static:web" ]
