# KnowFlow 部署指南

本文档提供 KnowFlow 的详细部署说明，包括开发环境和生产环境。

## 目录

- [快速开始](#快速开始)
- [环境变量配置](#环境变量配置)
- [开发部署](#开发部署)
- [生产部署 (Docker)](#生产部署-docker)
- [故障排查](#故障排查)

---

## 快速开始

### 最快速的方式：Docker 一键部署

```bash
# 1. 克隆仓库
git clone https://github.com/yourusername/KnowFlow.git
cd KnowFlow

# 2. 配置环境变量（使用您的 LLM API 凭证）
cp .env.example .env
# 编辑 .env 文件，填入您的 API 密钥

# 3. 一键部署
./scripts/deploy.sh
```

部署完成后访问：
- **前端应用**: http://localhost:8080
- **后端 API**: http://localhost:3000

---

## 环境变量配置

KnowFlow 支持多种 LLM 提供商。您需要配置相应的环境变量。

### 项目根目录 `.env` (用于 Docker Compose)

```bash
# LLM 提供商配置
LLM_PROVIDER=remote          # "remote" 或 "ollama"
LLM_TIMEOUT_SECS=30          # 请求超时时间（秒）

# 远程 API 配置（OpenAI 兼容）
LLM_API_BASE=https://api.openai.com
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=your-api-key-here
LLM_MAX_TOKENS=4096
```

### 支持的 LLM 提供商

#### 1. OpenAI

```bash
LLM_PROVIDER=remote
LLM_API_BASE=https://api.openai.com
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=sk-...
```

#### 2. 火山引擎豆包 (Doubao)

```bash
LLM_PROVIDER=remote
LLM_API_BASE=https://ark.cn-beijing.volces.com/api/v3
LLM_MODEL=ep-20250617155129-hfzl9
LLM_API_KEY=your-doubao-api-key
LLM_MAX_TOKENS=12288
```

#### 3. 其他 OpenAI 兼容 API

```bash
LLM_PROVIDER=remote
LLM_API_BASE=https://your-api-endpoint.com/v1
LLM_MODEL=your-model-name
LLM_API_KEY=your-api-key
```

#### 4. 本地 Ollama

```bash
LLM_PROVIDER=ollama
OLLAMA_API_BASE=http://127.0.0.1:11434
OLLAMA_MODEL=llama3
OLLAMA_KEEP_ALIVE=30m
OLLAMA_TEMPERATURE=0.2
OLLAMA_TOP_P=0.95
```

---

## 开发部署

### 前置要求

- **Node.js** 18+ (用于前端)
- **Rust** 1.80+ (用于后端)
- **Cargo** (Rust 包管理器)

### 方式 1: 一键启动脚本（推荐）

```bash
# 同时启动前端和后端
./scripts/dev.sh
```

这会启动：
- 后端 API 服务器: http://localhost:3000
- 前端开发服务器: http://localhost:5173

### 方式 2: 分别启动

#### 启动后端

```bash
cd backend

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 运行后端
cargo run --package knowflow-api
```

后端将在 http://localhost:3000 启动。

#### 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端将在 http://localhost:5173 启动。

### 开发时的环境变量

**后端 `backend/.env`:**
```bash
DATABASE_URL=sqlite://./knowflow.db
LLM_PROVIDER=remote
LLM_API_BASE=https://ark.cn-beijing.volces.com/api/v3
LLM_MODEL=ep-20250617155129-hfzl9
LLM_API_KEY=your-api-key-here
LLM_MAX_TOKENS=12288
```

**前端 `frontend/.env`:**
```bash
# 开发时通常留空，使用 Vite 代理
VITE_API_BASE_URL=
```

---

## 生产部署 (Docker)

### 前置要求

- **Docker** 20.10+
- **Docker Compose** 2.0+

### 方式 1: 使用部署脚本（推荐）

```bash
# 1. 配置环境变量
cp .env.example .env
vim .env  # 编辑并填入您的 API 凭证

# 2. 运行部署脚本
./scripts/deploy.sh
```

部署脚本会自动：
- ✅ 检查 .env 配置
- ✅ 验证 API 密钥
- ✅ 构建 Docker 镜像
- ✅ 启动所有服务
- ✅ 健康检查
- ✅ 显示访问地址

### 方式 2: 手动 Docker Compose

```bash
# 1. 配置环境变量
cp .env.example .env
vim .env

# 2. 构建并启动
docker compose up --build -d

# 3. 查看日志
docker compose logs -f

# 4. 检查服务状态
docker compose ps

# 5. 停止服务
docker compose down
```

### Docker Compose 常用命令

```bash
# 启动服务（后台运行）
docker compose up -d

# 查看日志
docker compose logs -f
docker compose logs backend    # 只看后端日志
docker compose logs frontend   # 只看前端日志

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 停止并删除数据卷
docker compose down -v

# 重新构建镜像
docker compose build --no-cache

# 查看服务状态
docker compose ps
```

### 生产环境端口

- **前端 (Nginx)**: `0.0.0.0:8080`
- **后端 API**: `0.0.0.0:3000`

### 数据持久化

数据库文件存储在 Docker 卷中：
```yaml
volumes:
  backend-data:  # 包含 SQLite 数据库
```

要备份数据库：
```bash
# 查找卷的实际路径
docker volume inspect knowflow_backend-data

# 或者直接从容器中复制
docker compose exec backend cat /data/knowflow.db > backup.db
```

---

## 故障排查

### 问题 1: 后端启动失败

**症状**: `docker compose logs backend` 显示错误

**解决方案**:
```bash
# 检查环境变量是否正确配置
cat .env | grep LLM

# 检查 API 密钥是否有效
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://your-api-base/models

# 重新构建并启动
docker compose down
docker compose up --build
```

### 问题 2: 前端无法连接后端

**症状**: 前端显示网络错误

**解决方案**:
```bash
# 1. 检查后端是否运行
curl http://localhost:3000/health

# 2. 检查 Docker 网络
docker compose ps

# 3. 查看后端日志
docker compose logs backend

# 4. 检查防火墙设置
```

### 问题 3: LLM API 调用失败

**症状**: AI 功能不工作

**解决方案**:
```bash
# 1. 验证 API 密钥
echo $LLM_API_KEY

# 2. 测试 API 连接
curl -X POST https://your-api-base/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"test"}]}'

# 3. 检查后端日志中的详细错误
docker compose logs backend | grep -i error
```

### 问题 4: 数据库权限错误

**症状**: SQLite 数据库无法写入

**解决方案**:
```bash
# 1. 检查卷权限
docker compose exec backend ls -la /data

# 2. 重新创建卷
docker compose down -v
docker compose up -d

# 3. 手动创建数据库目录
docker compose exec backend mkdir -p /data
docker compose exec backend chmod 755 /data
```

### 问题 5: 端口已被占用

**症状**: `Error: bind: address already in use`

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :3000
lsof -i :8080

# 杀死占用端口的进程
kill -9 <PID>

# 或者修改 docker-compose.yml 中的端口映射
```

---

## 环境变量完整参考

### 后端环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `DATABASE_URL` | `sqlite://./knowflow.db` | 数据库连接字符串 |
| `BIND_ADDRESS` | `127.0.0.1:3000` | API 服务器绑定地址 |
| `LLM_PROVIDER` | `remote` | LLM 提供商类型 |
| `LLM_TIMEOUT_SECS` | `30` | LLM 请求超时时间 |
| `LLM_API_BASE` | `https://api.openai.com` | LLM API 端点 |
| `LLM_MODEL` | `gpt-4o-mini` | 使用的模型名称 |
| `LLM_API_KEY` | - | API 密钥（必需） |
| `LLM_MAX_TOKENS` | `4096` | 最大生成令牌数 |
| `OLLAMA_API_BASE` | `http://127.0.0.1:11434` | Ollama API 端点 |
| `OLLAMA_MODEL` | `llama3` | Ollama 模型名称 |

### 前端环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `VITE_API_BASE_URL` | - | 后端 API 基础 URL |

---

## 安全建议

1. **不要提交 `.env` 文件到版本控制**
   - 已在 `.gitignore` 中配置
   - 只提交 `.env.example` 模板

2. **生产环境使用强密钥**
   - 定期轮换 API 密钥
   - 使用环境变量管理敏感信息

3. **限制网络访问**
   - 在生产环境中配置防火墙
   - 只暴露必要的端口

4. **定期备份数据**
   ```bash
   # 自动备份脚本示例
   docker compose exec backend cat /data/knowflow.db > backup-$(date +%Y%m%d).db
   ```

---

## 性能优化

### 生产环境优化

1. **使用 Nginx 反向代理**
2. **启用 HTTP/2**
3. **配置 Gzip 压缩**
4. **设置合理的缓存策略**
5. **监控资源使用情况**

### Docker 资源限制

编辑 `docker-compose.yml` 添加资源限制：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## 更多信息

- [主 README](README.md) - 项目概述和功能介绍
- [前端 README](frontend/README.md) - 前端技术架构详情
- [产品技术设计文档](知进（know_flow）_产品_技术设计_v_0.md) - 详细设计说明

---

**需要帮助？** 提交 Issue 到 GitHub 仓库。
