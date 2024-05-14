FROM node:20-alpine3.19
ENV NX_DAEMON=false

RUN apk add --no-cache bash g++ make py3-pip
RUN npm install -g pnpm@8.9.0 --loglevel notice

USER 1000
WORKDIR /usr/src/app

COPY --chown=1000:1000 .npmrc .
COPY --chown=1000:1000 package.json .

COPY --chown=1000:1000 apps/widget ./apps/widget

COPY --chown=1000:1000 libs/dal ./libs/dal
COPY --chown=1000:1000 packages/client ./packages/client
COPY --chown=1000:1000 libs/testing ./libs/testing
COPY --chown=1000:1000 libs/shared ./libs/shared
COPY --chown=1000:1000 packages/notification-center ./packages/notification-center
COPY --chown=1000:1000 packages/stateless ./packages/stateless
COPY --chown=1000:1000 packages/node ./packages/node

COPY --chown=1000:1000 tsconfig.json .
COPY --chown=1000:1000 tsconfig.base.json .

COPY --chown=1000:1000 .eslintrc.js .
COPY --chown=1000:1000 .prettierrc .
COPY --chown=1000:1000 .prettierignore .
COPY --chown=1000:1000 nx.json .
COPY --chown=1000:1000 pnpm-workspace.yaml .
COPY --chown=1000:1000 pnpm-lock.yaml .

RUN pnpm install --reporter=silent
RUN pnpm build

RUN pnpm build:widget

CMD [ "pnpm", "start:static:widget" ]
