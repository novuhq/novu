# start build stage
FROM nikolaik/python-nodejs:python3.10-nodejs16-alpine as builder
ENV NX_DAEMON=false

WORKDIR /usr/src/app

RUN apk add --no-cache bash
RUN npm install -g pnpm@7.33.4 --loglevel notice

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

COPY [".eslintrc.js",".prettierrc",".prettierignore", "./"]

RUN NX_DAEMON=false pnpm build:web
# end build stage

# start production stage
FROM node:16-alpine

WORKDIR /app

RUN apk add --no-cache bash
RUN npm install -g pnpm@7.33.4 http-server --loglevel notice

COPY --from=builder /usr/src/app/apps/web/env.sh /app/env.sh
COPY --from=builder /usr/src/app/apps/web/.env /app/.env

COPY --from=builder /usr/src/app/apps/web/build /app/build
COPY --from=builder /usr/src/app/apps/web/public /app/public
COPY --from=builder /usr/src/app/apps/web/package.json /app/package.json

CMD [ "pnpm", "start:static:build" ]
# end production stage
