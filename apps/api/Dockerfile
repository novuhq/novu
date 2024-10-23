# Use the base image for development
FROM ghcr.io/novuhq/novu/base:1.0.0 AS dev
ARG PACKAGE_PATH

# Copy necessary directories to the image
COPY --chown=1000:1000 ./meta ./deps ./pkg ./

# Install dependencies and build the project
RUN --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 \
    BULL_MQ_PRO_NPM_TOKEN=$(cat /run/secrets/BULL_MQ_PRO_NPM_TOKEN) && \
    [ -n "$BULL_MQ_PRO_NPM_TOKEN" ] && echo 'Building with Enterprise Edition of Novu' && \
    rm -f .npmrc && cp .npmrc-cloud .npmrc || true && \
    pnpm install --filter "novuhq" --filter "{${PACKAGE_PATH}}..." --frozen-lockfile --unsafe-perm && \
    NODE_ENV=production NX_DAEMON=false pnpm build:api

# Set the working directory to the API app and copy example environment file
WORKDIR /usr/src/app/apps/api
RUN cp src/.example.env dist/.env

# Set the working directory to the root of the app
WORKDIR /usr/src/app

# ------- ASSETS BUILD ----------
# Create a new stage for building assets
FROM dev AS assets

# Remove node_modules and source directories
RUN rm -rf node_modules && pnpm recursive exec -- rm -rf ./src ./node_modules

# ------- PRODUCTION BUILD ----------
# Use the base image for production
FROM ghcr.io/novuhq/novu/base:1.0.0 AS prod

ARG PACKAGE_PATH

# Set environment variables for production
ENV CI=true
ENV NEW_RELIC_NO_CONFIG_FILE=true

# Set the working directory to the root of the app
WORKDIR /usr/src/app

# Copy necessary directories from the build stage
COPY --chown=1000:1000 ./meta ./
COPY --chown=1000:1000 --from=assets /usr/src/app .

# Install production dependencies
RUN --mount=type=cache,id=pnpm-store-api,target=/root/.pnpm-store \
    --mount=type=secret,id=BULL_MQ_PRO_NPM_TOKEN,uid=1000 \
    pnpm install --filter "{${PACKAGE_PATH}}..." --frozen-lockfile --unsafe-perm --prod

# Set the working directory to the API app and start the application using pm2-runtime
WORKDIR /usr/src/app/apps/api
CMD [ "pm2-runtime", "start", "dist/main.js" ]