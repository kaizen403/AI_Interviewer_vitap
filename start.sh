#!/bin/bash
# Start script for Docker on Heroku

echo "🚀 Starting Capstone Reviewer..."

BACKEND_PORT=10000
FRONTEND_PORT=${PORT:-3000}

echo "📦 Backend: port $BACKEND_PORT"
echo "🌐 Frontend: port $FRONTEND_PORT"

# Apply database migrations
echo "📊 Applying database migrations..."
cd /app/apps/backend
npx prisma migrate deploy --schema=prisma/schema.prisma || echo "⚠️ Migration failed, continuing..."

# Start backend API
echo "📦 Starting Backend API..."
PORT=$BACKEND_PORT node dist/index.js &
BACKEND_PID=$!

# Wait for backend
sleep 5

# Download voice models and start voice agent
echo "🎤 Starting Voice Agent..."
node dist/agent/voice-agent-router.js download-files || echo "⚠️ Download failed"
node dist/agent/voice-agent-router.js start &
VOICE_PID=$!

# Start frontend
echo "🌐 Starting Frontend..."
cd /app/apps/frontend
HOSTNAME="0.0.0.0" PORT=$FRONTEND_PORT INTERNAL_BACKEND_URL="http://localhost:$BACKEND_PORT" node server.js &
FRONTEND_PID=$!

echo "✅ All services started!"

# Keep running
wait -n
exit $?
