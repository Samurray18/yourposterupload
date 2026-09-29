# Build stage: compile the Vite bundle.
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci --workspace client --include-workspace-root

COPY client ./client
RUN npm run build --workspace client

# Runtime stage: nginx serves the static bundle and proxies the API.
FROM nginx:1.27-alpine AS runtime

RUN rm /etc/nginx/conf.d/default.conf
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
