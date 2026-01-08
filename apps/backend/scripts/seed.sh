#!/bin/bash

# Seed Demo Interviews Script
# Run this to populate MongoDB with demo interview data

echo "🌱 Seeding demo interview data..."
echo ""

# Navigate to backend directory
cd "$(dirname "$0")/.."

# Check if MongoDB is running
if ! command -v mongosh &> /dev/null; then
    echo "⚠️  mongosh not found. Make sure MongoDB is installed."
    echo "   Install: brew install mongodb-community"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Run the seed script
echo "🚀 Running seed script..."
npx tsx scripts/seed-interviews.ts

echo ""
echo "Done! You can now test the frontend with the generated links."
