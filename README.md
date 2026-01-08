# Capstone Reviewer

AI-powered project presentation review system for VIT AP students.

## Features

- 🎓 Student authentication with VIT AP email validation
- 📊 PPT upload and content extraction
- 🎤 Real-time voice-based AI interview
- 🤖 Intelligent questioning based on presentation content
- 📝 Review summary and feedback

## Tech Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **AI/ML**: OpenAI GPT-4o, LangChain, LiveKit Voice Agents
- **Voice**: Deepgram STT, Cartesia TTS, Silero VAD

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (for PostgreSQL)
- LiveKit Server (local or cloud)

### Setup

1. Clone and install:
```bash
git clone <repo>
cd capstone_reviewer_v2
pnpm install
```

2. Start PostgreSQL:
```bash
docker compose up -d
```

3. Setup database:
```bash
cd apps/backend
cp .env.example .env
# Edit .env with your API keys
pnpm prisma migrate dev
pnpm prisma generate
```

4. Download voice models:
```bash
pnpm agent:download
```

5. Start development:
```bash
cd ../..
pnpm dev
```

- Frontend: http://localhost:3050
- Backend: http://localhost:3040

## Deploy to Render

### Using Blueprint

1. Push to GitHub
2. Go to Render Dashboard → New → Blueprint
3. Connect your repo
4. Select `render.yaml`
5. Configure environment variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL` - LiveKit Cloud
   - `OPENAI_API_KEY` - OpenAI
   - `DEEPGRAM_API_KEY` - Deepgram
   - `CARTESIA_API_KEY` - Cartesia

### Services Created

| Service | Type | Description |
|---------|------|-------------|
| `capstone-reviewer-api` | Web | Express API server |
| `capstone-reviewer-voice-agent` | Worker | LiveKit Voice Agent |
| `capstone-reviewer-frontend` | Web | Next.js frontend |

### Required External Services

1. **LiveKit Cloud** (https://cloud.livekit.io)
   - Create a project
   - Get API key and secret
   - Use the WebSocket URL

2. **PostgreSQL** 
   - Render PostgreSQL or external (Neon, Supabase)

3. **OpenAI** (https://platform.openai.com)
   - API key for GPT-4o

4. **Deepgram** (https://console.deepgram.com)
   - API key for speech-to-text

5. **Cartesia** (https://play.cartesia.ai)
   - API key for text-to-speech

## Project Structure

```
capstone_reviewer_v2/
├── apps/
│   ├── backend/          # Express API + Voice Agent
│   │   ├── src/
│   │   │   ├── agent/    # LiveKit Voice Agents
│   │   │   ├── controllers/
│   │   │   ├── routes/
│   │   │   └── config/
│   │   └── prisma/       # Database schema
│   └── frontend/         # Next.js App
│       ├── app/          # Pages
│       ├── components/   # React components
│       └── lib/          # Utilities
├── render.yaml           # Render deployment blueprint
└── docker-compose.yml    # Local PostgreSQL
```

## License

MIT
