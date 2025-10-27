#!/usr/bin/env bash
set -euo pipefail

# KnowFlow 快速部署脚本 - 适用于国内云服务器
# 包含：克隆仓库、配置环境、Docker 部署

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   KnowFlow 快速部署 - 一键安装                            ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# 配置变量
REPO_URL="https://github.com/cklxx/KnowFlow.git"
INSTALL_DIR="$HOME/KnowFlow"
LLM_API_BASE="${LLM_API_BASE:-https://ark.cn-beijing.volces.com/api/v3}"
LLM_MODEL="${LLM_MODEL:-ep-20250617155129-hfzl9}"
LLM_MAX_TOKENS="${LLM_MAX_TOKENS:-12288}"

# Read API key from environment or prompt the user securely
if [ -z "${LLM_API_KEY:-}" ]; then
    echo "🔐 检测到未配置 LLM_API_KEY"
    read -rsp "请输入火山引擎（或兼容 OpenAI）API Key: " LLM_API_KEY
    echo
fi

if [ -z "${LLM_API_KEY:-}" ]; then
    echo "❌ 未提供 API Key，部署终止"
    exit 1
fi

# 检查依赖
echo "📋 检查系统依赖..."

if ! command -v git &> /dev/null; then
    echo "❌ Git 未安装。请先安装 Git："
    echo "   Ubuntu/Debian: sudo apt-get install git"
    echo "   CentOS/RHEL:   sudo yum install git"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装。请先安装 Docker："
    echo "   https://docs.docker.com/engine/install/"
    exit 1
fi

echo "✅ 所有依赖已就绪"
echo ""

# 克隆仓库
if [ -d "$INSTALL_DIR" ]; then
    echo "⚠️  目录 $INSTALL_DIR 已存在"
    read -p "是否删除并重新克隆？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  删除旧目录..."
        rm -rf "$INSTALL_DIR"
    else
        echo "📂 使用现有目录"
        cd "$INSTALL_DIR"
        echo "🔄 拉取最新代码..."
        git pull origin main || true
    fi
fi

if [ ! -d "$INSTALL_DIR" ]; then
    echo "📦 克隆仓库..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
echo "✅ 仓库准备完成"
echo ""

# 创建 .env 文件
FRONTEND_API_BASE="${VITE_API_BASE_URL:-http://localhost:3000}"

echo "⚙️  配置环境变量..."
cat > .env <<EOF
# KnowFlow Docker 环境变量
# 自动生成时间: $(date)

# ===== Backend Configuration =====

# LLM Provider: "remote" (OpenAI-compatible) or "ollama" (local)
LLM_PROVIDER=remote

# LLM Request Timeout (seconds)
LLM_TIMEOUT_SECS=30

# Remote LLM API Configuration (火山引擎 Doubao)
LLM_API_BASE=$LLM_API_BASE
LLM_MODEL=$LLM_MODEL
LLM_API_KEY=$LLM_API_KEY
LLM_MAX_TOKENS=$LLM_MAX_TOKENS

# ===== Frontend Configuration =====

# API Base URL for the bundled frontend
VITE_API_BASE_URL=$FRONTEND_API_BASE
EOF

echo "✅ 环境变量已配置"
echo ""

# 显示配置
echo "📋 当前配置："
echo "   LLM Provider: remote (火山引擎豆包)"
echo "   API Base:     $LLM_API_BASE"
echo "   Model:        $LLM_MODEL"
echo "   Max Tokens:   $LLM_MAX_TOKENS"
echo ""

# Docker 资源名称
NETWORK_NAME="knowflow-net"
BACKEND_IMAGE="knowflow-backend:latest"
FRONTEND_IMAGE="knowflow-frontend:latest"
BACKEND_CONTAINER="knowflow-backend"
FRONTEND_CONTAINER="knowflow-frontend"
BACKEND_VOLUME="knowflow-backend-data"

# 创建网络和数据卷
echo "🌐 准备 Docker 网络与数据卷..."
if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    docker network create "$NETWORK_NAME"
fi
docker volume create "$BACKEND_VOLUME" >/dev/null 2>&1

# 停止旧容器
echo "🛑 停止现有容器（如有）..."
docker rm -f "$FRONTEND_CONTAINER" >/dev/null 2>&1 || true
docker rm -f "$BACKEND_CONTAINER" >/dev/null 2>&1 || true
echo ""

# 构建镜像
echo "🏗️  构建 Docker 镜像..."
echo "   (首次构建可能需要 5-10 分钟，请耐心等待)"
docker build -t "$BACKEND_IMAGE" -f backend/Dockerfile .
docker build -t "$FRONTEND_IMAGE" --build-arg VITE_API_BASE_URL="$FRONTEND_API_BASE" frontend

echo ""
echo "🚀 启动服务..."
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
echo "⏳ 等待服务启动..."
sleep 5

# 健康检查
MAX_RETRIES=30
RETRY_COUNT=0

echo -n "   检查后端服务"
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
        echo " ✅"
        break
    fi
    echo -n "."
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo " ❌"
    echo ""
    echo "❌ 后端服务启动失败，查看日志："
    docker logs "$BACKEND_CONTAINER"
    exit 1
fi

RETRY_COUNT=0
echo -n "   检查前端服务"
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://localhost:8080 > /dev/null 2>&1; then
        echo " ✅"
        break
    fi
    echo -n "."
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo " ❌"
    echo ""
    echo "❌ 前端服务启动失败，查看日志："
    docker logs "$FRONTEND_CONTAINER"
    exit 1
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   🎉 KnowFlow 部署成功！                                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "📱 应用访问地址："
echo "   前端: http://localhost:8080"
echo "   后端: http://localhost:3000"
echo ""

# 获取服务器 IP
SERVER_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "YOUR_SERVER_IP")
if [ "$SERVER_IP" != "YOUR_SERVER_IP" ]; then
    echo "🌐 外网访问地址（如果服务器有公网 IP）："
    echo "   前端: http://$SERVER_IP:8080"
    echo "   后端: http://$SERVER_IP:3000"
    echo ""
fi

echo "📊 常用管理命令："
echo "   查看日志:     cd $INSTALL_DIR && docker logs -f $BACKEND_CONTAINER"
echo "                  cd $INSTALL_DIR && docker logs -f $FRONTEND_CONTAINER"
echo "   停止服务:     cd $INSTALL_DIR && docker rm -f $FRONTEND_CONTAINER $BACKEND_CONTAINER"
echo "   重启服务:     cd $INSTALL_DIR && ./deploy.sh"
echo "   更新代码:     cd $INSTALL_DIR && git pull && ./deploy.sh"
echo ""
echo "📖 详细文档: $INSTALL_DIR/DEPLOYMENT.md"
echo ""
