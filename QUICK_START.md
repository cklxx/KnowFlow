# KnowFlow 一键部署命令

## 🚀 国内云服务器一键部署

### 方式 1: 单条命令（YOUR_LLM_API_KEY + quick-deploy.sh）

1. 准备好火山引擎（或兼容 OpenAI）API Key。
2. 在服务器上执行以下单条命令：

```bash
git clone https://github.com/cklxx/KnowFlow.git \
  && cd KnowFlow \
  && LLM_API_KEY=YOUR_LLM_API_KEY ./quick-deploy.sh
```

将命令中的 `YOUR_LLM_API_KEY` 替换成你的真实密钥即可。脚本会自动：
- ✅ 创建或更新 `.env`
- ✅ 写入必需的 LLM 配置
- ✅ 构建并启动 Docker 服务

> 如需自定义部署目录或模型，可在命令前加入环境变量，例如：
> `git clone https://github.com/cklxx/KnowFlow.git /data/knowflow && cd /data/knowflow && INSTALL_DIR=/data/knowflow LLM_MODEL=xxx LLM_API_KEY=... ./quick-deploy.sh`

---

### 方式 2: 下载脚本后执行

如果您的服务器无法直接访问 GitHub raw 内容，可以使用以下方法：

```bash
# 1. 克隆仓库
git clone https://github.com/cklxx/KnowFlow.git
cd KnowFlow

# 2. 设置环境变量并运行快速部署脚本（脚本会提示输入 API Key）
export LLM_API_KEY=YOUR_LLM_API_KEY  # 可提前设置，也可以在脚本提示时输入
./quick-deploy.sh
```

---

### 方式 3: 手动分步部署

```bash
# 1. 克隆仓库
git clone https://github.com/cklxx/KnowFlow.git
cd KnowFlow

# 2. 创建环境变量文件
cat > .env <<'EOF'
LLM_PROVIDER=remote
LLM_TIMEOUT_SECS=30
LLM_API_BASE=https://ark.cn-beijing.volces.com/api/v3
LLM_MODEL=ep-20250617155129-hfzl9
LLM_API_KEY=YOUR_LLM_API_KEY
LLM_MAX_TOKENS=12288
EOF

# 3. 构建生产镜像
docker build -t knowflow-backend:latest -f backend/Dockerfile .
docker build -t knowflow-frontend:latest --build-arg VITE_API_BASE_URL=http://localhost:3000 frontend

# 4. 准备 Docker 资源
docker network create knowflow-net || true
docker volume create knowflow-backend-data

# 5. 启动服务
docker run -d \
  --name knowflow-backend \
  --network knowflow-net \
  --restart unless-stopped \
  --env-file .env \
  -e BIND_ADDRESS=0.0.0.0:3000 \
  -e DATABASE_URL=sqlite:///data/knowflow.db \
  -v knowflow-backend-data:/data \
  -p 3000:3000 \
  knowflow-backend:latest

docker run -d \
  --name knowflow-frontend \
  --network knowflow-net \
  --restart unless-stopped \
  -p 8080:80 \
  knowflow-frontend:latest

# 6. 查看状态
docker ps --filter "name=knowflow"
docker logs -f knowflow-backend
```

---

## 📱 访问应用

部署成功后，访问以下地址：

- **前端应用**: http://YOUR_SERVER_IP:8080
- **后端 API**: http://YOUR_SERVER_IP:3000
- **健康检查**: http://YOUR_SERVER_IP:3000/health

将 `YOUR_SERVER_IP` 替换为您服务器的实际 IP 地址。

---

## 🔥 部署完成时间

- **首次部署**: 约 5-10 分钟（取决于网络速度和服务器性能）
- **后续更新**: 约 2-3 分钟

---

## 📊 常用管理命令

```bash
# 进入项目目录
cd ~/KnowFlow

# 查看实时日志
docker logs -f knowflow-backend
docker logs -f knowflow-frontend

# 查看服务状态
docker ps --filter "name=knowflow"

# 重启服务
docker restart knowflow-backend
docker restart knowflow-frontend

# 停止服务
docker rm -f knowflow-frontend knowflow-backend

# 更新代码并重新部署
git pull origin main
./deploy.sh

# 完全清理并重建
docker rm -f knowflow-frontend knowflow-backend
docker volume rm knowflow-backend-data
./deploy.sh
```

---

## 🛠️ 系统要求

### 最低配置
- **CPU**: 1 核
- **内存**: 2GB
- **磁盘**: 10GB
- **操作系统**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+

### 推荐配置
- **CPU**: 2 核+
- **内存**: 4GB+
- **磁盘**: 20GB+
- **操作系统**: Ubuntu 22.04 LTS

### 必需软件
- **Docker**: 20.10+
- **Git**: 2.0+

---

## 📦 安装 Docker（如果未安装）

### Ubuntu/Debian

```bash
# 更新包索引
sudo apt-get update

# 安装依赖
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# 添加 Docker 官方 GPG 密钥
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 设置仓库
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录以使组权限生效
newgrp docker

# 验证安装
docker --version
```

### CentOS/RHEL

```bash
# 安装必需的包
sudo yum install -y yum-utils

# 设置仓库
sudo yum-config-manager \
    --add-repo \
    https://download.docker.com/linux/centos/docker-ce.repo

# 安装 Docker Engine
sudo yum install -y docker-ce docker-ce-cli containerd.io

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录
newgrp docker

# 验证安装
docker --version
```

---

## 🔒 防火墙配置

如果您的服务器启用了防火墙，需要开放以下端口：

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 8080/tcp  # 前端
sudo ufw allow 3000/tcp  # 后端 API

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

---

## 🌐 配置域名（可选）

如果您有域名，可以配置 Nginx 反向代理：

```nginx
# /etc/nginx/sites-available/knowflow
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/knowflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## ❓ 常见问题

### Q1: 端口已被占用怎么办？

```bash
# 查找占用端口的进程
sudo lsof -i :8080
sudo lsof -i :3000

# 修改 deploy.sh 或 quick-deploy.sh 中的端口映射
vim deploy.sh  # 或 quick-deploy.sh
# 将 "-p 8080:80" 或 "-p 80:80" 修改为新的前端端口，例如 "-p 8090:80"
# 将 "-p 3000:3000" 修改为新的后端端口，例如 "-p 3001:3000"

# 保存后重新部署
./deploy.sh
```

### Q2: 服务启动失败怎么办？

```bash
# 查看详细日志
docker logs knowflow-backend
docker logs knowflow-frontend

# 重新构建
docker rm -f knowflow-frontend knowflow-backend
docker build -t knowflow-backend:latest -f backend/Dockerfile .
docker build -t knowflow-frontend:latest --build-arg VITE_API_BASE_URL=http://localhost:3000 frontend
./deploy.sh
```

### Q3: 如何更新到最新版本？

```bash
cd ~/KnowFlow
git pull origin main
./deploy.sh
```

### Q4: 如何修改 API 配置？

```bash
# 编辑环境变量
vim .env

# 重启服务
./deploy.sh
```

---

## 📞 获取帮助

- **文档**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **问题**: [GitHub Issues](https://github.com/cklxx/KnowFlow/issues)
- **主页**: [README.md](README.md)

---

**部署愉快！🎉**
