# XWeb — AI-Readable Website Engine
# Multi-stage Docker build: CMS → Astro → Production
# https://github.com/xtoryai/xweb

# ── Stage 1: Build Sveltia CMS ────────────────────────────
FROM node:22-alpine AS cms-builder
WORKDIR /app/cms

# Install CMS dependencies
COPY cms/package.json cms/package-lock.json ./
RUN npm ci

# Build CMS
COPY cms/ ./
RUN npm run build

# ── Stage 2: Build Astro App ──────────────────────────────
FROM node:22-alpine AS astro-builder
WORKDIR /app

# Install Astro dependencies (includes sharp native build)
COPY package.json package-lock.json ./
RUN npm ci

# Inject built CMS into public/admin
COPY --from=cms-builder /app/cms/package/dist/ ./public/admin/

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 3: Production Runtime ───────────────────────────
FROM node:22-alpine

WORKDIR /app

# Install production-only deps (sharp, marked, js-yaml)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy build output
COPY --from=astro-builder /app/dist/ ./dist/
COPY --from=astro-builder /app/public/ ./public/

EXPOSE 4321

# Astro standalone server — env vars are injected at runtime
CMD ["node", "dist/server/entry.mjs"]
