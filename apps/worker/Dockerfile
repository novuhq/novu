FROM ghcr.io/novuhq/novu/base:1.0.0 AS dev
ARG PACKAGE_PATH

# Combine COPY commands into a single layer
COPY --chown=1000:1000 ./meta ./deps ./pkg ./

# Combine secret handling and package installation
RUN --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 \
    export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && \
    if [ -n "${BULL_MQ_PRO_NPM_TOKEN}" ] ; then \
        echo 'Building with Enterprise Edition of Novu' && \
        rm -f .npmrc && cp .npmrc-cloud .npmrc ; \
    fi && \
    pnpm install --filter "novuhq" --filter "{${PACKAGE_PATH}}..." --frozen-lockfile --unsafe-perm --reporter=silent

# Build the worker
RUN --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 \
    export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && \
    NODE_ENV=production NX_DAEMON=false pnpm build:worker

# Copy environment file after build
WORKDIR /usr/src/app/apps/worker
RUN cp src/.example.env dist/.env

WORKDIR /usr/src/app

# ------- ASSETS BUILD ----------
FROM dev AS assets

# Remove all unnecessary dependencies for production
RUN rm -rf node_modules && pnpm recursive exec -- rm -rf ./src ./node_modules

# ------- PRODUCTION BUILD ----------
FROM ghcr.io/novuhq/novu/base:1.0.0 AS prod
ARG PACKAGE_PATH

ENV CI=true
ENV NEW_RELIC_NO_CONFIG_FILE=true

WORKDIR /usr/src/app

# Separate COPY commands for local files and build artifacts
COPY --chown=1000:1000 ./meta ./
COPY --chown=1000:1000 --from=assets /usr/src/app .

# Install only production dependencies
RUN --mount=type=cache,id=pnpm-store-worker,target=/root/.pnpm-store \
    --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 \
    export BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && \
    pnpm install --filter "{${PACKAGE_PATH}}..." --frozen-lockfile --unsafe-perm --reporter=silent --prod

# Final command to run the application
WORKDIR /usr/src/app/apps/worker
CMD [ "pm2-runtime", "start", "dist/main.js" ]