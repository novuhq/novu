FROM ghcr.io/novuhq/novu/base:1.0.0 AS dev
ARG PACKAGE_PATH

# Combine COPY commands into a single layer
COPY --chown=1000:1000 ./meta ./deps ./pkg ./

# Install dependencies and build the webhook
RUN --mount=type=cache,id=pnpm-store-webhook,target=/root/.pnpm-store \
    pnpm install --reporter=silent --filter "novuhq" --filter "{${PACKAGE_PATH}}..." \
    --frozen-lockfile --unsafe-perm --reporter=silent && \
    NODE_ENV=production pnpm build:webhook

# Copy environment file after build
WORKDIR /usr/src/app/apps/webhook
RUN cp src/.example.env dist/.env

WORKDIR /usr/src/app

# ------- ASSETS BUILD ----------
FROM dev AS assets

# Remove unnecessary dependencies for production
RUN rm -rf node_modules && pnpm recursive exec -- rm -rf ./src ./node_modules

# ------- PRODUCTION BUILD ----------
FROM ghcr.io/novuhq/novu/base:1.0.0 AS prod
ARG PACKAGE_PATH

ENV CI=true

WORKDIR /usr/src/app

# Separate COPY command for local files
COPY --chown=1000:1000 ./meta ./

# Copy build artifacts from the assets stage
COPY --chown=1000:1000 --from=assets /usr/src/app .

# Install only production dependencies
RUN --mount=type=cache,id=pnpm-store-webhook,target=/root/.pnpm-store \
    pnpm install --reporter=silent --filter "{${PACKAGE_PATH}}..." \
    --frozen-lockfile --unsafe-perm --prod --reporter=silent

# Final command to run the application
WORKDIR /usr/src/app/apps/webhook
CMD [ "pm2-runtime", "dist/main.js" ]