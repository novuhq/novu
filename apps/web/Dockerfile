# start build stage
FROM node:20-alpine3.19 AS builder
RUN apk add g++ make py3-pip
ENV NX_DAEMON=false

WORKDIR /usr/src/app


RUN apk add --no-cache bash
RUN npm install -g pnpm@9.11.0 --loglevel notice

COPY .npmrc .
COPY package.json .

COPY apps/web ./apps/web
COPY libs ./libs
COPY packages ./packages
COPY enterprise ./enterprise
COPY tsconfig.json .

COPY nx.json .
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .

RUN --mount=type=cache,id=pnpm-store-web,target=/root/.pnpm-store\
  pnpm install --frozen-lockfile

RUN pnpm add @babel/core -w

COPY [".prettierrc",".prettierignore", "./"]

RUN CI='' pnpm build:web --skip-nx-cache
# end build stage

# start production stage
FROM node:20-alpine

RUN apk add --no-cache bash
RUN npm install -g pnpm@9.11.0 http-server --loglevel notice

USER 1000
WORKDIR /app

COPY --chown=1000:1000 --from=builder /usr/src/app/apps/web/env.sh /app/env.sh

COPY --chown=1000:1000 --from=builder /usr/src/app/apps/web/build /app/build
COPY --chown=1000:1000 --from=builder /usr/src/app/apps/web/.env.sample /app/.env.sample
COPY --chown=1000:1000 --from=builder /usr/src/app/apps/web/package.json /app/package.json

RUN pnpm run envsetup:docker
CMD [ "pnpm", "start:static:build" ]
# end production stage
