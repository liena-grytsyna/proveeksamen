FROM ubuntu:22.04 AS base

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_VERSION=20

RUN apt-get update && \
    apt-get install -y ca-certificates curl gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_VERSION.x nodistro main" \
      | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM base AS builder

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM base AS server

ENV NODE_ENV=production \
    PORT=3001 \
    CLIENT_ORIGIN=http://localhost

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "server/index.js"]

FROM nginx:1.25-alpine AS nginx

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf