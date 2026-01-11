# ============================================
# Capstone Reviewer - MINIMAL Dockerfile
# Target: ~500MB by not copying root node_modules
# ============================================

FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate
RUN apt-get update && apt-get install -y python3 make g++ openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ============================================
# Install ALL dependencies (for building)
# ============================================
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
RUN pnpm install --frozen-lockfile

# ============================================
# Build Backend
# ============================================
FROM base AS backend-builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY apps/backend ./apps/backend
COPY package.json pnpm-workspace.yaml ./
WORKDIR /app/apps/backend
RUN pnpm prisma generate
RUN pnpm build

# ============================================
# Build Frontend (with standalone output)
# ============================================
FROM base AS frontend-builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY apps/frontend ./apps/frontend
COPY package.json pnpm-workspace.yaml ./
WORKDIR /app/apps/frontend
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ============================================
# Backend Production Dependencies (standalone)
# ============================================
FROM base AS backend-prod
WORKDIR /app/apps/backend
COPY apps/backend/package.json ./
# Install prod deps directly in backend folder (no workspace)
RUN pnpm install --prod --ignore-workspace

# ============================================
# PRODUCTION - Minimal
# ============================================
FROM node:22-slim AS production

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser
WORKDIR /app

# --- Backend (NO root node_modules!) ---
COPY --from=backend-prod /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=backend-builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=backend-builder /app/apps/backend/package.json ./apps/backend/
COPY --from=backend-builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=backend-builder /app/apps/backend/src/generated ./apps/backend/src/generated
COPY --from=backend-builder /app/apps/backend/src/generated ./apps/backend/dist/generated

# --- Frontend (standalone includes its own deps) ---
COPY --from=frontend-builder /app/apps/frontend/.next/standalone ./
COPY --from=frontend-builder /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=frontend-builder /app/apps/frontend/public ./apps/frontend/public

COPY start.sh ./
RUN chmod +x start.sh
RUN mkdir -p /app/apps/backend/uploads && chown -R appuser:nodejs /app

USER appuser
EXPOSE 10000
CMD ["./start.sh"]
