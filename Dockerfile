# XWeb — 长河
# Multi-stage Docker build: Astro → Production
# CMS (public/admin/sveltia-cms.js) is pre-built, committed to repo

# ── Stage 1: Build Astro App ──────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Production Runtime ───────────────────────────
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/public/ ./public/

# Pre-compress large static files for faster serving
RUN find public -type f \( -name '*.js' -o -name '*.css' -o -name '*.svg' -o -name '*.html' \) -exec gzip -k9 {} \;

# CMS runtime needs these to generate config.yml and read/write content
COPY --from=builder /app/templates/ ./templates/
COPY --from=builder /app/src/content/ ./src/content/

EXPOSE 4321

CMD ["node", "dist/server/entry.mjs"]
