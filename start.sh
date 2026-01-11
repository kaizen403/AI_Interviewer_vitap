#!/bin/bash
# Start script for Heroku buildpack deployment
# Simple and direct - no Docker complexity

echo "🚀 Starting Capstone Reviewer..."

BACKEND_PORT=10000
FRONTEND_PORT=${PORT:-3000}

echo "📦 Backend: port $BACKEND_PORT"
echo "🌐 Frontend: port $FRONTEND_PORT"

# Apply database migrations
echo "📊 Applying database migrations..."
cd apps/backend
npx prisma migrate deploy || echo "⚠️ Migration failed, continuing..."

# Start backend API
echo "📦 Starting Backend API..."
PORT=$BACKEND_PORT node dist/index.js &
BACKEND_PID=$!

# Wait for backend
echo "⏳ Waiting for backend..."
sleep 5

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend crashed!"
    exit 1
fi
echo "✅ Backend started"

# Start voice agent
echo "🎤 Starting Voice Agent..."
node dist/agent/voice-agent-router.js start &
VOICE_PID=$!

# Start frontend
echo "🌐 Starting Frontend..."
cd ../frontend
HOSTNAME="0.0.0.0" PORT=$FRONTEND_PORT INTERNAL_BACKEND_URL="http://localhost:$BACKEND_PORT" node server.js &
FRONTEND_PID=$!

echo "✅ All services started!"
echo "   Backend: $BACKEND_PID"
echo "   Voice: $VOICE_PID"  
echo "   Frontend: $FRONTEND_PID"

# Keep running
wait -n
exit $?
