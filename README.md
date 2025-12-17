# AIHubMix 纯前端 Agent

本项目已重置为无后端依赖的单页应用，支持直接部署到 GitHub Pages。输入 AIHubMix API Key 即可通过官方 OpenAI 兼容接口进行对话，并可自动调用内置的前端搜索工具。

## 功能
- **AIHubMix 对话**：调用 `https://api.aihubmix.com/v1/chat/completions`，默认模型可自行修改。
- **工具调用**：提供 `search_web` 工具，模型触发后由前端执行搜索请求并将结果回传。
- **可配置搜索**：默认使用公开的 DuckDuckGo Web API 代理端点，可替换自定义搜索 API 及密钥。
- **本地保存配置**：浏览器本地保存 API Key、模型、系统提示词与搜索设置，随时一键重置。
- **纯静态部署**：仅包含 `index.html`、`styles.css`、`app.js` 三个文件，可直接推送至 GitHub Pages 或任意静态托管。

## 使用方式
1. 克隆仓库后直接打开 `index.html`，或将仓库配置为 GitHub Pages。
2. 在页面顶部填写 **AIHubMix API Key**，根据需要调整模型名称和系统提示词（配置自动保存在浏览器中）。
3. 如需自定义搜索服务，替换搜索端点及可选的搜索 API Key。
4. 点击 **发送** 提问，Agent 会自动决定是否调用搜索工具并返回最终答案。
5. 使用顶部的 **清空对话** 按钮重置历史，或使用 **重置配置** 恢复默认模型/提示词/搜索端点。

> 提示：AIHubMix 接口兼容 OpenAI Chat Completions 协议，更多细节可参考官方文档：https://docs.aihubmix.com/cn/quick-start

## GitHub Pages 部署

仓库已内置 GitHub Actions 工作流，推送到 `main` 分支后会自动将 `index.html`、`styles.css` 和 `app.js` 打包到 `dist/` 并发布到 GitHub Pages。首次使用时请在仓库的 **Settings → Pages** 中将 Source 选择为“GitHub Actions”，后续推送即可自动更新站点。
