# syntax=docker/dockerfile:1
#
# Postgres production — DATABASE_URL must be postgresql://...

FROM node:20-alpine AS base
WORKDIR /app

# ---- deps: install all dependencies (dev + prod; no native toolchain needed, pg is pure JS) ----
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ---- builder: build Next.js + generate Prisma client ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

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
# Copy node_modules built in deps/builder
COPY --from=builder /app/node_modules ./node_modules

# Drop devDeps to halve image size
RUN npm prune --omit=dev && npm cache clean --force

EXPOSE 3000
CMD ["tini", "--", "npm", "start"]
