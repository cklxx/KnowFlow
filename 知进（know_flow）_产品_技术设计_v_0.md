# 知进（KnowFlow）— 产品+技术设计 v0.1

> 用可追溯的记忆与训练，把“阅读→理解→内化→应用”做成有方向、有节奏的成长跑。

---

## 0. 目录
1. 产品概述（定位 / 目标 / 非目标）
2. 关键对象与术语
3. 用户旅程与核心用例
4. 信息架构（IA）
5. 最朴素 UI 布局（移动端为主）
6. 页面级说明（Onboarding, Today, Tree, Vault, Card, Import, Search, Progress, Settings）
7. 交互模式与快捷键
8. 设计系统（Design Tokens / 组件状态 / 动效）
9. 数据模型（TypeScript 接口）
10. API 设计（OpenAPI 片段）
11. 算法与调度（间隔重复 / 相关度 / 应用驱动）
12. 检索与嵌入（向量 + 关键词）
13. 前端架构（Expo React Native）
14. 后端架构（Rust + Axum）
15. 存储与索引（SQLite + Tantivy）
16. 同步、导入与隐私
17. 观测与指标（Metrics）
18. 测试与验收（V0）
19. 部署与运维
20. 路线图（2 周 / 6 周）
21. 附录（示例 JSON / SQL / 极简组件）
22. 功能与 Feature 列表（无代码）
23. 完整交互稿 v1.0（移动端）
24. 状态机与事件表（核心模块）
---

## 1. 产品概述
**一句话**：以“方向（Direction）×进度（Progress）×可追溯记忆（Memory）”为核心，帮助个人在冷启动 30 分钟内明确方向与掌握度，并通过每日 15–20 分钟训练实现持续进步与应用落地。

**核心用户**：创始人/技术负责人/研究型工程师（先为“我自己”服务）。

**成功度量（V0）**：
- 冷启动 30 分钟完成方向树、掌握雷达、首日 10 张卡片、首周训练表。
- 连续 7 天，每天 15 分钟训练可运行；7/30 天保留率与应用度可视化。
- 任一真实任务中自动出现 ≥2 张相关卡片帮助输出。

**非目标（V0 不做）**：多人协作、云端分享社区、大规模团队权限体系。

---

## 2. 关键对象与术语
- **Direction（方向）**：长期主题，如“AI×阅读萃取”、“Rust×检索”。
- **SkillPoint（技能点）**：方向下可评估的粒度，0–3 级。
- **MemoryCard（卡片）**：最小记忆单元（fact/concept/procedure/claim）。
- **Evidence（证据）**：原文/链接/代码行/数据引用，可冲突、可比对。
- **Workout（训练）**：每日计划（快问快答 + 应用演练 + 巩固回顾）。
- **Stability（稳定度 S）**：记忆强度；**Relevance（相关度 R）**、**Novelty（新颖度 N）**、**Priority（优先级 P）**。
- **KV（知识速度）**、**UDR（不确定性下降率）**：核心指标。

---

## 3. 用户旅程与核心用例
**冷启动（30 分钟）**
1) 选定 3–5 个方向 → 每个方向选阶段（探索/成型/攻坚/固化）并写季度目标。
2) 6×技能点自评（0–3）→ 生成掌握向量与不确定性热区。
3) 导入最近 10 条代表性材料 → 自动抽取 10 张首日卡片。
4) 生成首周训练计划，立即开始首日 15 分钟。

**日常（15–20 分钟/天）**
- Today：快问快答（5 分）→ 应用演练（10 分）→ 巩固回顾（5 分）。
- 工作中：在编辑器/文档/PR 页面侧栏出现上下文相关卡片。
- 晚上：记录 1 条“用了哪张卡片”，系统更新应用度与调度。

**进阶**
- 冲突证据处理：为某主张关联多条证据，标注可信度，并触发复盘。
- Evergreen 笔记：多次应用且证据稳定的卡片汇聚成可复用笔记。

---

## 4. 信息架构（IA）
- **顶层导航**：Today｜Tree｜Vault｜Search｜Progress｜Settings
- **二级**：
  - Tree：方向 → 能力块 → 技能点 → 卡片/证据 → 产出/决策
  - Vault：L1 高亮 → L2 注解 → L3 卡片 → L4 Evergreen

---

## 5. 最朴素 UI 布局
### 5.1 桌面骨架（参考）
```
┌───────────────────────────────────────────────────────────┐
│  顶栏：Logo | Today | Tree | Vault | Search | Progress | ⚙ │
├───────────────────────────────────────────────────────────┤
│  左侧边栏（可折叠）      │  主工作区（页面内容）                │
│  - 方向/过滤器           │  - 首屏模块（例如 Today 卡片栈）      │
│  - 快捷入口（导入/新卡） │  - 次级模块（例如应用演练/统计）      │
└───────────────────────────────────────────────────────────┘
```

### 5.2 移动端（Expo RN）布局
- **导航**：底部 Tab（Today/Tree/Vault/Search/More），More 内含 Progress 与 Settings。
- **顶部**：页面标题 + 右上角操作（添加/导入/筛选）。
- **Today**：卡栈（左右滑动/按钮 Pass/Fail）、进度条、下一块砖；
- **Tree**：两列布局（扁平列表 → 详情面板），横向滑动切能力块；
- **Vault**：列表模式（支持分段标签），长按进入批量操作；
- **Search**：顶部搜索框 + 智能建议；结果卡片（类型标识 + 标签 + 证据数）。
- **全局抽屉**：从右侧呼出“快速导入/新建卡片”。

### 5.3 交互与可达性
- 单手区优先：主要操作按钮放底部；
- 手势：左右滑（通过/不过）、下拉刷新、长按批量选择；
- 动效：卡片进出 150ms；注意 60fps，避免昂贵布局。

### 5.4 设计系统（移动端 Token）
- 间距：4/8/12/16/20；圆角：12/16；触控目标：≥44×44；
- 明暗两套主题，随系统；
- 字体分级：12/14/16/20/24；标题对比度≥4.5:1。
---

## 6. 页面级说明
### 6.1 Onboarding（冷启动）
**目的**：30 分钟完成方向&进度画像与首周训练。
- 布局：步骤进度条（1/4/…）+ 主面板 + 右侧预览（实时生成雷达图）。
- 步骤：选择方向 → 选择阶段/写季度目标 → 技能点评分 → 导入材料 → 生成卡片 → 预览 & 开始训练。
- 空状态：提供 5 个方向模板与 6×技能点模板。
- 错误：导入失败提供手动粘贴入口。

### 6.2 Today（每日训练）
**目的**：15–20 分钟完成巩固与应用。
- 区块 A：**快问快答**（卡片栈，左右滑动 Pass/Fail 或键盘 J/K）。
- 区块 B：**应用演练**（从“当前任务”选择：写一段说明/PR 描述/设计条目）。
- 区块 C：**巩固回顾**（错题与边缘项，展示下一次到期时间）。
- 边栏：今日进度（已完成/剩余）、下一块砖（Next Brick）。

### 6.3 Tree（方向树）
- 左：方向列表（按阶段与优先度排序）。
- 中：能力块与技能点树状视图（显示掌握度热力）。
- 右：选中节点的卡片与证据列表（支持拖拽到“产出”）。

### 6.4 Vault（知识库）
- 顶部：视图切换（L1 高亮 / L2 注解 / L3 卡片 / L4 Evergreen）。
- 主区：网格/列表；搜索过滤：方向、类型、时间、状态（稳定/冲突）。

### 6.5 Card Detail（卡片详情）
- 结构：标题/类型/正文/证据/标签/方向/稳定度/下一次到期。
- 操作：编辑、添加证据、设置为 Evergreen、标记冲突、查看应用记录。

### 6.6 Import（导入）
- 支持：URL、Markdown 粘贴、PDF 文本粘贴、代码片段。
- 处理：主题聚类 → 术语对齐 → 生成卡片草稿（可批量确认）。

### 6.7 Search（检索）
- 输入框 + 智能建议（最近方向/标签）。
- 结果分区：卡片 / 证据 / Evergreen / 产出。

### 6.8 Progress（进度仪表盘）
- 雷达：方向掌握度（0–100）。
- 条形：7/30/90 保留率。
- 曲线：KV（周）与 UDR（热区问题澄清率）。
- 列表：最近应用（PR/文档/实验）× 影响力评分。

### 6.9 Settings（设置）
- 本地数据目录、导出“证据最小集”、隐私与备份、快捷键。

---

## 7. 交互模式与快捷键
- 全局：`Cmd/Ctrl + K` 搜索；`Cmd/Ctrl + I` 导入；`?` 快捷键帮助。
- Today：`J/K` 上下；`L/;` 通过/不过；`Space` 翻转答案；`E` 加证据。
- 编辑：`Cmd/Ctrl + S` 保存；`Cmd/Ctrl + B` 设为 Evergreen。

---

## 8. 设计系统（最小 Token）
- **色板**：
  - 主色：#2563EB（信息）／ 成功：#16A34A ／ 警告：#D97706 ／ 危险：#DC2626
  - 中性色：#0F172A, #1E293B, #334155, #64748B, #CBD5E1, #E2E8F0, #F8FAFC
- **字体**：中文系统字体堆栈＋等宽用于代码。
- **间距**：4/8/12/16/24/32（px）。
- **圆角**：8/16（卡片 16）。
- **密度**：紧凑（卡片内边距 12）。
- **状态**：Hover（阴影升一档）、Active（边框高亮）、Focus（可见焦点环）。
- **动效**：卡片翻转 150ms、列表进入 120ms，避免夸张动画。
- **暗黑**：同色系降低亮度 15–20%，保持对比度 ≥ 4.5:1。

---

## 9. 数据模型（TypeScript）
```ts
type DirectionStage = "explore" | "shape" | "attack" | "stabilize";

interface Direction { id: string; name: string; stage: DirectionStage; quarterGoal: string; }

interface SkillPoint { id: string; directionId: string; name: string; level0to3: number; }

type CardType = "fact" | "concept" | "procedure" | "claim";

interface MemoryCard {
  id: string; type: CardType; text: string; source: string; directionId: string; tags: string[];
  stability: number; relevance: number; novelty: number; priority: number; lastSeen: string; nextDue: string;
}

interface Evidence { id: string; cardId: string; url?: string; quote?: string; codeRef?: string; trust?: number; conflictGroupId?: string; }

interface WorkoutItem { id: string; cardId: string; due: string; done?: string; result?: "pass"|"fail"; }
```

---

## 10. API 设计（OpenAPI 片段）
```yaml
openapi: 3.0.0
info: { title: KnowFlow API, version: 0.1 }
paths:
  /directions:
    get: { summary: List directions }
    post: { summary: Create direction }
  /skills:
    get: { summary: List skills by directionId }
    post: { summary: Upsert skill }
  /cards:
    get: { summary: Query cards, parameters: [directionId, q, dueBefore] }
    post: { summary: Create card }
  /cards/{id}:
    get: { summary: Get card }
    patch: { summary: Update card }
  /evidence:
    post: { summary: Add evidence }
  /today:
    get: { summary: Get today workout queue }
  /workout/{id}/done:
    post: { summary: Submit workout result }
  /progress:
    get: { summary: Progress dashboard data }
```

---

## 11. 算法与调度
**优先级**：`P = 0.4*(1 - S) + 0.4*R + 0.2*N`。

**间隔重复（简化 SM-2）**：
- 通过：`S += f(interval, difficulty)`；失败：`S -= g()`；
- 下次时间：`nextDue = now + base * (1 + S) * (1 - 0.5*R)`。

**应用驱动**：
- 当“当前任务”上下文变化（PR/文档标题/关键词）→ 触发相似度检索 → 插入今日队列前列。

**冲突证据**：
- 同一 claim 关联多个 Evidence，计算 `conflictScore` 并标注复盘任务。

**聚类与术语对齐（导入）**：
- Mini-embeddings（bge-small）+ HDBSCAN 或阈值聚类；同义词表增量学习。

---

## 12. 检索与嵌入
- 词法：Tantivy（BM25）+ 前缀/标签索引。
- 向量：bge-small / jina-embeddings-small（384d）；SQLite 外挂表或本地 faiss-lite。
- 混合检索：`score = α * bm25 + (1-α) * cosSim`，缺省 α=0.4。
- 上下文推送：监听“当前任务”关键词 → Top-K 相关卡片。

---

## 13. 前端架构（Expo React Native）
- **技术栈**：Expo（React Native）+ TypeScript + expo-router（文件式路由）+ React Query（数据缓存）+ Zustand（轻状态）+ Reanimated/Gesture-Handler（交互）+ Expo SQLite 或 WatermelonDB（离线）+ MMKV（KV 存储）+ Expo Notifications（推送）+ Sentry（崩溃）
- **架构分层**：
  - `app/`（路由与页面）：Today｜tree｜vault｜search｜progress｜settings（通过 expo-router）
  - `features/`（领域模块）：onboarding｜cards｜workout｜import｜evidence｜directions
  - `core/`：api（OpenAPI client/拦截器/重试）、store（Zustand）、scheduler（间隔重复）、embeddings（可选本地/远程）、analytics
  - `ui/`：通用组件（Card、List、Badge、Empty、Toast、Modal）+ 设计系统（token 与主题）
- **网络层**：
  - 与后端 Axum 完全 **前后端分离**；所有接口通过 Bearer Token 调用；
  - React Query 统一请求/缓存/乐观更新；离线时走本地队列，恢复后批量同步。
- **离线优先**：
  - SQLite/WatermelonDB 持久化卡片、证据、训练计划；
  - MMKV 存储会话、配置与上次同步戳；
  - `sync` 任务：App 启动/前后台切换/手动触发时增量拉取；事务化合并冲突（“本地优先，时间戳+版本号”）。
- **安全**：
  - 首版本地单用户，可选与后端鉴权；
  - Token 放入 SecureStore；敏感字段（source 快照）加密保存（可选）。
- **原生能力**：
  - 推送提醒今日训练到期（Notifications + background fetch）；
  - 深链：`knowflow://today` 直达训练；
  - Share Extension（iOS 之后版本）：系统分享菜单一键“保存为卡片”。
- **目录示例（expo-router）**：
```
app/
  _layout.tsx            // 顶部/底部导航框架
  index.tsx              // Today
  tree.tsx
  vault.tsx
  search.tsx
  progress.tsx
  settings.tsx
features/
  workout/TodayScreen.tsx
  cards/CardDetail.tsx
core/
  api/client.ts
  scheduler/spaced.ts
  store/useAppStore.ts
ui/
  components/MemoryCard.tsx
```
- **示例：API Client（拦截器+重试）**
```ts
// core/api/client.ts
import axios from "axios";
export const api = axios.create({ baseURL: process.env.EXPO_PUBLIC_API });
api.interceptors.request.use(async (cfg) => {
  const token = await getToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
```
- **示例：Today 卡片交互（简化）**
```tsx
export function TodayCard({ item, onPass, onFail }) {
  return (
    <View style={{ padding: 16, borderRadius: 16, borderWidth: 1 }}>
      <Text style={{ opacity: 0.6 }}>{item.type}</Text>
      <Text style={{ fontSize: 18, marginTop: 6 }}>{item.text}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Button title="不过" onPress={() => onFail(item.id)} />
        <Button title="通过" onPress={() => onPass(item.id)} />
      </View>
    </View>
  );
}
```
---

## 14. 后端架构（Rust + Axum）
- 模块划分：`api`（路由）/`service`（调度与检索）/`repo`（SQLite）/`embed`（向量）
- 中间件：日志、简单鉴权（本地 token）、错误处理、CORS。
- 性能：采用分页与流式响应；CPU 推理（小模型）或外部嵌入服务开关。

---

## 15. 存储与索引
**SQLite（本地）**
- `directions(id, name, stage, quarter_goal)`
- `skills(id, direction_id, name, level)`
- `cards(id, type, text, source, direction_id, tags, stability, relevance, novelty, priority, last_seen, next_due)`
- `evidence(id, card_id, url, quote, code_ref, trust, conflict_group_id)`
- `workouts(id, card_id, due, done, result)`

**索引**
- Tantivy：`cards.text`, `cards.tags`；
- 向量：`embeddings(card_id, vec)`。

---

## 16. 同步、导入与隐私
- **默认离线本地**（移动端）：SQLite/WatermelonDB + MMKV；
- **同步流程**：
  1) App 启动/回到前台/手动下拉触发 `sync()`；
  2) 读取 `lastSyncAt` → 调用 `/sync?since=...` 获取增量；
  3) 合并策略：本地优先，基于 `updatedAt` 与 `version`；冲突保留两个版本并标注复盘；
  4) 失败重试：指数退避，Wi‑Fi/电量门限；
  5) 推送到期：服务端计算或本地调度均可，iOS 上用本地通知兜底。
- **导入**：系统分享（Share Sheet）→ 解析 URL/文本 → 生成卡片草稿；
- **隐私**：所有数据本地可见；导出“证据最小集”（JSON+快照）；
- **安全**：Token 放 SecureStore；可选 FileSystem 加密（Expo Crypto）。
---

## 17. 观测与指标（本地）
- KV（周）、UDR、保留率（7/30/90）、应用度（上周/本周）。
- 错题热区与方向热力图。

---

## 18. 测试与验收（V0）
**功能验收**
- 冷启动 30 分钟内完成四步与首日训练。
- Today 可正常调度 ≥20 张卡/日；错误与空状态齐全。
- 任一文档/PR 输入标题时，出现 ≥2 张相关卡片。

**质量验收**
- 进度页显示 KV/UDR/保留率；导出“证据最小集”成功。
- 本地断网可用；重启后到期队列一致。

---

## 19. 部署与运维
- **移动端交付**：Expo EAS Build（iOS 为主，Android 可选）；TestFlight 内测；
- **OTA 更新**：Expo Updates 灰度分发（主干/测试渠道）；
- **崩溃与性能**：Sentry SDK + Expo Performance；
- **推送**：Expo Notifications（每日训练提醒、到期卡片）；
- **后台任务**：Background Fetch 同步到期/上传队列（节流与电量保护）；
- **后端**：Axum 服务（云或自托管），PostgreSQL 或 SQLite；
- **CI**：GitHub Actions（Lint/Type-check/单元测试）→ EAS Submit；
- **配置**：`app.json`（scheme、deepLinks、权限），`.env`（API base、渠道）。

**示例 app.json 片段**
```json
{
  "expo": {
    "name": "KnowFlow",
    "scheme": "knowflow",
    "ios": { "bundleIdentifier": "com.yourorg.knowflow" },
    "plugins": [
      ["expo-notifications"],
      ["expo-secure-store"],
      ["expo-build-properties", { "ios": { "useFrameworks": "static" } }]
    ]
  }
}
```
---

## 20. 路线图
**Week 1**
- Onboarding、Today、Tree（只读）+ SQLite 表 + 调度器 MVP。
- 导入 URL/文本 → 生成卡片草稿。

**Week 2**
- Progress 仪表盘、冲突证据最小流程、VSCode/Docs 侧栏（可选）。

---

## 21. 附录
### 21.1 示例：首日 3 张卡片（JSON）
```json
[ {"id":"c1","type":"concept","text":"观点树：从命题→分支论点→证据，支持反链与冲突标注。","source":"note://onboarding","directionId":"d_ai_read","tags":["框架"],"stability":0.1,"relevance":0.9,"novelty":0.7,"priority":0.0,"lastSeen":"","nextDue":""}, {"id":"c2","type":"procedure","text":"导入一篇文章→抽取 3–5 个主张→为每个主张添加至少 1 条证据。","source":"note://onboarding","directionId":"d_ai_read","tags":["流程"],"stability":0.1,"relevance":0.8,"novelty":0.6,"priority":0.0,"lastSeen":"","nextDue":""}, {"id":"c3","type":"fact","text":"GQA 通过共享 KV 头减少显存占用并提升吞吐。","source":"paper://gqa","directionId":"d_small_llm","tags":["GQA"],"stability":0.1,"relevance":0.7,"novelty":0.8,"priority":0.0,"lastSeen":"","nextDue":""} ]
```

### 21.2 SQLite 建表（最小）
```sql
-- 见正文
```

### 21.3 极简 React 组件（略）

---

## 22. 功能与 Feature 列表（无代码）
> 面向 iOS 移动端（Expo RN），按模块划分，描述功能边界、输入/输出、重要规则与异常处理。

### 22.1 Onboarding（冷启动 30 分钟）
- 方向选择：预置模板 + 自定义；每个方向设置阶段与季度目标。
- 技能自评：每方向 6 个技能点，0–3 分制；可“跳过”；结果用于掌握向量与热区排序。
- 快速导入：最近 10 条材料（URL/文本/摘录）；失败时提供手动粘贴与略过。
- 自动生成：首日 10 张卡片（带来源）、首周训练计划；允许用户逐条勾选/剔除。
- 结果页：展示雷达图、下一步行动（开始 Today / 去 Tree 调整）。

### 22.2 Today（日常 15–20 分钟）
- 队列：系统根据 Priority 与到期时间生成每日清单（10–25 张）。
- 快问快答：支持“看题→翻面→自评 Pass/Fail”；计入稳定度；错题进入“巩固回顾”。
- 应用演练：从“当前任务”中选择 1 个（或快速创建），要求把 1–2 张卡片转化为实际输出（一句话说明/PR 描述等）。
- 巩固回顾：边缘项与错题；显示下一次到期时间；可“推迟到明天”。
- 完成页：显示今日得分（正确率、完成量、KV 贡献），并推送“下一块砖”。

### 22.3 Tree（方向树）
- 展示结构：方向 → 能力块 → 技能点 → 关联卡片/证据/产出。
- 视图：热力显示掌握度；筛选（阶段/优先度/最近应用）。
- 操作：新增/重命名/调整阶段；拖拽卡片到“产出”。

### 22.4 Vault（知识库）
- 视图：L1 高亮 / L2 注解 / L3 卡片 / L4 Evergreen；
- 批量：多选移动、合并标签、设为 Evergreen；
- 过滤：方向、类型、状态（稳定/冲突/需证据）、时间；
- 空状态：提示导入或从 Today 生成。

### 22.5 Card（卡片）与 Evidence（证据）
- 字段：标题/类型/正文/方向/标签/证据/稳定度/下一次到期；
- 证据：至少 1 条；支持冲突分组与可信度；
- 应用记录：展示被引用到的 PR/文档/决策；
- 操作：编辑、添加证据、设 Evergreen、标记冲突、删除（需确认）。

### 22.6 Import（导入）
- 输入：URL/文本/摘录/系统分享；
- 处理：主题聚类→术语对齐→生成卡片草稿（可批量确认/忽略）；
- 失败处理：保留原文快照；提示“稍后重试/手动编辑”。

### 22.7 Search（检索）
- 全局搜索：跨卡片/证据/Evergreen/产出；
- 智能建议：最近方向、常用标签、热区问题；
- 结果：列表分区展示，支持按相关度/时间排序。

### 22.8 Progress（仪表盘）
- 雷达：方向掌握度；
- 保留率：7/30/90；
- 曲线：KV（周）、UDR（热区澄清率）；
- 最近应用：证据充足的实际落地项（PR/文档/实验）。

### 22.9 Settings（设置）
- 数据目录、备份/导出“证据最小集”、隐私选项；
- 通知：每日提醒时间、到期卡片提醒开关；
- 快捷操作：清空今日队列（需确认）、重建调度（需确认）。

### 22.10 同步与离线
- 离线可用：今日队列、Vault 浏览、编辑卡片与证据；
- 同步策略：本地优先，时间戳+版本号；冲突时生成复盘任务；
- 背景任务：前后台切换、定时拉取、低电量限流。

---

## 23. 完整交互稿 v1.0（移动端）
> 以“画面 → 元素 → 操作 → 结果/反馈 → 异常/分支”的格式，覆盖主流程、空/错/边缘状态。可用于直接制作线框。

### 23.1 首次启动 & Onboarding
**画面 O-0 欢迎页**
- 元素：Logo、一句话价值、按钮“开始设置”、链接“跳过（默认模板）”。
- 操作：点击“开始设置”。
- 结果：进入 O-1。

**画面 O-1 选择方向**
- 元素：方向卡片（5 个模板 + 新建）、搜索/标签、已选计数。
- 操作：最多选 5 个；可重命名；可删除。
- 结果：下一步按钮可用；顶部提示“已选 X/5”。
- 异常：未选任何项 → 禁用下一步。

**画面 O-2 设置阶段与季度目标**
- 元素：每个已选方向的分段卡；控件：阶段（探索/成型/攻坚/固化）、季度目标输入框（占位示例）。
- 操作：逐个填写或“批量设为探索”。
- 结果：保存后进入 O-3。

**画面 O-3 技能自评**
- 元素：方向切换标签、每方向 6 个技能点（0–3 打分器）、“不确定/跳过”。
- 操作：为每方向至少评分 3 个；支持长按查看定义。
- 结果：右上角出现“继续”；底部实时显示“掌握雷达预览”。
- 分支：跳过 → 使用默认均值 1。

**画面 O-4 快速导入**
- 元素：输入框（URL/文本）、系统分享入口提示、最近剪贴板建议、列表预览。
- 操作：粘贴 1–10 条；可删除某条；
- 结果：下一步生成“卡片草稿列表”。
- 异常：解析失败 → 标红该条并提供“仅保存原文/稍后重试”。

**画面 O-5 卡片草稿确认**
- 元素：卡片列表（标题/类型/方向/证据计数）、全选/全不选、编辑入口。
- 操作：逐条勾选；支持批量设定方向/标签。
- 结果：点击“生成首周训练”。

**画面 O-6 结果页**
- 元素：雷达图、首周计划摘要（按日数量）、按钮“开始 Today”。
- 操作：点击进入 T-1。

### 23.2 Today（每日训练）
**画面 T-1 今日队列**
- 元素：进度条（已完成/总数）、卡片栈预览、按钮“开始训练”。
- 操作：点击开始。

**画面 T-2 快问快答**
- 元素：题面（正面文本/关键词遮挡可选）、按钮“显示答案/翻面”、按钮“通过/不过”、标签（方向/类型）。
- 操作：
  1) 点击“显示答案”→ 展示反面；
  2) 选择“通过/不过”（或左右滑动）。
- 结果：
  - 通过：稳定度上升，移出主队列；
  - 不过：打标“错题”，加入“巩固回顾”。
- 边缘：连错 3 次 → 弹出“微复习卡”（简短提示与证据链接）。

**画面 T-3 应用演练**
- 元素：当前任务选择器（最近任务/新建）、目标卡片建议（2–3 张）、输入框（要求写一段应用说明或粘贴 PR 片段）。
- 操作：选择 1 个任务 → 选择 1–2 张卡 → 写出一句话说明。
- 结果：记一条“应用记录”；相关卡片稳定度加分；任务与卡片产生反链。
- 分支：跳过本步 → 进入 T-4。

**画面 T-4 巩固回顾**
- 元素：错题列表、各项“下一次到期”时间、操作“推迟到明天/今天再练一次”。
- 结果：更新队列。

**画面 T-5 完成页**
- 元素：今日得分（正确率/完成量/KV 贡献）、“下一块砖”（系统给出的下一小目标）、按钮“去 Tree/去 Vault/去 Progress”。

### 23.3 Tree（方向树）
**画面 R-1 列表视图**
- 元素：方向列表（掌握度条/阶段标签/最近应用计数）。
- 操作：点开某方向 → R-2。

**画面 R-2 方向详情**
- 元素：能力块网格（热力）、技能点列表、关联卡片列表、按钮“新增卡片/导入”。
- 操作：
  - 点击某技能点 → 展示其卡片与证据；
  - 拖拽卡片到“产出”区（生成一条应用任务）。

### 23.4 Vault（知识库）
**画面 V-1 层级切换**
- 元素：segmented 控件：L1/L2/L3/L4；列表/网格；过滤器（方向/类型/状态/时间）。
- 操作：长按进入多选；底部浮层出现“设 Evergreen/合并标签/删除”。
- 空状态：未有卡片 → 引导去“导入/Today”。

### 23.5 Search（检索）
**画面 S-1 搜索首页**
- 元素：顶部搜索框、最近搜索、常用标签、热区问题建议。
- 操作：输入关键词；
- 结果：S-2 展示分区结果。

**画面 S-2 结果页**
- 元素：Tabs：卡片/证据/Evergreen/产出；排序：相关度/时间。
- 操作：点卡片 → 打开详情；点证据 → 打开原文快照。

### 23.6 Card 详情与证据管理
**画面 C-1 卡片详情**
- 元素：标题/类型/正文/方向/标签/稳定度/下一次到期、证据列表（可折叠）。
- 操作：编辑文本、添加证据、设为 Evergreen、标记冲突、查看应用记录。
- 分支：无证据 → 顶部黄色提示“添加至少 1 条证据以提升可信度”。

**画面 C-2 证据冲突处理**
- 元素：同一 claim 下的证据组，标注“支持/反对/中立”、可信度条、冲突指数。
- 操作：选择仲裁：
  - 暂存冲突 → 生成复盘任务；
  - 结论更新 → 自动通知相关卡片与任务复查。

### 23.7 Progress（进度）
**画面 P-1 仪表盘**
- 元素：雷达（方向掌握度）、7/30/90 保留率条、KV/UDR 折线、最近应用列表。
- 操作：点击某方向 → P-2 分析。

**画面 P-2 方向分析**
- 元素：该方向的掌握构成（技能点分布）、错题热区、近 30 天应用明细与影响力评分。
- 操作：一键生成下一周训练侧重（热区与高价值应用）。

### 23.8 Settings（设置）
**画面 ST-1 设置首页**
- 元素：账户/数据与隐私/通知/高级；
- 操作：导出“证据最小集”、清空今日队列（确认对话）、重建调度（确认）。

### 23.9 通知与深链
- 每日提醒：可设定时间；点击通知 → 深链到 T-1 或 T-2；
- 到期提醒：当日未完成的关键卡片在晚间再次提醒（可关闭）。

---

## 24. 状态机与事件表（核心模块）

### 24.1 Today 队列状态机
- 状态：`Idle → Quiz → Apply → Review → Done`
- 事件：
  - `Start`：进入 `Quiz`；
  - `Pass/Fail`：更新稳定度与到期；
  - `Next`：取下一题；
  - `EnterApply`：切到 `Apply`；
  - `SkipApply`：直达 `Review`；
  - `Finish`：到 `Done`，生成下一块砖。
- 守卫条件：
  - `Apply` 至少有 1 个任务与 1 张卡；否则提示并允许跳过。

### 24.2 卡片稳定度与到期
- 输入：`result(pass|fail)`, `lastInterval`, `relevance`；
- 输出：`stability'`, `nextDue`；
- 规则：失败进入短间隔复习；高相关度缩短下次间隔。

### 24.3 同步与冲突
- 事件：`LocalEdit`, `RemoteUpdate`, `Merge`；
- 策略：时间戳+版本；冲突保留两版并生成复盘任务；
- 用户决策：选择保留/合并文本；更新后触发相关卡片再训练。

### 24.4 错误与空状态统筹
- 网络错误：提供“重试/离线继续”；
- 无队列：展示空态与行动建议（导入/调度重建）；
- 权限拒绝（通知/分享）：弹出解释性引导与再次请求权限。

---

> 本版移除了所有代码细节，聚焦功能范围与完整交互流程。可直接据此绘制低保真线框与制作原型。

