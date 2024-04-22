# start build stage
FROM node:20-alpine3.19 as builder
RUN apk add g++ make py3-pip
ENV NX_DAEMON=false

WORKDIR /usr/src/app


RUN apk add --no-cache bash
RUN npm install -g pnpm@8.9.0 --loglevel notice

COPY .npmrc .
COPY package.json .

COPY apps/web ./apps/web
COPY libs/dal ./libs/dal
COPY libs/testing ./libs/testing
COPY packages/client ./packages/client
COPY libs/shared ./libs/shared
COPY libs/design-system ./libs/design-system
COPY libs/shared-web ./libs/shared-web

COPY packages/notification-center ./packages/notification-center
COPY packages/stateless ./packages/stateless
COPY packages/node ./packages/node

COPY tsconfig.json .
COPY tsconfig.base.json .

COPY nx.json .
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .

RUN --mount=type=cache,id=pnpm-store-web,target=/root/.pnpm-store\
  pnpm install --frozen-lockfile

RUN pnpm add @babel/core -w

COPY [".eslintrc.js",".prettierrc",".prettierignore", "./"]

RUN NX_DAEMON=false pnpm build:web
# end build stage

# start production stage
FROM node:20-alpine

RUN apk add --no-cache bash
RUN npm install -g pnpm@8.9.0 http-server --loglevel notice

USER 1000
WORKDIR /app

COPY --chown=1000:1000 --from=builder /usr/src/app/apps/web/env.sh /app/env.sh
COPY --chown=1000:1000 --from=builder /usr/src/app/apps/web/.env /app/.env

COPY --chown=1000:1000 --from=builder /usr/src/app/apps/web/build /app/build
COPY --chown=1000:1000 --from=builder /usr/src/app/apps/web/public /app/public
COPY --chown=1000:1000 --from=builder /usr/src/app/apps/web/package.json /app/package.json

CMD [ "pnpm", "start:static:build" ]
# end production stage
