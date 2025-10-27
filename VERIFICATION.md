# KnowFlow 部署验证清单

本文档用于验证 KnowFlow 的完整部署流程。

## ✅ 预部署检查

### 1. 文件完整性检查

```bash
# 检查关键文件是否存在
ls -l deploy.sh quick-deploy.sh docker-compose.yml .env.example
ls -l backend/.env.example frontend/.env.example
ls -l DEPLOYMENT.md QUICK_START.md README.md
```

**预期输出**：所有文件都应存在

### 2. 脚本可执行性检查

```bash
# 检查脚本权限
ls -la *.sh scripts/*.sh
```

**预期输出**：所有 .sh 文件应有 `x` (可执行) 权限

### 3. Docker 环境验证

```bash
# 验证 Docker 是否安装
docker --version
```

**预期输出**：显示 Docker 版本信息

---

## 🧪 部署测试

### 测试 1: 环境变量配置

```bash
# 创建 .env 文件
cp .env.example .env

# 验证必需变量
grep -E "LLM_API_KEY|LLM_MODEL|LLM_API_BASE" .env
```

**预期输出**：显示所有 LLM 配置变量

### 测试 2: Docker 构建测试

```bash
# 只构建，不启动
docker build -t knowflow-backend:latest -f backend/Dockerfile .
docker build -t knowflow-frontend:latest --build-arg VITE_API_BASE_URL=http://localhost:3000 frontend

# 验证镜像创建
docker images | grep knowflow
```

**预期输出**：显示 `knowflow-backend` 和 `knowflow-frontend` 镜像

### 测试 3: 服务启动测试

```bash
# 启动服务
./deploy.sh

# 等待服务启动
sleep 10

# 检查容器状态
docker ps --filter "name=knowflow"
```

**预期输出**：两个容器都应该是 `Up` 状态

### 测试 4: 健康检查

```bash
# 后端健康检查
curl -f http://localhost:3000/health

# 前端访问测试
curl -f http://localhost:8080

# 查看日志
docker logs --tail=50 knowflow-backend
docker logs --tail=50 knowflow-frontend
```

**预期输出**：
- 后端返回健康状态
- 前端返回 HTML 内容
- 日志无严重错误

### 测试 5: API 端点测试

```bash
# 测试方向列表 API
curl http://localhost:3000/api/directions

# 测试树快照 API
curl http://localhost:3000/api/tree
```

**预期输出**：返回 JSON 响应（可能为空数组）

---

## 🔄 一键部署脚本测试

### 测试 deploy.sh

```bash
# 停止现有服务
docker rm -f knowflow-frontend knowflow-backend
docker volume rm knowflow-backend-data

# 运行部署脚本
./deploy.sh
```

**验证点**：
- [ ] 检查 .env 文件
- [ ] 停止旧容器
- [ ] 构建镜像
- [ ] 启动服务
- [ ] 健康检查通过
- [ ] 显示访问 URL

### 测试 quick-deploy.sh

```bash
# 在干净的环境测试（需要删除项目目录后测试）
# 注意：这会删除现有部署！

cd ~
rm -rf ~/KnowFlow  # 危险操作！仅用于测试
./path/to/quick-deploy.sh
```

**验证点**：
- [ ] 克隆仓库
- [ ] 创建 .env
- [ ] 构建和启动
- [ ] 健康检查通过

---

## 📊 功能验证

### 1. 前端功能测试

访问 http://localhost:8080

**验证点**：
- [ ] 首页正常加载
- [ ] 可以导航到各个页面
- [ ] 深色模式切换正常
- [ ] 页面响应速度正常

### 2. 后端 API 测试

```bash
# 创建方向
curl -X POST http://localhost:3000/api/directions \
  -H "Content-Type: application/json" \
  -d '{"name":"测试方向","stage":"explore","quarterly_goal":null}'

# 获取方向列表
curl http://localhost:3000/api/directions

# 获取树快照
curl http://localhost:3000/api/tree
```

**验证点**：
- [ ] 能够创建方向
- [ ] 能够获取列表
- [ ] 数据正确返回

### 3. LLM 集成测试

```bash
# 测试 AI 卡片生成（需要有效的 API 密钥）
curl -X POST http://localhost:3000/api/intelligence/card-drafts \
  -H "Content-Type: application/json" \
  -d '{
    "direction_id": 1,
    "user_input": "测试 AI 功能",
    "chat_history": []
  }'
```

**验证点**：
- [ ] API 调用成功
- [ ] 返回生成的卡片草稿
- [ ] 无认证错误

---

## 🧹 清理测试

### 完全清理

```bash
# 停止服务
docker rm -f knowflow-frontend knowflow-backend

# 删除数据卷
docker volume rm knowflow-backend-data

# 删除镜像
docker rmi $(docker images | grep knowflow | awk '{print $3}')
```

**验证点**：
- [ ] 容器已停止
- [ ] 数据卷已删除
- [ ] 镜像已删除

---

## 📝 测试记录

### 测试环境

- **操作系统**: _______________
- **Docker 版本**: _______________
- **测试日期**: _______________
- **测试人员**: _______________

### 测试结果

| 测试项 | 状态 | 备注 |
|--------|------|------|
| 文件完整性 | ⬜ 通过 / ⬜ 失败 | |
| 脚本权限 | ⬜ 通过 / ⬜ 失败 | |
| Docker 配置 | ⬜ 通过 / ⬜ 失败 | |
| 环境变量 | ⬜ 通过 / ⬜ 失败 | |
| Docker 构建 | ⬜ 通过 / ⬜ 失败 | |
| 服务启动 | ⬜ 通过 / ⬜ 失败 | |
| 健康检查 | ⬜ 通过 / ⬜ 失败 | |
| API 端点 | ⬜ 通过 / ⬜ 失败 | |
| deploy.sh | ⬜ 通过 / ⬜ 失败 | |
| quick-deploy.sh | ⬜ 通过 / ⬜ 失败 | |
| 前端功能 | ⬜ 通过 / ⬜ 失败 | |
| 后端 API | ⬜ 通过 / ⬜ 失败 | |
| LLM 集成 | ⬜ 通过 / ⬜ 失败 | |

### 发现的问题

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## 🎯 验收标准

部署被认为是成功的，如果：

1. ✅ 所有预部署检查通过
2. ✅ Docker 构建成功，无错误
3. ✅ 服务启动并通过健康检查
4. ✅ 前端可以正常访问（http://localhost:8080）
5. ✅ 后端 API 响应正常（http://localhost:3000）
6. ✅ 至少一个 API 端点测试通过
7. ✅ 部署脚本执行成功
8. ✅ 日志无严重错误

---

## 📞 问题上报

如果验证过程中发现问题：

1. 记录详细的错误信息和日志
2. 记录测试环境详情
3. 创建 GitHub Issue 并附上测试记录
4. 参考 [DEPLOYMENT.md](DEPLOYMENT.md) 的故障排查章节

---

**验证愉快！**
