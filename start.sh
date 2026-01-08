#!/bin/bash
# Start script for combined service

echo "🚀 Starting Capstone Reviewer..."

# Start backend API in background
echo "📦 Starting Backend API on port 10000..."
cd /app/apps/backend
node dist/index.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start voice agent in background
echo "🎤 Starting Voice Agent..."
node dist/agent/voice-agent-router.js start &
VOICE_PID=$!

# Start frontend (Next.js will use port from env or default)
echo "🌐 Starting Frontend..."
cd /app/apps/frontend
node_modules/.bin/next start -p ${FRONTEND_PORT:-3000} &
FRONTEND_PID=$!

echo "✅ All services started!"
echo "   Backend PID: $BACKEND_PID"
echo "   Voice Agent PID: $VOICE_PID"
echo "   Frontend PID: $FRONTEND_PID"

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
