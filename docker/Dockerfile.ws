# =============================================================================
# ReNovu WebSocket Server - Self-Hosted Build
# =============================================================================

FROM node:20-alpine3.20 AS builder

RUN apk add --no-cache g++ make py3-pip bash
ENV NX_DAEMON=false

WORKDIR /usr/src/app

RUN npm install -g pnpm@10.16.1 --loglevel notice

# Copy package files first for better caching
COPY .npmrc .
COPY package.json .
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .
COPY nx.json .
COPY tsconfig.json .

# Copy source code
COPY apps/ws ./apps/ws
COPY libs ./libs
COPY packages ./packages

# Install dependencies
RUN --mount=type=cache,id=pnpm-store-ws,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile --unsafe-perm

# Build WebSocket Server
RUN NODE_ENV=production pnpm build:ws --skip-nx-cache

# =============================================================================
# Production Stage
# =============================================================================
FROM node:20-alpine3.20

RUN apk add --no-cache g++ make py3-pip
RUN npm install -g pnpm@10.16.1 pm2 --loglevel notice

USER 1000
WORKDIR /usr/src/app

# Copy all necessary files from builder (including workspace packages)
COPY --chown=1000:1000 --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=1000:1000 --from=builder /usr/src/app/packages ./packages
COPY --chown=1000:1000 --from=builder /usr/src/app/libs ./libs
COPY --chown=1000:1000 --from=builder /usr/src/app/apps/ws/node_modules ./apps/ws/node_modules
COPY --chown=1000:1000 --from=builder /usr/src/app/apps/ws/dist ./apps/ws/dist
COPY --chown=1000:1000 --from=builder /usr/src/app/apps/ws/package.json ./apps/ws/package.json

WORKDIR /usr/src/app/apps/ws

ENV NEW_RELIC_NO_CONFIG_FILE=true

EXPOSE 3002

CMD ["pm2-runtime", "start", "dist/main.js", "-i", "max"]
