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

DOCKER_COMPOSE=""
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
fi

if [ -z "$DOCKER_COMPOSE" ]; then
    echo "❌ Docker Compose 未安装。请先安装 Docker Compose："
    echo "   https://docs.docker.com/compose/install/"
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
echo "⚙️  配置环境变量..."
cat > .env <<EOF
# KnowFlow Docker Compose 环境变量
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

# API Base URL for frontend (leave as default for Docker internal network)
# VITE_API_BASE_URL=http://backend:3000
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

# 停止旧容器
echo "🛑 停止现有容器（如有）..."
$DOCKER_COMPOSE down 2>/dev/null || true
echo ""

# 构建并启动
echo "🏗️  构建 Docker 镜像..."
echo "   (首次构建可能需要 5-10 分钟，请耐心等待)"
$DOCKER_COMPOSE build

echo ""
echo "🚀 启动服务..."
$DOCKER_COMPOSE up -d

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
    $DOCKER_COMPOSE logs backend
    exit 1
fi

RETRY_COUNT=0
echo -n "   检查前端服务"
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://localhost > /dev/null 2>&1; then
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
    $DOCKER_COMPOSE logs frontend
    exit 1
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   🎉 KnowFlow 部署成功！                                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "📱 应用访问地址："
echo "   前端: http://localhost"
echo "   后端: http://localhost:3000"
echo ""

# 获取服务器 IP
SERVER_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "YOUR_SERVER_IP")
if [ "$SERVER_IP" != "YOUR_SERVER_IP" ]; then
    echo "🌐 外网访问地址（如果服务器有公网 IP）："
    echo "   前端: http://$SERVER_IP"
    echo "   后端: http://$SERVER_IP:3000"
    echo ""
fi

echo "📊 常用管理命令："
echo "   查看日志:     cd $INSTALL_DIR && $DOCKER_COMPOSE logs -f"
echo "   停止服务:     cd $INSTALL_DIR && docker compose down"
echo "   重启服务:     cd $INSTALL_DIR && docker compose restart"
echo "   更新代码:     cd $INSTALL_DIR && git pull && docker compose up --build -d"
echo ""
echo "📖 详细文档: $INSTALL_DIR/DEPLOYMENT.md"
echo ""
