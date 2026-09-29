# Build stage: compile TypeScript to dist/
FROM node:24-alpine AS build
WORKDIR /app

# Install with the lockfile for reproducible builds. Copying only the manifests
# first keeps this layer cached until dependencies actually change.
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci --workspace server --include-workspace-root

COPY server ./server
RUN npm run build --workspace server

# Runtime stage: no compiler, no dev dependencies, no source.
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache tini

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci --omit=dev --workspace server --include-workspace-root && npm cache clean --force

COPY --from=build /app/server/dist ./server/dist

# The API serves uploaded product images from this directory; `uploads/` is a
# volume in docker-compose so admin uploads survive a container replacement.
RUN mkdir -p /app/server/uploads && chown -R node:node /app/server/uploads
VOLUME ["/app/server/uploads"]

USER node
EXPOSE 4000

# tini reaps zombies and forwards SIGTERM so shutdown is clean.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/dist/index.js"]
