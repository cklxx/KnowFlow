import type {
  CreateDirectionPayload,
  CreateMemoryCardPayload,
  CreateSkillPointPayload,
  Direction,
  Evidence,
  MemoryCard,
  NewEvidenceInput,
  OnboardingBootstrapPayload,
  OnboardingBootstrapResult,
  OnboardingDirectionBundle,
  SkillPoint,
  TreeCardSummary,
  TreeDirectionBranch,
  TreeSnapshot,
  UpdateDirectionPayload,
  UpdateMemoryCardPayload,
  UpdateSkillPointPayload,
} from '@api';
import { mockTodayWorkout } from './todayWorkout';

const NOW = new Date('2024-10-08T09:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const levelScore: Record<SkillPoint['level'], number> = {
  unknown: 0,
  emerging: 1,
  working: 2,
  fluent: 3,
};

type CardStoreEntry = MemoryCard & {
  evidence_count: number;
  application_count: number;
  last_applied_at: string | null;
};

type EvidenceRecord = Evidence;

const baseDirections: Direction[] = [
  {
    id: 'dir-rag',
    name: 'AI × Retrieval',
    stage: 'attack',
    quarterly_goal: '用真实生产指标验证 KV 与 UDR 的提升',
    created_at: '2024-07-01T09:00:00.000Z',
    updated_at: '2024-10-07T11:00:00.000Z',
  },
  {
    id: 'dir-systems',
    name: 'Rust × Systems',
    stage: 'shape',
    quarterly_goal: '完成 async executor 原型并覆盖核心单测',
    created_at: '2024-06-12T09:00:00.000Z',
    updated_at: '2024-09-28T10:30:00.000Z',
  },
];

const baseSkillPoints: SkillPoint[] = [
  {
    id: 'sp-hnsw',
    direction_id: 'dir-rag',
    name: '向量索引调优',
    summary: '定位召回率瓶颈与内存边界',
    level: 'working',
    created_at: '2024-07-02T09:00:00.000Z',
    updated_at: '2024-10-01T08:30:00.000Z',
  },
  {
    id: 'sp-embedding',
    direction_id: 'dir-rag',
    name: 'Embedding 质量诊断',
    summary: '定义覆盖率与漂移指标',
    level: 'emerging',
    created_at: '2024-07-05T09:00:00.000Z',
    updated_at: '2024-09-30T13:10:00.000Z',
  },
  {
    id: 'sp-async',
    direction_id: 'dir-systems',
    name: 'Async Runtime Mastery',
    summary: '理解任务调度、Waker 生命周期',
    level: 'working',
    created_at: '2024-06-15T09:00:00.000Z',
    updated_at: '2024-09-20T10:00:00.000Z',
  },
  {
    id: 'sp-memory',
    direction_id: 'dir-systems',
    name: '低层内存安全',
    summary: 'Pin/UnsafeCell 模式与 borrow checker',
    level: 'emerging',
    created_at: '2024-06-18T09:00:00.000Z',
    updated_at: '2024-09-12T15:42:00.000Z',
  },
];

const baseCards: CardStoreEntry[] = [
  {
    id: 'card-hnsw-graph',
    direction_id: 'dir-rag',
    skill_point_id: 'sp-hnsw',
    title: 'HNSW 图分层参数如何影响召回率',
    body: 'efConstruction 与 M 的组合决定图稠密度，召回率与内存成本呈正相关。',
    card_type: 'concept',
    stability: 0.42,
    relevance: 0.81,
    novelty: 0.24,
    priority: 0.78,
    next_due: new Date(NOW.getTime() + 2 * DAY_MS).toISOString(),
    created_at: '2024-07-04T10:00:00.000Z',
    updated_at: '2024-10-05T10:00:00.000Z',
    evidence_count: 3,
    application_count: 2,
    last_applied_at: '2024-10-01T18:00:00.000Z',
  },
  {
    id: 'card-hnsw-recall',
    direction_id: 'dir-rag',
    skill_point_id: 'sp-hnsw',
    title: '如何在 24 小时内定位召回率下降',
    body: '对比离线评估与在线日志，优先检查增量索引构建与热点向量漂移。',
    card_type: 'procedure',
    stability: 0.36,
    relevance: 0.86,
    novelty: 0.32,
    priority: 0.82,
    next_due: new Date(NOW.getTime() + 4 * DAY_MS).toISOString(),
    created_at: '2024-07-08T09:00:00.000Z',
    updated_at: '2024-10-03T12:00:00.000Z',
    evidence_count: 2,
    application_count: 4,
    last_applied_at: '2024-10-06T09:30:00.000Z',
  },
  {
    id: 'card-embed-drift',
    direction_id: 'dir-rag',
    skill_point_id: 'sp-embedding',
    title: 'Embedding 漂移监控指标',
    body: '监控 top-K 覆盖率、向量范数分布与 ANN 召回率趋势，超过阈值触发回滚。',
    card_type: 'fact',
    stability: 0.27,
    relevance: 0.79,
    novelty: 0.41,
    priority: 0.74,
    next_due: new Date(NOW.getTime() + 1 * DAY_MS).toISOString(),
    created_at: '2024-07-12T09:00:00.000Z',
    updated_at: '2024-10-02T14:00:00.000Z',
    evidence_count: 1,
    application_count: 1,
    last_applied_at: '2024-09-30T11:20:00.000Z',
  },
  {
    id: 'card-rag-orphan',
    direction_id: 'dir-rag',
    skill_point_id: null,
    title: '生成式 QA 质量评估维度',
    body: '覆盖率、事实性、引用准确度、语义匹配度，分别挂靠不同 evidence。',
    card_type: 'claim',
    stability: 0.18,
    relevance: 0.68,
    novelty: 0.52,
    priority: 0.69,
    next_due: new Date(NOW.getTime() + 6 * DAY_MS).toISOString(),
    created_at: '2024-08-01T09:00:00.000Z',
    updated_at: '2024-09-28T09:45:00.000Z',
    evidence_count: 0,
    application_count: 0,
    last_applied_at: null,
  },
  {
    id: 'card-async-waker',
    direction_id: 'dir-systems',
    skill_point_id: 'sp-async',
    title: '自定义 Waker 的三步校验',
    body: '验证 wake 唤起路径、Arc 引用计数与同步互斥开销，避免死锁。',
    card_type: 'procedure',
    stability: 0.44,
    relevance: 0.72,
    novelty: 0.22,
    priority: 0.66,
    next_due: new Date(NOW.getTime() - 1 * DAY_MS).toISOString(),
    created_at: '2024-06-20T09:00:00.000Z',
    updated_at: '2024-09-29T07:00:00.000Z',
    evidence_count: 3,
    application_count: 5,
    last_applied_at: '2024-10-04T16:50:00.000Z',
  },
  {
    id: 'card-async-scheduler',
    direction_id: 'dir-systems',
    skill_point_id: 'sp-async',
    title: '任务调度器的负载均衡策略',
    body: '基于 steal 队列 + affinity hints，保持 IO 与 CPU 任务均衡。',
    card_type: 'concept',
    stability: 0.33,
    relevance: 0.69,
    novelty: 0.29,
    priority: 0.6,
    next_due: new Date(NOW.getTime() + 5 * DAY_MS).toISOString(),
    created_at: '2024-07-01T09:00:00.000Z',
    updated_at: '2024-09-26T13:20:00.000Z',
    evidence_count: 2,
    application_count: 2,
    last_applied_at: '2024-09-25T17:05:00.000Z',
  },
  {
    id: 'card-memory-pin',
    direction_id: 'dir-systems',
    skill_point_id: 'sp-memory',
    title: 'Pin 的使用守则',
    body: '只有在保证指针地址不变时才能暴露 &mut 指针，结合 UnsafeCell 控制可变性。',
    card_type: 'fact',
    stability: 0.29,
    relevance: 0.63,
    novelty: 0.37,
    priority: 0.57,
    next_due: new Date(NOW.getTime() + 3 * DAY_MS).toISOString(),
    created_at: '2024-06-22T09:00:00.000Z',
    updated_at: '2024-09-18T11:00:00.000Z',
    evidence_count: 1,
    application_count: 1,
    last_applied_at: '2024-09-14T08:00:00.000Z',
  },
];

const baseEvidence: EvidenceRecord[] = [
  {
    id: 'ev-hnsw-whitepaper',
    card_id: 'card-hnsw-graph',
    source_type: 'paper',
    source_uri: 'https://arxiv.org/abs/1603.09320',
    excerpt: 'HNSW 架构通过多层小世界图保持对数搜索复杂度。',
    credibility: 0.9,
    created_at: '2024-08-12T09:30:00.000Z',
  },
  {
    id: 'ev-hnsw-dashboard',
    card_id: 'card-hnsw-graph',
    source_type: 'dashboard',
    source_uri: 'https://metrics.knowflow.dev/rag/hnsw',
    excerpt: 'efConstruction=240 时离线召回率维持在 0.93。',
    credibility: 0.6,
    created_at: '2024-09-18T07:20:00.000Z',
  },
  {
    id: 'ev-hnsw-review',
    card_id: 'card-hnsw-graph',
    source_type: 'pr-review',
    source_uri: 'https://github.com/knowflow/rag/pull/87',
    excerpt: '代码审查确认 M=32 与 ef 设置在生产内存阈值内。',
    credibility: 0.8,
    created_at: '2024-09-25T10:05:00.000Z',
  },
  {
    id: 'ev-recall-incident',
    card_id: 'card-hnsw-recall',
    source_type: 'incident-log',
    source_uri: 'https://status.knowflow.dev/incidents/2024-09-12',
    excerpt: '增量构建任务延迟 18 分钟导致线上召回率骤降。',
    credibility: 0.4,
    created_at: '2024-09-12T04:10:00.000Z',
  },
  {
    id: 'ev-recall-playbook',
    card_id: 'card-hnsw-recall',
    source_type: 'notion',
    source_uri: 'https://notes.knowflow.dev/rag-recall',
    excerpt: '对比离线评估与在线日志，用 checklist 定位索引构建异常。',
    credibility: 0.7,
    created_at: '2024-09-30T11:40:00.000Z',
  },
  {
    id: 'ev-embed-report',
    card_id: 'card-embed-drift',
    source_type: 'analysis-report',
    source_uri: 'https://notes.knowflow.dev/embedding-drift',
    excerpt: 'top-K 覆盖率跌至 82%，触发 embedding 质量红线。',
    credibility: 0.65,
    created_at: '2024-09-28T08:55:00.000Z',
  },
  {
    id: 'ev-waker-pr',
    card_id: 'card-async-waker',
    source_type: 'pr-review',
    source_uri: 'https://github.com/knowflow/runtime/pull/133',
    excerpt: '补充 waker 唤醒路径单测并验证引用计数行为。',
    credibility: 0.75,
    created_at: '2024-09-16T15:30:00.000Z',
  },
  {
    id: 'ev-waker-trace',
    card_id: 'card-async-waker',
    source_type: 'trace-log',
    source_uri: null,
    excerpt: 'trace 显示双重唤醒在 patch 后未再出现。',
    credibility: 0.5,
    created_at: '2024-09-22T18:05:00.000Z',
  },
  {
    id: 'ev-waker-sim',
    card_id: 'card-async-waker',
    source_type: 'simulation',
    source_uri: null,
    excerpt: '模拟调度器高负载下 waker 生命周期保持稳定。',
    credibility: 0.6,
    created_at: '2024-10-01T09:15:00.000Z',
  },
  {
    id: 'ev-scheduler-metrics',
    card_id: 'card-async-scheduler',
    source_type: 'dashboard',
    source_uri: 'https://metrics.knowflow.dev/runtime/load',
    excerpt: 'steal 队列负载均衡后 CPU 使用率在 70%-82% 区间。',
    credibility: 0.55,
    created_at: '2024-09-10T06:45:00.000Z',
  },
  {
    id: 'ev-scheduler-pr',
    card_id: 'card-async-scheduler',
    source_type: 'pr-review',
    source_uri: 'https://github.com/knowflow/runtime/pull/128',
    excerpt: '新增 affinity hints 以避免 IO 线程饥饿。',
    credibility: 0.68,
    created_at: '2024-09-21T14:22:00.000Z',
  },
  {
    id: 'ev-pin-rfc',
    card_id: 'card-memory-pin',
    source_type: 'rfc',
    source_uri: 'https://internal.knowflow.dev/rfcs/pin-guidelines',
    excerpt: 'RFC 详述如何在保持地址固定时安全暴露 &mut 指针。',
    credibility: 0.7,
    created_at: '2024-08-08T13:00:00.000Z',
  },
];

const cloneDirection = (direction: Direction): Direction => ({ ...direction });
const cloneSkillPoint = (skillPoint: SkillPoint): SkillPoint => ({ ...skillPoint });
const cloneCard = (card: CardStoreEntry): CardStoreEntry => ({ ...card });
const cloneEvidence = (evidence: EvidenceRecord): EvidenceRecord => ({ ...evidence });

const replaceArray = <T>(target: T[], next: T[]) => {
  target.splice(0, target.length, ...next);
};

const store = {
  directions: baseDirections.map(cloneDirection),
  skillPoints: baseSkillPoints.map(cloneSkillPoint),
  cards: baseCards.map(cloneCard),
  evidence: baseEvidence.map(cloneEvidence),
};

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const toMemoryCard = (card: CardStoreEntry): MemoryCard => {
  const { evidence_count, application_count, last_applied_at, ...rest } = card;
  return { ...rest };
};

const toTreeCardSummary = (card: CardStoreEntry): TreeCardSummary => ({
  id: card.id,
  skill_point_id: card.skill_point_id,
  title: card.title,
  body: card.body,
  card_type: card.card_type,
  stability: card.stability,
  relevance: card.relevance,
  novelty: card.novelty,
  priority: card.priority,
  next_due: card.next_due,
  evidence_count: card.evidence_count,
  application_count: card.application_count,
  last_applied_at: card.last_applied_at,
});

const cardsForDirection = (directionId: string) =>
  store.cards
    .filter((card) => card.direction_id === directionId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

const findCardById = (id: string) => store.cards.find((card) => card.id === id);

const evidenceForCard = (cardId: string) =>
  store.evidence
    .filter((item) => item.card_id === cardId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

const skillPointsForDirection = (directionId: string) =>
  store.skillPoints
    .filter((skillPoint) => skillPoint.direction_id === directionId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

const computeAverageStability = (cards: CardStoreEntry[]) => {
  if (!cards.length) return 0;
  const total = cards.reduce((sum, card) => sum + card.stability, 0);
  return total / cards.length;
};

const computeUpcomingReviews = (cards: CardStoreEntry[]) => {
  const now = Date.now();
  const window = 7 * DAY_MS;
  return cards.filter((card) => {
    if (!card.next_due) return false;
    const due = new Date(card.next_due).getTime();
    return due >= now && due - now <= window;
  }).length;
};

const buildDirectionBranch = (direction: Direction): TreeDirectionBranch => {
  const directionCards = cardsForDirection(direction.id);
  const directionSkillPoints = skillPointsForDirection(direction.id);

  const skillBranches = directionSkillPoints
    .map((skillPoint) => {
      const cards = directionCards.filter((card) => card.skill_point_id === skillPoint.id);
      const orderedCards = cards
        .slice()
        .sort((a, b) => b.priority - a.priority || b.updated_at.localeCompare(a.updated_at));
      return {
        skill_point: cloneSkillPoint(skillPoint),
        card_count: cards.length,
        level_score: levelScore[skillPoint.level] ?? 0,
        cards: orderedCards.map(toTreeCardSummary),
      };
    })
    .sort((a, b) => b.level_score - a.level_score || b.card_count - a.card_count || a.skill_point.name.localeCompare(b.skill_point.name, 'zh-CN'));

  const orphanCards = directionCards
    .filter((card) => card.skill_point_id === null)
    .map(toTreeCardSummary);

  return {
    direction: cloneDirection(direction),
    metrics: {
      skill_point_count: directionSkillPoints.length,
      card_count: directionCards.length,
      fluent_points: directionSkillPoints.filter((skillPoint) => skillPoint.level === 'fluent').length,
      average_stability: computeAverageStability(directionCards),
      upcoming_reviews: computeUpcomingReviews(directionCards),
    },
    skill_points: skillBranches,
    orphan_cards: orphanCards,
  };
};

export const listDirections = () => store.directions.map(cloneDirection);

export const createDirectionRecord = (payload: CreateDirectionPayload): Direction => {
  const timestamp = new Date().toISOString();
  const direction: Direction = {
    id: createId('dir'),
    name: payload.name,
    stage: payload.stage ?? 'explore',
    quarterly_goal: payload.quarterly_goal ?? null,
    created_at: timestamp,
    updated_at: timestamp,
  };
  store.directions.unshift(direction);
  return cloneDirection(direction);
};

export const updateDirectionRecord = (
  id: string,
  payload: UpdateDirectionPayload,
): Direction | null => {
  const direction = store.directions.find((item) => item.id === id);
  if (!direction) return null;
  if (payload.name !== undefined) {
    direction.name = payload.name;
  }
  if (payload.stage !== undefined) {
    direction.stage = payload.stage;
  }
  if (payload.quarterly_goal !== undefined) {
    direction.quarterly_goal = payload.quarterly_goal ?? null;
  }
  direction.updated_at = new Date().toISOString();
  return cloneDirection(direction);
};

export const deleteDirectionRecord = (id: string): boolean => {
  const index = store.directions.findIndex((item) => item.id === id);
  if (index === -1) {
    return false;
  }
  store.directions.splice(index, 1);
  const remainingSkillPoints = store.skillPoints.filter((skillPoint) => skillPoint.direction_id !== id);
  const removedCardIds = new Set(store.cards.filter((card) => card.direction_id === id).map((card) => card.id));
  const remainingCards = store.cards.filter((card) => card.direction_id !== id);
  replaceArray(store.skillPoints, remainingSkillPoints.map(cloneSkillPoint));
  replaceArray(store.cards, remainingCards.map(cloneCard));
  replaceArray(
    store.evidence,
    store.evidence.filter((item) => !removedCardIds.has(item.card_id)).map(cloneEvidence),
  );
  return true;
};

export const listSkillPointsForDirection = (directionId: string) =>
  skillPointsForDirection(directionId).map(cloneSkillPoint);

export const createSkillPointRecord = (
  directionId: string,
  payload: CreateSkillPointPayload,
): SkillPoint | null => {
  if (!store.directions.some((direction) => direction.id === directionId)) {
    return null;
  }
  const timestamp = new Date().toISOString();
  const skillPoint: SkillPoint = {
    id: createId('sp'),
    direction_id: directionId,
    name: payload.name,
    summary: payload.summary ?? null,
    level: payload.level ?? 'unknown',
    created_at: timestamp,
    updated_at: timestamp,
  };
  store.skillPoints.unshift(skillPoint);
  return cloneSkillPoint(skillPoint);
};

export const updateSkillPointRecord = (
  id: string,
  payload: UpdateSkillPointPayload,
): SkillPoint | null => {
  const skillPoint = store.skillPoints.find((item) => item.id === id);
  if (!skillPoint) return null;
  if (payload.name !== undefined) {
    skillPoint.name = payload.name;
  }
  if (payload.summary !== undefined) {
    skillPoint.summary = payload.summary ?? null;
  }
  if (payload.level !== undefined) {
    skillPoint.level = payload.level;
  }
  skillPoint.updated_at = new Date().toISOString();
  return cloneSkillPoint(skillPoint);
};

export const deleteSkillPointRecord = (id: string): boolean => {
  const index = store.skillPoints.findIndex((item) => item.id === id);
  if (index === -1) return false;
  store.skillPoints.splice(index, 1);
  store.cards
    .filter((card) => card.skill_point_id === id)
    .forEach((card) => {
      card.skill_point_id = null;
      card.updated_at = new Date().toISOString();
    });
  return true;
};

export const listCardsForDirection = (directionId: string) =>
  cardsForDirection(directionId).map(toMemoryCard);

export const getMemoryCardRecord = (id: string): MemoryCard | null => {
  const card = findCardById(id);
  return card ? toMemoryCard(card) : null;
};

export const listEvidenceForCard = (cardId: string) =>
  evidenceForCard(cardId).map(cloneEvidence);

export const createEvidenceRecord = (
  cardId: string,
  payload: NewEvidenceInput,
): Evidence | null => {
  const card = findCardById(cardId);
  if (!card) {
    return null;
  }

  const timestamp = new Date().toISOString();
  const evidence: EvidenceRecord = {
    id: createId('evid'),
    card_id: cardId,
    source_type: payload.source_type,
    source_uri: payload.source_uri ?? null,
    excerpt: payload.excerpt ?? null,
    credibility: payload.credibility ?? 0,
    created_at: timestamp,
  };

  store.evidence.unshift(evidence);
  card.evidence_count = Math.max(0, card.evidence_count) + 1;
  card.updated_at = timestamp;

  return cloneEvidence(evidence);
};

export const deleteEvidenceRecord = (id: string): boolean => {
  const index = store.evidence.findIndex((item) => item.id === id);
  if (index === -1) {
    return false;
  }

  const [removed] = store.evidence.splice(index, 1);
  if (removed) {
    const card = findCardById(removed.card_id);
    if (card) {
      card.evidence_count = Math.max(0, card.evidence_count - 1);
      card.updated_at = new Date().toISOString();
    }
  }

  return true;
};

export const createMemoryCardRecord = (
  directionId: string,
  payload: CreateMemoryCardPayload,
): MemoryCard | null => {
  if (!store.directions.some((direction) => direction.id === directionId)) {
    return null;
  }
  const timestamp = new Date().toISOString();
  const fallbackSkillPoint = store.skillPoints.find((skillPoint) => skillPoint.direction_id === directionId);
  const card: CardStoreEntry = {
    id: createId('card'),
    direction_id: directionId,
    skill_point_id: payload.skill_point_id ?? fallbackSkillPoint?.id ?? null,
    title: payload.title,
    body: payload.body,
    card_type: payload.card_type,
    stability: payload.stability ?? 0.2,
    relevance: payload.relevance ?? 0.6,
    novelty: payload.novelty ?? 0.3,
    priority: payload.priority ?? 0.55,
    next_due: payload.next_due ?? new Date(Date.now() + 3 * DAY_MS).toISOString(),
    created_at: timestamp,
    updated_at: timestamp,
    evidence_count: 0,
    application_count: 0,
    last_applied_at: null,
  };
  store.cards.unshift(card);
  return toMemoryCard(card);
};

export const updateMemoryCardRecord = (
  id: string,
  payload: UpdateMemoryCardPayload,
): MemoryCard | null => {
  const card = store.cards.find((item) => item.id === id);
  if (!card) return null;
  if (payload.title !== undefined) {
    card.title = payload.title;
  }
  if (payload.body !== undefined) {
    card.body = payload.body;
  }
  if (payload.card_type !== undefined) {
    card.card_type = payload.card_type;
  }
  if (payload.skill_point_id !== undefined) {
    card.skill_point_id = payload.skill_point_id ?? null;
  }
  if (payload.stability !== undefined) {
    card.stability = payload.stability;
  }
  if (payload.relevance !== undefined) {
    card.relevance = payload.relevance;
  }
  if (payload.novelty !== undefined) {
    card.novelty = payload.novelty;
  }
  if (payload.priority !== undefined) {
    card.priority = payload.priority;
  }
  if (payload.next_due !== undefined) {
    card.next_due = payload.next_due ?? null;
  }
  card.updated_at = new Date().toISOString();
  return toMemoryCard(card);
};

export const deleteMemoryCardRecord = (id: string): boolean => {
  const index = store.cards.findIndex((card) => card.id === id);
  if (index === -1) return false;
  store.cards.splice(index, 1);
  for (let i = store.evidence.length - 1; i >= 0; i -= 1) {
    if (store.evidence[i].card_id === id) {
      store.evidence.splice(i, 1);
    }
  }
  return true;
};

export const buildTreeSnapshot = (): TreeSnapshot => ({
  directions: store.directions.map(buildDirectionBranch),
});

export const resetMockDirectionData = () => {
  replaceArray(store.directions, baseDirections.map(cloneDirection));
  replaceArray(store.skillPoints, baseSkillPoints.map(cloneSkillPoint));
  replaceArray(store.cards, baseCards.map(cloneCard));
  replaceArray(store.evidence, baseEvidence.map(cloneEvidence));
};

export const listAllSkillPoints = () => store.skillPoints.map(cloneSkillPoint);

export const listAllCards = () => store.cards.map(toMemoryCard);

export const listAllEvidenceRecords = () => store.evidence.map(cloneEvidence);

const cloneTodayPlan = () =>
  JSON.parse(JSON.stringify(mockTodayWorkout)) as typeof mockTodayWorkout;

const normalizeKey = (value: string | null | undefined) => value?.trim().toLowerCase() ?? null;

export const bootstrapOnboardingData = (
  payload: OnboardingBootstrapPayload,
): OnboardingBootstrapResult => {
  const timestamp = new Date().toISOString();

  const bundles: OnboardingDirectionBundle[] = payload.directions.map((seed) => {
    const direction: Direction = {
      id: createId('dir'),
      name: seed.name,
      stage: seed.stage,
      quarterly_goal: seed.quarterly_goal ?? null,
      created_at: timestamp,
      updated_at: timestamp,
    };

    store.directions.unshift(direction);

    const skillPoints = (seed.skills ?? []).map((skill) => {
      const skillPoint: SkillPoint = {
        id: createId('sp'),
        direction_id: direction.id,
        name: skill.name,
        summary: skill.summary ?? null,
        level: skill.level ?? 'unknown',
        created_at: timestamp,
        updated_at: timestamp,
      };
      store.skillPoints.unshift(skillPoint);
      return cloneSkillPoint(skillPoint);
    });

    const skillLookup = new Map(
      skillPoints
        .filter((skillPoint) => skillPoint.name)
        .map((skillPoint) => [normalizeKey(skillPoint.name), skillPoint.id]),
    );

    const cards = (seed.cards ?? []).map((cardSeed, index) => {
      const fallbackSkillId = cardSeed.skill_point_name
        ? skillLookup.get(normalizeKey(cardSeed.skill_point_name)) ?? null
        : null;

      const card: CardStoreEntry = {
        id: createId('card'),
        direction_id: direction.id,
        skill_point_id: fallbackSkillId,
        title: cardSeed.title,
        body: cardSeed.body,
        card_type: cardSeed.card_type,
        stability: cardSeed.stability ?? 0.28 + index * 0.04,
        relevance: cardSeed.relevance ?? 0.72 - index * 0.03,
        novelty: cardSeed.novelty ?? 0.3 + index * 0.02,
        priority: cardSeed.priority ?? 0.64 + index * 0.03,
        next_due: cardSeed.next_due ?? new Date(Date.now() + (index + 2) * DAY_MS).toISOString(),
        created_at: timestamp,
        updated_at: timestamp,
        evidence_count: 0,
        application_count: 0,
        last_applied_at: null,
      };

      store.cards.unshift(card);
      return toMemoryCard(card);
    });

    return {
      direction: cloneDirection(direction),
      skill_points: skillPoints,
      cards,
    };
  });

  const todayPlan = cloneTodayPlan();
  todayPlan.workout_id = createId('workout');
  todayPlan.generated_at = timestamp;
  todayPlan.scheduled_for = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  return {
    directions: bundles,
    today_plan: todayPlan,
  };
};
