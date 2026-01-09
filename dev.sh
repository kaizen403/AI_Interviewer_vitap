#!/bin/bash
# Development startup script

echo "🚀 Starting Capstone Reviewer (Dev Mode)"

# Start PostgreSQL
echo "📦 Starting PostgreSQL with pgvector..."
docker-compose up -d postgres

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL..."
sleep 5

# Run migrations
echo "🔄 Running migrations..."
cd apps/backend
DATABASE_URL="postgresql://capstone:capstone123@localhost:5433/capstone_reviewer" pnpm prisma migrate deploy
cd ../..

# Start backend
echo "🖥️  Starting backend..."
cd apps/backend
NODE_ENV=development pnpm dev &
BACKEND_PID=$!
cd ../..

# Wait for backend
sleep 3

# Start frontend
echo "🌐 Starting frontend..."
cd apps/frontend
pnpm dev &
FRONTEND_PID=$!
cd ../..

echo ""
echo "✅ Services running:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3040"
echo "   LiveKit:  wss://aiscreener-nty8rvyj.livekit.cloud (Cloud)"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
wait
