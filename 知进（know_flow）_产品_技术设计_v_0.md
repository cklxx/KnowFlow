# 知进（KnowFlow）— 最小产品设计

> 以最少的交互维护“方向 → 技能点 → 记忆卡片”结构，专注在日常整理与梳理；并保留 AI 助理的核心 React 执行流。

---

## 0. 目录
1. 产品概述
2. 核心对象与约束
3. 核心用例
4. 页面信息架构
5. 最小界面与交互
6. 智能助理执行流（React）
7. 数据模型（TypeScript）
8. API 设计（OpenAPI 片段）
9. 前后端架构
10. 测试与验收

---

## 1. 产品概述
**定位**：单人知识整理工具，只保留最必要的功能——维护方向树、记录技能点、编辑记忆卡片，同时继续提供一键生成卡片草稿的智能助理。

**目标**：
- 几分钟内创建方向与技能点。
- 在同一界面完成卡片的创建、更新与删除。
- 提供方向维度的概览，包含方向、技能点与卡片数量。
- 使用智能助理快速生成卡片草稿，再落盘到方向树。

**非目标**：不涉及搜索、训练计划、进度统计等额外流程。

---

## 2. 核心对象与约束
- **Direction（方向）**：长期关注的主题，限定名称、阶段与季度目标。
- **SkillPoint（技能点）**：方向下可量化的能力节点，记录名称、摘要与掌握等级。
- **MemoryCard（记忆卡片）**：最小知识条目，仅包含标题、正文、类型，可选关联一个技能点。

约束：
- 所有卡片必须属于某个方向，技能点为可选归属。

---

## 3. 核心用例
1. 新建方向，设置阶段与季度目标。
2. 在方向内维护技能点：创建、重命名、调整掌握等级、删除。
3. 在方向内管理卡片：创建、编辑正文与类型、删除。
4. 浏览方向树概览，按方向查看技能点与已关联/未关联的卡片。
5. 使用智能助理生成卡片草稿，筛选后写入方向。

---

## 4. 页面信息架构
- 单一入口：**Tree 页面**。
  - 顶部概览：方向数量、技能点数量、卡片数量。
  - 左侧列表：所有方向摘要，支持选中切换。
  - 右侧详情：展示方向信息、技能点卡片分布、未归属卡片。
  - 底部管理区：方向列表、技能点列表、卡片列表，提供增删改。
- **AI Draft Studio**：保持独立屏，入口位于导航，用于与智能助理交互并批量写入卡片。

---

## 5. 最小界面与交互
- **方向列表**：卡片化展示名称、阶段、季度目标与基础统计。点击切换当前方向。
- **技能点列**：按掌握等级排序，显示摘要与关联卡片数量，提供内联编辑。
- **卡片列**：提供标题、正文与类型输入框，支持创建、编辑、删除。确认删除前弹出确认。
- **方向详情**：展示技能点分组后的卡片列表，仅呈现卡片类型与正文摘要。
- **AI Draft Studio**：输入素材后点击发送，右侧实时展示 GiftedChat 消息流；顶部选择偏好卡片类型与草稿数量；支持批量勾选草稿并写入方向。
- 状态反馈：加载中显示指示器，失败展示提示文案。

---

## 6. 智能助理执行流（React）
- **核心组件**：`IntelligenceChat` 负责渲染 GiftedChat、分段控制和发送按钮，维持消息状态。
- **数据流**：
  1. 用户输入素材，通过 `handleSend` 追加到 GiftedChat。
  2. `useGenerateCardDrafts` 触发 React Query mutation，调用 `/api/intelligence/card-drafts`。
  3. 接收草稿后格式化为文本消息插入对话。
  4. 错误时捕获异常并反馈提示。
- **导入与写入**：`ImportWorkspace` 使用 `useImportPreview` 请求预览，选择草稿后调用 `useCreateMemoryCard` 将草稿写入方向。
- **约束**：保留上述组件与 hook 的调用链，不移除 React Query mutation/append 流程。

---

## 7. 数据模型（TypeScript）
```ts
export type DirectionStage = 'explore' | 'shape' | 'attack' | 'stabilize';

export interface Direction {
  id: string;
  name: string;
  stage: DirectionStage;
  quarterly_goal: string | null;
  created_at: string;
  updated_at: string;
}

export type SkillLevel = 'unknown' | 'emerging' | 'working' | 'fluent';

export interface SkillPoint {
  id: string;
  direction_id: string;
  name: string;
  summary: string | null;
  level: SkillLevel;
  created_at: string;
  updated_at: string;
}

export type CardType = 'fact' | 'concept' | 'procedure' | 'claim';

export interface MemoryCard {
  id: string;
  direction_id: string;
  skill_point_id: string | null;
  title: string;
  body: string;
  card_type: CardType;
  created_at: string;
  updated_at: string;
}

export interface CreateDirectionPayload {
  name: string;
  stage: DirectionStage;
  quarterly_goal?: string | null;
}

export interface UpdateDirectionPayload {
  name?: string;
  stage?: DirectionStage;
  quarterly_goal?: string | null;
}

export interface CreateSkillPointPayload {
  name: string;
  summary?: string | null;
  level?: SkillLevel;
}

export interface UpdateSkillPointPayload {
  name?: string;
  summary?: string | null;
  level?: SkillLevel;
}

export interface CreateMemoryCardPayload {
  title: string;
  body: string;
  card_type: CardType;
  skill_point_id?: string | null;
}

export interface UpdateMemoryCardPayload {
  title?: string;
  body?: string;
  card_type?: CardType;
  skill_point_id?: string | null;
}

export interface TreeCardSummary {
  id: string;
  skill_point_id: string | null;
  title: string;
  body: string;
  card_type: CardType;
}

export interface TreeSkillPointBranch {
  skill_point: SkillPoint;
  card_count: number;
  cards: TreeCardSummary[];
}

export interface TreeDirectionMetrics {
  skill_point_count: number;
  card_count: number;
}

export interface TreeDirectionBranch {
  direction: Direction;
  metrics: TreeDirectionMetrics;
  skill_points: TreeSkillPointBranch[];
  orphan_cards: TreeCardSummary[];
}

export interface TreeSnapshot {
  directions: TreeDirectionBranch[];
}
```

---

## 8. API 设计（OpenAPI 片段）
```yaml
paths:
  /health:
    get:
      summary: Health check
      responses:
        '200': { description: Service is healthy }
  /api/intelligence/card-drafts:
    post:
      summary: Generate memory card drafts
      responses:
        '200': { description: Drafts generated }
  /api/import/preview:
    post:
      summary: Build import preview
      responses:
        '200': { description: Import preview generated }
  /api/directions:
    get:
      summary: List directions
      responses:
        '200': { description: Directions fetched }
    post:
      summary: Create direction
      responses:
        '201': { description: Direction created }
  /api/directions/{directionId}:
    patch:
      summary: Update direction
      responses:
        '200': { description: Direction updated }
        '404': { description: Direction not found }
    delete:
      summary: Delete direction
      responses:
        '204': { description: Direction deleted }
        '404': { description: Direction not found }
  /api/directions/{directionId}/skill-points:
    get:
      summary: List skill points under direction
      responses:
        '200': { description: Skill points fetched }
    post:
      summary: Create skill point
      responses:
        '201': { description: Skill point created }
  /api/skill-points/{skillPointId}:
    patch:
      summary: Update skill point
      responses:
        '200': { description: Skill point updated }
        '404': { description: Skill point not found }
    delete:
      summary: Delete skill point
      responses:
        '204': { description: Skill point deleted }
        '404': { description: Skill point not found }
  /api/directions/{directionId}/cards:
    get:
      summary: List memory cards for direction
      responses:
        '200': { description: Memory cards fetched }
    post:
      summary: Create memory card
      responses:
        '201': { description: Memory card created }
  /api/cards/{cardId}:
    patch:
      summary: Update memory card
      responses:
        '200': { description: Memory card updated }
        '404': { description: Memory card not found }
    delete:
      summary: Delete memory card
      responses:
        '204': { description: Memory card deleted }
        '404': { description: Memory card not found }
  /api/tree:
    get:
      summary: Direction tree snapshot
      responses:
        '200': { description: Tree snapshot fetched }
```

---

## 9. 前后端架构

### 前端架构
- **框架**：React 18 + Vite（CSR 客户端渲染架构）
- **路由**：React Router v6 实现单页应用导航
- **状态管理**：
  - TanStack Query (React Query) - 服务端状态管理与缓存
  - Zustand - 轻量级客户端状态管理
- **样式系统**：Tailwind CSS 提供 utility-first 响应式设计
- **构建工具**：Vite 提供快速的开发服务器与优化的生产构建
- **类型安全**：TypeScript 全覆盖，与后端 API 类型定义对齐
- **UI 组件**：基于 Web 标准的组件库，包含卡片、表单、按钮等基础元素

### 后端架构
- **框架**：Rust + Axum
- **数据库**：SQLite 持久化存储
- **API 接口**：RESTful API 实现方向、技能点、卡片、树快照、智能助理草稿、导入预览等功能

### 部署架构
- **开发环境**：
  - 前端：Vite dev server (端口 5173)
  - 后端：Axum server (端口 3000)
- **生产环境**：
  - 前端：Nginx 提供静态资源服务 (端口 8080)
  - 后端：Axum API server (端口 3000)
  - 容器化：Docker Compose 编排前后端服务

---

## 10. 测试与验收

### 测试策略
- **后端测试**：
  - 单元测试：验证核心业务逻辑与数据仓储层
  - 集成测试：验证 API 接口与数据库交互
  - 编译检查：`cargo check` 确保类型安全
- **前端测试**：
  - 类型检查：`npm run typecheck` 验证 TypeScript 类型正确性
  - 代码质量：`npm run lint` 确保代码规范
  - 手动验收：在浏览器中测试完整用户流程
- **端到端测试**：
  - 开发环境：通过 Vite dev server 验证完整功能
  - 生产环境：通过 `npm run build` + `npm run preview` 验证构建产物

### 验收清单
1. **方向管理**：在 Tree 页面创建、编辑、删除方向，确认状态实时更新且概览同步变化
2. **技能点管理**：在方向内增删改技能点，验证实时刷新与掌握等级调整
3. **卡片管理**：基于方向与可选技能点创建、编辑、删除卡片，支持技能点筛选
4. **智能助理**：在 AI Draft Studio 生成草稿并写入方向
5. **数据导出**：从设置页触发导出，验证 JSON 数据完整性
6. **树快照刷新**：验证手动刷新与自动刷新机制
7. **响应式设计**：在不同屏幕尺寸下验证 UI 适配性

### TODO 完成列表
- [x] **方向管理**：创建、编辑、删除方向，保持阶段与季度目标字段同步。
- [x] **技能点管理**：在方向内增删改技能点，实时刷新掌握等级与摘要。
- [x] **记忆卡片管理**：基于方向与可选技能点创建、编辑、删除卡片，支持技能点筛选。
- [x] **方向树概览**：拉取 `/api/tree` 快照展示方向、技能点、未归属卡片统计。
- [x] **树概览刷新**：在概览顶部提供刷新按钮，批量编辑或导入后可手动同步快照。
- [x] **树更新时间**：在概览区展示快照生成时间，便于确认数据是否最新。
- [x] **树数据新鲜度提示**：刷新时显示行内加载状态，且当快照超过 5 分钟未更新时以警示色标记。
- [x] **设置导出**：汇总方向、技能点、卡片、证据（evidence）、标签（card_tags）并支持下载。
- [x] **智能助理链路**：通过 `IntelligenceChat` 触发草稿生成、在 `ImportWorkspace` 中批量写入卡片。
- [x] **Mock 数据对齐**：MSW/fixture 保持与后端验证一致，支持全链路演练。

### 验证方案
1. **静态检查**
   - 后端：`cargo check --manifest-path backend/services/api/Cargo.toml`
   - 前端：`npm run lint --prefix frontend` 和 `npm run typecheck --prefix frontend`
2. **开发环境验证**
   - 运行 Vite 开发服务器：`npm run dev --prefix frontend`
   - 在浏览器访问 `http://localhost:5173`
   - 创建/更新/删除方向、技能点、卡片，观察 Tree Workspace 与列表联动
   - 在 MemoryCardList 中切换技能点筛选，验证新增卡片继承当前筛选状态
   - 操作完成后点击概览区刷新按钮，确认快照重新获取并反映最新数据
   - 刷新后检查"上次更新"时间戳是否同步变化，并在快照超过 5 分钟未刷新时看到警示提示
   - 观察刷新期间时间戳旁的行内加载指示
3. **智能助理链路**
   - 打开 AI Draft Studio，输入素材触发草稿生成，确认显示响应消息流
   - 勾选草稿并写入方向，回到 Tree Workspace 检查卡片出现并匹配筛选
4. **设置导出**
   - 打开设置页面触发导出，确认导出的 JSON 包含 directions、skill_points、cards、evidence、card_tags 五类集合
5. **生产构建验证**
   - 执行 `npm run build --prefix frontend` 创建优化后的生产构建
   - 执行 `npm run preview --prefix frontend` 预览生产版本
   - 验证所有功能在生产环境下正常工作
6. **Docker 部署验证**
   - 运行 `./deploy.sh` 启动完整服务栈
   - 访问 `http://localhost:8080` 验证前端应用
   - 验证前端与后端 API 集成正常
