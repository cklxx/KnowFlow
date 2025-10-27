#!/usr/bin/env bash
set -euo pipefail

# KnowFlow One-Click Docker Deployment Script
# This script builds and deploys the entire KnowFlow stack using plain Docker commands

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/engine/install/"
    exit 1
fi

FRONTEND_API_BASE=$(grep -E '^VITE_API_BASE_URL=' .env | tail -n 1 | cut -d'=' -f2-)
if [ -z "$FRONTEND_API_BASE" ]; then
    FRONTEND_API_BASE="http://localhost:3000"
fi

NETWORK_NAME="knowflow-net"
BACKEND_IMAGE="knowflow-backend:latest"
FRONTEND_IMAGE="knowflow-frontend:latest"
BACKEND_CONTAINER="knowflow-backend"
FRONTEND_CONTAINER="knowflow-frontend"
BACKEND_VOLUME="knowflow-backend-data"

echo ""
echo "🌐 Preparing Docker network and volume..."
if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    docker network create "$NETWORK_NAME"
fi
docker volume create "$BACKEND_VOLUME" >/dev/null 2>&1

echo ""
echo "🔧 Stopping existing containers (if any)..."
docker rm -f "$FRONTEND_CONTAINER" >/dev/null 2>&1 || true
docker rm -f "$BACKEND_CONTAINER" >/dev/null 2>&1 || true

echo ""
echo "🏗️  Building Docker images..."
echo "   This may take a few minutes on first run..."
docker build -t "$BACKEND_IMAGE" -f backend/Dockerfile .
docker build -t "$FRONTEND_IMAGE" --build-arg VITE_API_BASE_URL="$FRONTEND_API_BASE" frontend

echo ""
echo "🚀 Starting services..."
docker run -d \
    --name "$BACKEND_CONTAINER" \
    --network "$NETWORK_NAME" \
    --restart unless-stopped \
    --env-file .env \
    -e BIND_ADDRESS=0.0.0.0:3000 \
    -e DATABASE_URL=sqlite:///data/knowflow.db \
    -v "$BACKEND_VOLUME":/data \
    -p 3000:3000 \
    "$BACKEND_IMAGE"

docker run -d \
    --name "$FRONTEND_CONTAINER" \
    --network "$NETWORK_NAME" \
    --restart unless-stopped \
    -p 8080:80 \
    "$FRONTEND_IMAGE"

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
    echo "   docker logs $BACKEND_CONTAINER"
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
    echo "   docker logs $FRONTEND_CONTAINER"
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
echo "📊 View logs:        docker logs -f $BACKEND_CONTAINER"
echo "                    docker logs -f $FRONTEND_CONTAINER"
echo "🛑 Stop services:    docker rm -f $FRONTEND_CONTAINER $BACKEND_CONTAINER"
echo "🔄 Restart:          ./deploy.sh"
echo "🗑️  Clean up:        docker rm -f $FRONTEND_CONTAINER $BACKEND_CONTAINER && docker volume rm $BACKEND_VOLUME"
echo ""
echo "📖 For more information, see README.md"
echo ""
