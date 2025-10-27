# KnowFlow 一键部署命令

## 🚀 国内云服务器一键部署

### 方式 1: 单条命令（最快）

复制粘贴以下命令到您的服务器终端，一键完成所有部署：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/cklxx/KnowFlow/main/quick-deploy.sh)
```

**该命令会自动完成：**
- ✅ 检查系统依赖（Git、Docker、Docker Compose）
- ✅ 克隆 KnowFlow 仓库
- ✅ 配置环境变量（火山引擎豆包 API）
- ✅ 构建 Docker 镜像
- ✅ 启动所有服务
- ✅ 健康检查验证
- ✅ 显示访问地址

**前置要求：**
- 已安装 Docker 和 Docker Compose
- 服务器可访问 GitHub

---

### 方式 2: 下载脚本后执行

如果您的服务器无法直接访问 GitHub raw 内容，可以使用以下方法：

```bash
# 1. 克隆仓库
git clone https://github.com/cklxx/KnowFlow.git
cd KnowFlow

# 2. 运行快速部署脚本
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
LLM_API_KEY=c3d86f5e-2861-4eff-b05c-cb2e9fa04f42
LLM_MAX_TOKENS=12288
EOF

# 3. 构建并启动
docker compose up --build -d

# 4. 查看状态
docker compose ps
docker compose logs -f
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
docker compose logs -f

# 查看服务状态
docker compose ps

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 更新代码并重新部署
git pull origin main
docker compose up --build -d

# 完全清理并重建
docker compose down -v
docker compose up --build -d
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
- **Docker Compose**: 2.0+
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
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录以使组权限生效
newgrp docker

# 验证安装
docker --version
docker compose version
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
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录
newgrp docker

# 验证安装
docker --version
docker compose version
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

# 修改 docker-compose.yml 中的端口映射
vim docker-compose.yml
# 将 "8080:80" 改为 "8090:80"
# 将 "3000:3000" 改为 "3001:3000"
```

### Q2: 服务启动失败怎么办？

```bash
# 查看详细日志
docker compose logs backend
docker compose logs frontend

# 重新构建
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Q3: 如何更新到最新版本？

```bash
cd ~/KnowFlow
git pull origin main
docker compose down
docker compose up --build -d
```

### Q4: 如何修改 API 配置？

```bash
# 编辑环境变量
vim .env

# 重启服务
docker compose restart backend
```

---

## 📞 获取帮助

- **文档**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **问题**: [GitHub Issues](https://github.com/cklxx/KnowFlow/issues)
- **主页**: [README.md](README.md)

---

**部署愉快！🎉**
