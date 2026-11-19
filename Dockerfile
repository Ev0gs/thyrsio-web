# L'application web de Thyrsio : compilée par Node, puis servie par Caddy (qui fait aussi le HTTPS et le proxy).
# Le Caddyfile vient de thyrsio-api/deploy, monté par le docker-compose de production.

# ---------- 1. Compilation ----------
FROM node:24-alpine AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# L'adresse de Keycloak, inscrite dans l'application à la compilation (voir src/environments/environment.ts)
ARG KEYCLOAK_URL
RUN test -n "$KEYCLOAK_URL" || (echo "KEYCLOAK_URL manquant" && exit 1)
RUN npx ng build --configuration production --define "THYRSIO_KEYCLOAK_URL='${KEYCLOAK_URL}'"

# ---------- 2. Service ----------
FROM caddy:2-alpine
COPY --from=build /build/dist/thyrsio-web/browser /srv
