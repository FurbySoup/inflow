# syntax=docker/dockerfile:1

# Build stage: install dev dependencies and produce dist/ (UI) and dist-server/ (proxy server).
FROM node:22-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm run build:server

# Runtime stage: only the built output. The server has no runtime npm dependencies.
FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=build /src/dist ./dist
COPY --from=build /src/dist-server ./dist-server
# package.json carries "type": "module", so the ESM server bundle doesn't rely on Node's syntax detection.
COPY --from=build /src/package.json ./

# Inside the container the server must listen on all interfaces; publish the port on 127.0.0.1 on the host.
ENV HOST=0.0.0.0 PORT=8080 NODE_ENV=production
EXPOSE 8080
USER node

HEALTHCHECK --interval=60s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" || exit 1

LABEL org.opencontainers.image.source="https://github.com/FurbySoup/inflow" \
      org.opencontainers.image.description="INFLOW: storm situation room (radar, warnings, chaser streams, scanners, DOT cameras)" \
      org.opencontainers.image.licenses="MIT"

CMD ["node", "dist-server/index.js"]
