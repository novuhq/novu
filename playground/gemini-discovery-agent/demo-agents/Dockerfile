FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server.ts personas.ts ./
USER node
CMD ["node", "server.ts"]
