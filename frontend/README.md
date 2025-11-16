# AI 小耳朵前端

基于 React + Vite 的轻量级前端，用于展示后端提供的每日 AI 摘要、语音与文字稿。

## 本地开发

```bash
cd frontend
npm install
npm run dev
```

开发服务器默认运行在 `http://localhost:5173`。若后端服务运行在其他地址，可创建 `.env` 并设置 `VITE_API_BASE_URL`。

## 构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录，可由任意静态站点服务托管。

## 端到端测试

项目使用 [Playwright](https://playwright.dev/) 验证核心用户旅程。

```bash
npm run e2e:install # 下载 Playwright 浏览器依赖
npm run test:e2e   # 执行端到端测试
```

在 Linux 环境下，如遇缺少系统依赖，可执行 `npx playwright install-deps chromium`（可能需要 `sudo` 权限）。
