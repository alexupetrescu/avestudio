FROM node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=1536
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund --legacy-peer-deps
COPY . .
# Static generation reads already-public HTTPS content. It never loads production credentials.
ARG DJANGO_INTERNAL_API_URL=https://api.avestudio.ro/api
ENV DJANGO_INTERNAL_API_URL=${DJANGO_INTERNAL_API_URL} DJANGO_API_PROXY_TARGET=http://backend:8000 NEXT_PUBLIC_SITE_URL=https://avestudio.ro NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_DISABLE_ANALYTICS=1
RUN npm run build

FROM node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=512 MALLOC_ARENA_MAX=2 DJANGO_INTERNAL_API_URL=http://backend:8000/api DJANGO_API_PROXY_TARGET=http://backend:8000 NEXT_PUBLIC_SITE_URL=https://avestudio.ro NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_DISABLE_ANALYTICS=1
RUN groupadd --gid 20010 app && useradd --no-log-init --uid 20010 --gid 20010 --no-create-home --shell /usr/sbin/nologin app
COPY --from=build --chown=20010:20010 /app/ /app/
USER 20010:20010
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0", "--port", "3000", "--keepAliveTimeout", "70000"]
