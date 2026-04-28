# Use the base image for development
FROM node:22.22.1-alpine3.22 AS dev_base
RUN apk add --no-cache g++ make py3-pip
ENV NX_DAEMON=false

# Install global dependencies
RUN npm --no-update-notifier --no-fund --global install pm2 pnpm@10.33.0&& \
    pnpm --version

# Set non-root user
USER 1000
WORKDIR /usr/src/app

FROM dev_base AS dev
ARG PACKAGE_PATH

# Copy necessary directories to the image with appropriate ownership
COPY --chown=1000:1000 ./meta ./deps ./pkg ./

# Install dependencies and build the webhook service
RUN --mount=type=cache,id=pnpm-store-webhook,target=/root/.pnpm-store \
    pnpm install --reporter=silent --filter "novuhq" --filter "{${PACKAGE_PATH}}..." \
    --frozen-lockfile --unsafe-perm --reporter=silent && \
    NODE_ENV=production pnpm build:webhook

# Set the working directory to the webhook app and copy example environment file
WORKDIR /usr/src/app/apps/webhook
RUN cp src/dotenvcreate.mjs dist/dotenvcreate.mjs
RUN cp src/.example.env dist/.env
RUN cp src/.env.development dist/.env.development
RUN cp src/.env.production dist/.env.production

# Set the working directory to the root of the app
WORKDIR /usr/src/app

# ------- DEPLOY ----------
FROM dev AS deploy

WORKDIR /usr/src/app
RUN pnpm --filter @novu/webhook deploy --legacy --prod /usr/src/deploy

# ------- PRODUCTION BUILD ----------
# Use clean base for production (NO Python)
FROM node:22.22.1-alpine3.22 AS prod

ENV CI=true

# Install only runtime dependencies
RUN npm --no-update-notifier --no-fund --global install pm2 && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

USER 1000
WORKDIR /usr/src/app

# Flat node_modules from pnpm deploy (no symlinks, no hoisting issues)
COPY --chown=1000:1000 --from=deploy /usr/src/deploy .

# Built output (not included by pnpm deploy because dist is gitignored)
COPY --chown=1000:1000 --from=dev /usr/src/app/apps/webhook/dist ./dist

ENTRYPOINT [ "sh", "-c", "node dist/dotenvcreate.mjs -s=$SECRET_NAME -r=$NOVU_REGION -e=$NOVU_ENTERPRISE -v=$NODE_ENV && pm2-runtime start dist/main.js -i max" ]
