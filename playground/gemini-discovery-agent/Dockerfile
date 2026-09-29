FROM node:24-slim
WORKDIR /app
# production turns on bridge HMAC verification in @novu/framework
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY src ./src
COPY agents.json ./
USER node
CMD ["node", "src/server.ts"]
