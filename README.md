# Capstone Reviewer

AI-powered capstone project presentation review system.

## System Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                             │
│                                                                             │
│   Student Auth → PPT Upload → Review Session (LiveKit) → Results Page       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Express)                              │
│                                                                             │
│   REST API                           Voice Agent (LiveKit)                  │
│   ├── /api/students                  ├── Deepgram STT                       │
│   ├── /api/project-review            ├── Fireworks LLM (LangGraph)          │
│   └── /api/livekit                   └── Cartesia TTS                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              ┌──────────┐     ┌───────────┐     ┌───────────┐
              │PostgreSQL│     │ LiveKit   │     │   R2      │
              │(Prisma)  │     │ Cloud     │     │ (Storage) │
              └──────────┘     └───────────┘     └───────────┘
```

### Data Flow

1. Student registers with VIT email, logs in
2. Creates project review, uploads PPT
3. PPT stored in Cloudflare R2, content extracted for RAG
4. Student joins LiveKit room, AI agent connects
5. Agent uses LangGraph workflow: greet → ask questions → evaluate → summarize
6. Review results saved to database

## Quick Start

### Prerequisites

- Node.js 22.x (Prisma does not support Node 26)
- pnpm 10
- Docker

### Setup

```bash
# Clone and install
git clone <repo>
cd capstone_reviewer_v2
# If `node -v` is 26+, use Node 22 first:
#   export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
pnpm install

# Start PostgreSQL (pgvector), LiveKit, and Redis
docker compose up -d

# Setup backend
cd apps/backend
cp .env.example .env
# Fill in API keys (Fireworks, Deepgram, Cartesia)
# Frontend: cp apps/frontend/.env.example apps/frontend/.env.local
pnpm prisma migrate dev
pnpm prisma generate
pnpm agent:download

# Start all services
cd ../..
pnpm dev
```

Frontend: http://localhost:3050  
Backend: http://localhost:3040

### Environment Variables

| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string |
| LIVEKIT_API_KEY | LiveKit API key |
| LIVEKIT_API_SECRET | LiveKit API secret |
| LIVEKIT_URL | LiveKit WebSocket URL |
| FIREWORKS_API_KEY | Fireworks API key |
| DEEPGRAM_API_KEY | Deepgram API key |
| CARTESIA_API_KEY | Cartesia API key |
| R2_ACCESS_KEY_ID | Cloudflare R2 access key |
| R2_SECRET_ACCESS_KEY | Cloudflare R2 secret |
| R2_PUBLIC_URL | R2 public bucket URL |

## Deploy

Uses `render.yaml` for Render deployment. Push to GitHub and connect as Blueprint.

## License

MIT
