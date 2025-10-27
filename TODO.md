# TODO

## 待完成
- [ ] （暂无待办）

## 已完成

### 前端架构迁移 (Frontend Architecture Migration)
- [x] **React CSR 重构** —— 将前端从 Expo React Native 完全迁移到 React + Vite 的 CSR (Client-Side Rendering) 架构，使用 React Router 实现路由，TanStack Query 管理服务端状态，Zustand 处理客户端状态，Tailwind CSS 提供样式系统。
- [x] **构建工具升级** —— 采用 Vite 替代 Expo/Metro bundler，获得更快的开发服务器启动速度与 HMR 性能。
- [x] **环境变量适配** —— 从 `EXPO_PUBLIC_*` 迁移到 Vite 的 `VITE_*` 环境变量规范。
- [x] **Docker 部署配置** —— 更新 Docker Compose 配置，使用 Nginx 提供静态资源服务，代理 API 请求到后端。
- [x] **文档同步更新** —— 更新所有项目文档（README、技术设计文档、脚本）以反映新的 React Web 架构。

### 已完成功能
- [x] **`/api/sync` 增量同步 API** —— 在后端新增 `sync` 路由，按方向/技能点/卡片的更新时间返回增量，前端在启动与前台切换时触发拉取。
- [x] **树与练习数据的后台刷新** —— 利用 React Query `focus` 事件，在用户回到应用或间隔一段时间后自动刷新树概览与今日训练数据。
- [x] 完成卡片应用与通知偏好的数据模拟与处理器，确保前端能够读取与写入最新状态。
- [x] 扩充设置页与卡片详情页的测试覆盖，验证提醒设置保存与应用记录登记流程。
- [x] 补充后端集成测试，验证通知偏好与卡片应用仓储逻辑的边界条件。

## 验收计划
1. **后端增量同步校验**
   - 运行 `cargo test --manifest-path backend/services/api/Cargo.toml sync`，覆盖 `/api/sync` 路由、仓储筛选与版本指针更新。
   - 本地启动 API 后，使用 `curl "http://localhost:3000/api/sync?since=<ISO8601>"` 验证空增量与包含更新、删除的响应结构。
2. **前端开发环境**
   - 运行 `npm run dev --prefix frontend` 启动 Vite 开发服务器
   - 访问 `http://localhost:5173` 验证应用正常加载
   - 确认所有路由、状态管理和 API 集成正常工作
3. **后台刷新体验**
   - 在应用停留 5 分钟后切换标签页，确认树概览自动刷新且时间戳更新。
   - 验证 React Query focus 事件触发的自动 refetch 机制。
4. **生产构建验证**
   - 运行 `npm run build --prefix frontend` 创建生产构建
   - 运行 `npm run preview --prefix frontend` 预览生产版本
   - 确认所有功能在生产环境下正常工作
5. **常规回归**
   - `npm run lint --prefix frontend`
   - `npm run typecheck --prefix frontend`
   - `cargo check --manifest-path backend/services/api/Cargo.toml`
