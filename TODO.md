# TODO

## 待完成
- [ ] （暂无待办）

## 已完成
- [x] **Share Sheet 导入通道** —— 通过 Expo 原生分享扩展接收网页或文档内容，将解析后的上下文写入现有的导入预览请求，以兑现 README 中“扩展导入与同步能力（Share Sheet）”的承诺。
- [x] **`/api/sync` 增量同步 API** —— 在后端新增 `sync` 路由，按方向/技能点/卡片的更新时间返回增量，前端在启动与前台切换时触发拉取，覆盖 README 中的增量同步项目，目前路由注册表仍缺少该入口。
- [x] **树与练习数据的后台刷新** —— 利用 AppState 监听与 React Query `focus` 事件，在用户回到应用或间隔一段时间后自动刷新树概览与今日训练数据，避免只能手动点击刷新按钮的现状。
- [x] 完成卡片应用与通知偏好的 MSW 模拟数据与处理器，确保前端能够读取与写入最新状态。
- [x] 扩充设置页与卡片详情页的端到端测试，覆盖提醒设置保存与应用记录登记流程。
- [x] （可选）补充后端集成测试，验证通知偏好与卡片应用仓储逻辑的边界条件。
- [x] Share Sheet 导入边界用例：补充多来源、空载荷以及 `autoPreview = false` 的前端测试覆盖。

## 验收计划
1. **后端增量同步校验**
   - 运行 `cargo test --manifest-path backend/services/api/Cargo.toml sync`，覆盖 `/api/sync` 路由、仓储筛选与版本指针更新。
   - 本地启动 API 后，使用 `curl "http://localhost:4000/api/sync?since=<ISO8601>"` 验证空增量与包含更新、删除的响应结构。
2. **Share Sheet 导入联调**
   - 在 Expo Go/模拟器中触发 Share Sheet，将网页片段发送给 KnowFlow，确认导入页自动弹出并生成预览草稿。
   - 执行 `npm run test:e2e --prefix frontend -- share-import` 新增的端到端用例，确保分享内容能写入方向卡片。
3. **后台刷新体验**
   - 在应用停留 5 分钟后前后台切换，确认树概览自动刷新且时间戳更新。
   - 运行 `npm run test:e2e --prefix frontend -- tree-refresh` 验证聚焦事件触发的自动 refetch。
4. **常规回归**
   - `npm run lint --prefix frontend`
   - `npm run test:e2e --prefix frontend`
   - `cargo check --manifest-path backend/services/api/Cargo.toml`
