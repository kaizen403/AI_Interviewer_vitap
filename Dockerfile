# ============================================
# Capstone Reviewer - Single Service Dockerfile
# Combines Frontend + Backend + Voice Agent
# ============================================

FROM node:22-slim AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

# Install system dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ============================================
# Dependencies Stage
# ============================================
FROM base AS deps

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# ============================================
# Backend Build Stage
# ============================================
FROM base AS backend-builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy source
COPY apps/backend ./apps/backend
COPY package.json pnpm-workspace.yaml ./

WORKDIR /app/apps/backend

# Generate Prisma client and build
RUN pnpm prisma generate
RUN pnpm build

# Note: agent:download runs at runtime in start.sh (needs env vars)

# ============================================
# Frontend Build Stage
# ============================================
FROM base AS frontend-builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules

# Copy source
COPY apps/frontend ./apps/frontend
COPY package.json pnpm-workspace.yaml ./

WORKDIR /app/apps/frontend

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ============================================
# Production Stage
# ============================================
FROM base AS production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml ./

# Copy backend build
COPY --from=backend-builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=backend-builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=backend-builder /app/apps/backend/package.json ./apps/backend/
COPY --from=backend-builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=backend-builder /app/apps/backend/src/generated ./apps/backend/src/generated

# Copy frontend build
COPY --from=frontend-builder /app/apps/frontend/.next ./apps/frontend/.next
COPY --from=frontend-builder /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY --from=frontend-builder /app/apps/frontend/package.json ./apps/frontend/
COPY --from=frontend-builder /app/apps/frontend/public ./apps/frontend/public

# Copy start script
COPY start.sh ./
RUN chmod +x start.sh

# Create uploads directory
RUN mkdir -p /app/apps/backend/uploads && chown -R appuser:nodejs /app

USER appuser

# Expose ports
EXPOSE 10000

# Start both services
CMD ["./start.sh"]
