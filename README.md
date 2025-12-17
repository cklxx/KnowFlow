# KnowFlow 前端 Agent（Vite + ChatUI + TS）

本项目提供无后端依赖的 Agent 体验，使用任意兼容 OpenAI Chat Completions 的接口，并通过前端搜索工具完成自主检索。界面基于 [ChatUI](https://github.com/alibaba/ChatUI) 组件库构建，并使用 Vite 打包为可直接部署的静态站点。

## 功能亮点
- **行业通用 Agent UI**：采用 ChatUI 提供的会话界面与工具卡片展示，工具调用/结果卡片使用 shadcn/ui Card 风格以提升观感。
- **工具调用可视化**：当模型触发 `search_web` 工具时，会在界面上展示调用参数、执行状态与结果。
- **可配置模型与搜索**：支持自定义模型名称、系统提示词、模型接口、搜索端点与可选搜索 API Key，并自动保存到本地。
- **纯静态发布**：Vite 构建输出 `dist/` 目录，可直接部署到 GitHub Pages 或任意静态托管。
- **TypeScript 支持**：前端逻辑与构建配置改为 TypeScript，便于类型约束与二次开发。

## 开发与构建
```bash
npm install
npm run dev    # 本地开发，默认端口 5173
npm run test   # 运行 Vitest 单元测试
npm run build  # 生成 dist/ 静态资源
```

## 使用方式
1. 本地或线上打开构建产物中的页面。
2. 在左上方配置区域填写 **API Key** 与接口地址，可按需调整模型、系统提示词与搜索端点（配置自动本地保存）。
3. 在聊天区直接对话，模型会自动决定是否触发搜索工具并返回最终答案。
4. 使用「停止生成」「清空对话」或「重置配置」按钮管理会话。

## 部署到 GitHub Pages
仓库提供 `deploy.yml` 工作流，会在推送到 `main` 后自动执行以下动作：
1. 安装依赖并运行测试。
2. 执行 `npm run build` 生成 `dist/`。
3. 通过 GitHub Pages 发布构建产物。

首次启用请在仓库的 **Settings → Pages** 中将 Source 设置为 “GitHub Actions”。
