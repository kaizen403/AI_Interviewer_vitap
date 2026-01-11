# Backend-only Dockerfile
FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate
RUN apt-get update && apt-get install -y python3 make g++ openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
RUN pnpm install --frozen-lockfile

# Build backend
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY apps/backend ./apps/backend
COPY package.json pnpm-workspace.yaml ./
WORKDIR /app/apps/backend
RUN pnpm prisma generate --schema=prisma/schema.prisma
RUN pnpm build

# Production
FROM node:22-slim
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app/apps/backend

# Copy built backend
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=builder /app/apps/backend/src/generated ./src/generated
COPY --from=builder /app/apps/backend/src/generated ./dist/generated
COPY --from=builder /app/apps/backend/package.json ./
COPY --from=deps /app/node_modules /app/node_modules

ENV NODE_ENV=production
EXPOSE 10000
CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/schema.prisma || true; node dist/agent/voice-agent-router.js download-files || true; node dist/index.js & node dist/agent/voice-agent-router.js start"]
