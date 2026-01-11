#!/bin/bash
# Start script for combined service (Heroku compatible)
# Uses Next.js standalone output

set -e  # Exit on first error

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

# Start backend API
echo "📦 Starting Backend API..."
PORT=$BACKEND_PORT node dist/index.js &
BACKEND_PID=$!

# Wait for backend to be ready (check if process is still running and port is open)
echo "⏳ Waiting for backend to start..."
for i in {1..30}; do
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "❌ Backend crashed during startup!"
        exit 1
    fi
    if curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    sleep 1
done

# Download voice agent model files (needs env vars, so run at runtime)
echo "📥 Downloading voice agent models..."
node dist/agent/voice-agent-router.js download-files || echo "⚠️ Model download failed, continuing..."

# Start voice agent in background
echo "🎤 Starting Voice Agent..."
node dist/agent/voice-agent-router.js start &
VOICE_PID=$!

# Start frontend using standalone server
echo "🌐 Starting Frontend on port $FRONTEND_PORT..."
cd /app/apps/frontend

# Next.js standalone server - set env vars
export HOSTNAME="0.0.0.0"
export PORT=$FRONTEND_PORT
export INTERNAL_BACKEND_URL="http://localhost:$BACKEND_PORT"

node server.js &
FRONTEND_PID=$!

echo "✅ All services started!"
echo "   Backend PID: $BACKEND_PID (port $BACKEND_PORT)"
echo "   Voice Agent PID: $VOICE_PID"
echo "   Frontend PID: $FRONTEND_PID (port $FRONTEND_PORT)"

# Keep the script running and monitor processes
while true; do
    # Check if backend is still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "❌ Backend process died!"
        exit 1
    fi
    # Check if frontend is still running
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "❌ Frontend process died!"
        exit 1
    fi
    sleep 10
done
