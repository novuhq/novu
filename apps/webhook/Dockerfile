# Use the base image for development
FROM ghcr.io/novuhq/novu/base:1.0.0 AS dev
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

# Set the working directory to the root of the app
WORKDIR /usr/src/app

# Copy necessary directories from the build stage
COPY --chown=1000:1000 ./meta ./
COPY --chown=1000:1000 --from=assets /usr/src/app .

# Install production dependencies
RUN --mount=type=cache,id=pnpm-store-webhook,target=/root/.pnpm-store \
    pnpm install --reporter=silent --filter "{${PACKAGE_PATH}}..." \
    --frozen-lockfile --unsafe-perm --prod --reporter=silent

# Set the working directory to the webhook app and start the application using pm2-runtime
WORKDIR /usr/src/app/apps/webhook
CMD [ "pm2-runtime", "start", "dist/main.js" ]