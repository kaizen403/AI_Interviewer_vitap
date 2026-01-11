#!/bin/bash
# Start script for combined service (Heroku compatible)
# Uses Next.js standalone output

echo "🚀 Starting Capstone Reviewer..."

# Heroku provides $PORT - run Next.js frontend on it
# Backend runs on internal port 10000
BACKEND_PORT=10000
FRONTEND_PORT=${PORT:-3000}

echo "📦 Backend will run on internal port $BACKEND_PORT"
echo "🌐 Frontend will run on port $FRONTEND_PORT (Heroku's $PORT)"

# Apply database migrations
echo "📊 Applying database migrations..."
cd /app/apps/backend
npx prisma migrate deploy || echo "⚠️ Migration failed, continuing..."

# Start backend API in background
echo "📦 Starting Backend API..."
PORT=$BACKEND_PORT node dist/index.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Download voice agent model files (needs env vars, so run at runtime)
echo "📥 Downloading voice agent models..."
node dist/agent/voice-agent-router.js download-files || echo "⚠️ Model download failed, continuing..."

# Start voice agent in background
echo "🎤 Starting Voice Agent..."
node dist/agent/voice-agent-router.js start &
VOICE_PID=$!

# Start frontend using standalone server
echo "🌐 Starting Frontend on port $FRONTEND_PORT..."
cd /app

# Next.js standalone server - set env vars
export HOSTNAME="0.0.0.0"
export PORT=$FRONTEND_PORT
export INTERNAL_BACKEND_URL="http://localhost:$BACKEND_PORT"

# Run the standalone server
# In standalone mode with monorepo, server.js is at apps/frontend/server.js
cd /app/apps/frontend
node server.js &
FRONTEND_PID=$!

echo "✅ All services started!"
echo "   Backend PID: $BACKEND_PID (port $BACKEND_PORT)"
echo "   Voice Agent PID: $VOICE_PID"
echo "   Frontend PID: $FRONTEND_PID (port $FRONTEND_PORT)"

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
