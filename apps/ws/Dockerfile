########################################
# BASE
########################################
FROM images.artifactory.dunnhumby.com/node:20-alpine3.19 AS dev_base

# Set proxy environment variables for corporate network
ENV HTTP_PROXY=http://securecomms.int.dh:3128
ENV HTTPS_PROXY=http://securecomms.int.dh:3128
ENV http_proxy=http://securecomms.int.dh:3128
ENV https_proxy=http://securecomms.int.dh:3128
ENV NO_PROXY=localhost,127.0.0.1,artifactory.dunnhumby.com
ENV no_proxy=localhost,127.0.0.1,artifactory.dunnhumby.com

# Install SSL certificates and build dependencies
RUN apk add --no-cache ca-certificates && update-ca-certificates
RUN apk add --no-cache curl g++ make py3-pip python3 gcc musl-dev git openssh-client

ENV NX_DAEMON=false
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

# Configure npm to use internal Artifactory and install pm2
RUN --mount=type=secret,id=ARTIFACTORY_NPM_TOKEN \
    TOKEN=$(cat /run/secrets/ARTIFACTORY_NPM_TOKEN) && \
    echo "registry=https://artifactory.dunnhumby.com/artifactory/api/npm/npm-remote/" > /root/.npmrc && \
    echo "strict-ssl=false" >> /root/.npmrc && \
    echo "always-auth=true" >> /root/.npmrc && \
    echo "proxy=http://securecomms.int.dh:3128" >> /root/.npmrc && \
    echo "https-proxy=http://securecomms.int.dh:3128" >> /root/.npmrc && \
    echo "noproxy=github.com,*.github.com,githubusercontent.com,*.githubusercontent.com,codeload.github.com,nodejs.org,*.nodejs.org,unofficial-builds.nodejs.org" >> /root/.npmrc && \
    echo "//artifactory.dunnhumby.com/artifactory/api/npm/npm-remote/:_authToken=${TOKEN}" >> /root/.npmrc && \
    npm i pm2 -g

# Install pnpm
RUN --mount=type=secret,id=ARTIFACTORY_NPM_TOKEN \
    TOKEN=$(cat /run/secrets/ARTIFACTORY_NPM_TOKEN) && \
    npm --no-update-notifier --no-fund --global install pnpm@10.11.0

# Configure pnpm to use internal Artifactory
RUN --mount=type=secret,id=ARTIFACTORY_NPM_TOKEN \
    TOKEN=$(cat /run/secrets/ARTIFACTORY_NPM_TOKEN) && \
    pnpm config set registry https://artifactory.dunnhumby.com/artifactory/api/npm/npm-remote/ && \
    pnpm config set strict-ssl false && \
    pnpm config set //artifactory.dunnhumby.com/artifactory/api/npm/npm-remote/:_authToken ${TOKEN}

RUN pnpm --version
USER 1000
WORKDIR /usr/src/app

########################################
# DEV BUILD
########################################
FROM dev_base AS dev
ARG PACKAGE_PATH

COPY --chown=1000:1000 package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --chown=1000:1000 tsconfig*.json nx.json jest.config.js ./
COPY --chown=1000:1000 libs ./libs
COPY --chown=1000:1000 packages ./packages
COPY --chown=1000:1000 apps/ws ./apps/ws
COPY --chown=1000:1000 apps/api ./apps/api
COPY --chown=1000:1000 scripts ./scripts

# Configure npm registry with all scopes
RUN --mount=type=secret,id=ARTIFACTORY_NPM_TOKEN,uid=1000 \
    TOKEN=$(cat /run/secrets/ARTIFACTORY_NPM_TOKEN) && \
    echo "registry=https://artifactory.dunnhumby.com/artifactory/api/npm/npm-remote/" > ~/.npmrc && \
    echo "strict-ssl=false" >> ~/.npmrc && \
    echo "always-auth=false" >> ~/.npmrc && \
    echo "proxy=http://securecomms.int.dh:3128" >> ~/.npmrc && \
    echo "https-proxy=http://securecomms.int.dh:3128" >> ~/.npmrc && \
    echo "noproxy=github.com,*.github.com,githubusercontent.com,*.githubusercontent.com,codeload.github.com,nodejs.org,*.nodejs.org,unofficial-builds.nodejs.org" >> ~/.npmrc && \
    echo "//artifactory.dunnhumby.com/artifactory/api/npm/npm-remote/:_authToken=${TOKEN}" >> ~/.npmrc

# Install dependencies with GitHub authentication
RUN --mount=type=cache,id=pnpm-store-ws,target=/home/node/.pnpm-store \
    --mount=type=secret,id=ARTIFACTORY_NPM_TOKEN,uid=1000 \
    --mount=type=secret,id=GITHUB_TOKEN,uid=1000 \
    export NODE_TLS_REJECT_UNAUTHORIZED=0 && \
    ARTIFACTORY_TOKEN=$(cat /run/secrets/ARTIFACTORY_NPM_TOKEN) && \
    GH_TOKEN=$(cat /run/secrets/GITHUB_TOKEN) && \
    # Recreate .npmrc with fresh token
    echo "registry=https://artifactory.dunnhumby.com/artifactory/api/npm/npm-remote/" > ~/.npmrc && \
    echo "strict-ssl=false" >> ~/.npmrc && \
    echo "always-auth=false" >> ~/.npmrc && \
    echo "proxy=http://securecomms.int.dh:3128" >> ~/.npmrc && \
    echo "https-proxy=http://securecomms.int.dh:3128" >> ~/.npmrc && \
    echo "noproxy=github.com,*.github.com,githubusercontent.com,*.githubusercontent.com,codeload.github.com,nodejs.org,*.nodejs.org,unofficial-builds.nodejs.org" >> ~/.npmrc && \
    echo "//artifactory.dunnhumby.com/artifactory/api/npm/npm-remote/:_authToken=${ARTIFACTORY_TOKEN}" >> ~/.npmrc && \
    # Configure git to use HTTPS with embedded token (bypass proxy for git operations)
    git config --global http.https://github.com.proxy "" && \
    git config --global https.https://github.com.proxy "" && \
    git config --global http.https://codeload.github.com.proxy "" && \
    git config --global https.https://codeload.github.com.proxy "" && \
    git config --global http.sslVerify false && \
    git config --global url."https://x-access-token:${GH_TOKEN}@github.com/".insteadOf "https://github.com/" && \
    git config --global url."https://x-access-token:${GH_TOKEN}@github.com/".insteadOf "ssh://git@github.com/" && \
    git config --global url."https://x-access-token:${GH_TOKEN}@github.com/".insteadOf "git@github.com:" && \
    echo "Installing dependencies..." && \
    pnpm install \
        --filter "{${PACKAGE_PATH}}..." \
        --filter "!@taskforcesh/bullmq-pro" \
        --no-frozen-lockfile \
        --unsafe-perm \
        --shamefully-hoist

# Build WS
RUN NODE_ENV=production NX_DAEMON=false NX_NO_CLOUD=true NX_SKIP_NX_CACHE=false pnpm build:ws

WORKDIR /usr/src/app/apps/ws

RUN cp ../../scripts/dotenvcreate.mjs dist/dotenvcreate.mjs
RUN mkdir -p dist/src && \
    cp src/.example.env dist/src/.env && \
    (cp src/.env.test dist/src/.env.test 2>/dev/null || true) && \
    (cp src/.env.development dist/src/.env.development 2>/dev/null || true) && \
    (cp src/.env.production dist/src/.env.production 2>/dev/null || true)

WORKDIR /usr/src/app

########################################
# ASSETS
########################################
FROM dev AS assets

WORKDIR /usr/src/app

RUN rm -rf node_modules && pnpm recursive exec -- rm -rf ./src ./node_modules

########################################
# PRODUCTION BUILD
########################################
FROM dev_base AS prod
ARG PACKAGE_PATH
ENV CI=true
ENV NEW_RELIC_NO_CONFIG_FILE=true

WORKDIR /usr/src/app

# Copy only essential workspace files
COPY --chown=1000:1000 package.json pnpm-workspace.yaml .npmrc* ./

# Get the build artifacts from dev stage
COPY --chown=1000:1000 --from=assets /usr/src/app .

# Remove any existing .npmrc files and recreate with proper configuration
RUN find /usr/src/app -name ".npmrc" -type f -delete

# Install production dependencies only
RUN --mount=type=cache,id=pnpm-store-ws,target=/root/.pnpm-store \
    --mount=type=secret,id=ARTIFACTORY_NPM_TOKEN,uid=1000 \
    --mount=type=secret,id=GITHUB_TOKEN,uid=1000 \
    export NODE_TLS_REJECT_UNAUTHORIZED=0 && \
    TOKEN=$(cat /run/secrets/ARTIFACTORY_NPM_TOKEN) && \
    GH_TOKEN=$(cat /run/secrets/GITHUB_TOKEN) && \
    echo "registry=https://artifactory.dunnhumby.com/artifactory/api/npm/npm-remote/" > /usr/src/app/.npmrc && \
    echo "@types:registry=https://artifactory.dunnhumby.com/artifactory/api/npm/npm-remote/" >> /usr/src/app/.npmrc && \
    echo "@aws-sdk:registry=https://artifactory.dunnhumby.com/artifactory/api/npm/npm-remote/" >> /usr/src/app/.npmrc && \
    echo "@nestjs:registry=https://artifactory.dunnhumby.com/artifactory/api/npm/npm-remote/" >> /usr/src/app/.npmrc && \
    echo "@sentry:registry=https://artifactory.dunnhumby.com/artifactory/api/npm/npm-remote/" >> /usr/src/app/.npmrc && \
    echo "@novu:registry=https://artifactory.dunnhumby.com/artifactory/api/npm/npm-remote/" >> /usr/src/app/.npmrc && \
    echo "always-auth=true" >> /usr/src/app/.npmrc && \
    echo "strict-ssl=false" >> /usr/src/app/.npmrc && \
    echo "proxy=http://securecomms.int.dh:3128" >> /usr/src/app/.npmrc && \
    echo "https-proxy=http://securecomms.int.dh:3128" >> /usr/src/app/.npmrc && \
    echo "noproxy=github.com,*.github.com,githubusercontent.com,*.githubusercontent.com,codeload.github.com,nodejs.org,*.nodejs.org,unofficial-builds.nodejs.org" >> /usr/src/app/.npmrc && \
    echo "//artifactory.dunnhumby.com/artifactory/api/npm/npm-remote/:_authToken=${TOKEN}" >> /usr/src/app/.npmrc && \
    git config --global http.https://github.com.proxy "" && \
    git config --global https.https://github.com.proxy "" && \
    git config --global http.sslVerify false && \
    git config --global url."https://x-access-token:${GH_TOKEN}@github.com/".insteadOf "https://github.com/" && \
    git config --global url."https://x-access-token:${GH_TOKEN}@github.com/".insteadOf "ssh://git@github.com/" && \
    git config --global url."https://x-access-token:${GH_TOKEN}@github.com/".insteadOf "git@github.com:" && \
    pnpm install \
        --filter "{${PACKAGE_PATH}}..." \
        --filter "!@taskforcesh/bullmq-pro" \
        --no-frozen-lockfile \
        --unsafe-perm \
        --prod \
        --ignore-scripts || \
    pnpm install \
        --filter "{${PACKAGE_PATH}}..." \
        --filter "!@taskforcesh/bullmq-pro" \
        --no-frozen-lockfile \
        --unsafe-perm \
        --prod

WORKDIR /usr/src/app/apps/ws
ENTRYPOINT [ "sh", "-c", "node dist/dotenvcreate.mjs -s=novu/ws -r=$NOVU_REGION -e=$NOVU_ENTERPRISE -v=$NODE_ENV && pm2-runtime start dist/main.js -i 2" ]
