#!/usr/bin/env bash
set -euo pipefail

# KnowFlow One-Click Docker Deployment Script
# This script builds and deploys the entire KnowFlow stack using Docker Compose

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   KnowFlow Docker Deployment                              ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file from template"
        echo ""
        echo "⚠️  IMPORTANT: Please edit .env and configure your LLM API credentials:"
        echo "   - LLM_API_KEY (required for AI features)"
        echo "   - LLM_API_BASE (if using custom endpoint)"
        echo "   - LLM_MODEL (if using different model)"
        echo ""
        read -p "Press Enter to continue after configuring .env, or Ctrl+C to exit..."
    else
        echo "❌ Error: .env.example not found. Cannot create .env"
        exit 1
    fi
fi

echo "📋 Checking environment configuration..."
if grep -q "your-api-key-here" .env 2>/dev/null; then
    echo ""
    echo "⚠️  WARNING: Default API key detected in .env"
    echo "   LLM features will not work without valid credentials."
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled. Please configure .env with valid credentials."
        exit 1
    fi
fi

echo ""
echo "🔧 Stopping existing containers (if any)..."
docker compose down 2>/dev/null || true

echo ""
echo "🏗️  Building Docker images..."
echo "   This may take a few minutes on first run..."
docker compose build

echo ""
echo "🚀 Starting services..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 3

# Check if backend is healthy
MAX_RETRIES=30
RETRY_COUNT=0
echo -n "   Checking backend health"
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
        echo " ✅"
        break
    fi
    echo -n "."
    sleep 1
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo " ❌"
    echo ""
    echo "❌ Backend failed to start. Check logs with:"
    echo "   docker compose logs backend"
    exit 1
fi

# Check if frontend is accessible
echo -n "   Checking frontend"
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://localhost:8080 > /dev/null 2>&1; then
        echo " ✅"
        break
    fi
    echo -n "."
    sleep 1
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo " ❌"
    echo ""
    echo "❌ Frontend failed to start. Check logs with:"
    echo "   docker compose logs frontend"
    exit 1
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   🎉 KnowFlow is now running!                             ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "📱 Frontend:  http://localhost:8080"
echo "🔌 Backend:   http://localhost:3000"
echo "💚 Health:    http://localhost:3000/health"
echo ""
echo "📊 View logs:        docker compose logs -f"
echo "🛑 Stop services:    docker compose down"
echo "🔄 Restart:          docker compose restart"
echo "🗑️  Clean up:        docker compose down -v"
echo ""
echo "📖 For more information, see README.md"
echo ""
