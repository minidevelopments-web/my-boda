# syntax=docker/dockerfile:1
#
# Multi-stage build for smaller production image (~150MB vs ~400MB).
# - deps: installs all deps (including devDeps needed for build) + native toolchain for better-sqlite3
# - builder: generates Prisma client and builds Next.js (needs devDeps)
# - runner: production-only deps via `npm prune --omit=dev`, no build toolchain
#
# SQLite note (better-sqlite3): single-writer, file-locked — suitable for single-instance
# deployments (e.g. single container with volume). For multi-instance / concurrent writers,
# switch to Postgres: uncomment the `postgres` service in docker-compose.yml,
# set DATABASE_URL=postgresql://user:password@postgres:5432/myboda and change
# provider to "postgresql" in prisma/schema.prisma (see that file for details).

FROM node:20-alpine AS base
WORKDIR /app

# ---- deps: install all dependencies (dev + prod) with native build tools ----
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci

# ---- builder: build Next.js + generate Prisma client ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p ./public

# Build args for Next.js public env (inlined at build time)
ARG NEXT_PUBLIC_COUPLE_NAME
ARG NEXT_PUBLIC_WEDDING_DATE
ARG NEXT_PUBLIC_VENUE
ARG NEXT_PUBLIC_THEME
ARG NEXT_PUBLIC_ACCENT
ARG NEXT_PUBLIC_SCHEDULE_JSON
ARG NEXT_PUBLIC_ACCOMMODATIONS_JSON
ARG NEXT_PUBLIC_REGISTRY_JSON
ARG NEXT_PUBLIC_VENUE_MAP_URL
ARG DATABASE_URL
ENV NEXT_PUBLIC_COUPLE_NAME=$NEXT_PUBLIC_COUPLE_NAME
ENV NEXT_PUBLIC_WEDDING_DATE=$NEXT_PUBLIC_WEDDING_DATE
ENV NEXT_PUBLIC_VENUE=$NEXT_PUBLIC_VENUE
ENV NEXT_PUBLIC_THEME=$NEXT_PUBLIC_THEME
ENV NEXT_PUBLIC_ACCENT=$NEXT_PUBLIC_ACCENT
ENV NEXT_PUBLIC_SCHEDULE_JSON=$NEXT_PUBLIC_SCHEDULE_JSON
ENV NEXT_PUBLIC_ACCOMMODATIONS_JSON=$NEXT_PUBLIC_ACCOMMODATIONS_JSON
ENV NEXT_PUBLIC_REGISTRY_JSON=$NEXT_PUBLIC_REGISTRY_JSON
ENV NEXT_PUBLIC_VENUE_MAP_URL=$NEXT_PUBLIC_VENUE_MAP_URL
ENV DATABASE_URL=$DATABASE_URL

RUN npx prisma generate
RUN npm run build

# ---- runner: minimal production image ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# tini for PID1 signal handling
RUN apk add --no-cache tini

# Copy built artifacts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
# Copy node_modules built in deps/builder (includes native better-sqlite3 bindings)
COPY --from=builder /app/node_modules ./node_modules

# Drop devDeps to halve image size; compiled native bindings are preserved
RUN npm prune --omit=dev && npm cache clean --force

EXPOSE 3000
CMD ["tini", "--", "npm", "start"]
