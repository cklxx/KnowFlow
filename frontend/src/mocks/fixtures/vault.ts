import type {
  VaultAnnotation,
  VaultCardSummary,
  VaultEvergreenNote,
  VaultHighlight,
  VaultSnapshot,
} from '@api';

import {
  listCardsForDirection,
  listDirections,
  listSkillPointsForDirection,
} from './directions';

type HighlightSeed = Omit<VaultHighlight, 'direction_name' | 'card_title'>;
type AnnotationSeed = Omit<VaultAnnotation, 'direction_name' | 'card_title'>;
type EvergreenSeed = Omit<VaultEvergreenNote, 'direction_name'>;

const highlightSeeds: HighlightSeed[] = [
  {
    id: 'vh-rag-metrics',
    direction_id: 'dir-rag',
    card_id: 'card-hnsw-graph',
    source_type: 'pr-review',
    source_uri: 'https://github.com/knowflow/kv-updates/pull/42',
    excerpt:
      'efConstruction 调整到 240 后，线下召回率回升至 0.93，但内存占用需同步扩容。',
    credibility: 0.84,
    captured_at: '2024-10-02T10:45:00.000Z',
  },
  {
    id: 'vh-async-steal',
    direction_id: 'dir-systems',
    card_id: 'card-async-scheduler',
    source_type: 'notion',
    source_uri: 'https://notes.knowflow.dev/runtime-balancing',
    excerpt: 'steal 队列在峰值 3 小时的 CPU 使用率保持 86%，无 backlog 告警。',
    credibility: 0.72,
    captured_at: '2024-09-27T09:20:00.000Z',
  },
];

const annotationSeeds: AnnotationSeed[] = [
  {
    id: 'va-rag-hotfix',
    direction_id: 'dir-rag',
    card_id: 'card-hnsw-recall',
    context: '凌晨排查召回率骤降，定位为增量构建任务延后 18 分钟。',
    noted_at: '2024-10-06T01:30:00.000Z',
  },
  {
    id: 'va-async-review',
    direction_id: 'dir-systems',
    card_id: 'card-async-waker',
    context: '上线前 checklist 复核通过，自定义 Waker 未再触发 double wake。',
    noted_at: '2024-09-30T16:15:00.000Z',
  },
];

const evergreenSeeds: EvergreenSeed[] = [
  {
    id: 've-rag-incident',
    direction_id: 'dir-rag',
    title: 'Embedding 漂移响应手册',
    summary: '从监控信号 → 回滚策略 → 回溯评估的 30 分钟响应流程。',
    stability: 0.71,
    application_count: 7,
    last_applied_at: '2024-09-18T12:00:00.000Z',
  },
  {
    id: 've-runtime-roadmap',
    direction_id: 'dir-systems',
    title: '异步 Runtime 巡检 Checklist',
    summary: '包含调度指标、Waker 事件、内存页分配三大类巡检动作。',
    stability: 0.65,
    application_count: 5,
    last_applied_at: '2024-09-22T09:30:00.000Z',
  },
];

const buildCardSummaries = (): VaultCardSummary[] => {
  const directions = listDirections();
  const directionMap = new Map(directions.map((direction) => [direction.id, direction]));
  const skillPointMap = new Map(
    directions
      .flatMap((direction) => listSkillPointsForDirection(direction.id))
      .map((skillPoint) => [skillPoint.id, skillPoint]),
  );

  const cards = directions.flatMap((direction) =>
    listCardsForDirection(direction.id).map((card) => ({
      id: card.id,
      direction_id: direction.id,
      direction_name: directionMap.get(direction.id)?.name ?? '未命名方向',
      skill_point_id: card.skill_point_id,
      skill_point_name: card.skill_point_id
        ? skillPointMap.get(card.skill_point_id)?.name ?? null
        : null,
      title: card.title,
      card_type: card.card_type,
      stability: card.stability,
      priority: card.priority,
      next_due: card.next_due,
      updated_at: card.updated_at,
    })),
  );

  return cards.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
};

export const buildVaultSnapshot = (): VaultSnapshot => {
  const directions = listDirections();
  const directionMap = new Map(directions.map((direction) => [direction.id, direction]));
  const cardSummaries = buildCardSummaries();
  const cardMap = new Map(cardSummaries.map((card) => [card.id, card]));

  const highlights: VaultHighlight[] = highlightSeeds.map((seed) => ({
    ...seed,
    direction_name: directionMap.get(seed.direction_id)?.name ?? '未命名方向',
    card_title: cardMap.get(seed.card_id)?.title ?? '未找到卡片',
  }));

  const annotations: VaultAnnotation[] = annotationSeeds.map((seed) => ({
    ...seed,
    direction_name: directionMap.get(seed.direction_id)?.name ?? '未命名方向',
    card_title: cardMap.get(seed.card_id)?.title ?? '未找到卡片',
  }));

  const evergreen: VaultEvergreenNote[] = evergreenSeeds.map((seed) => ({
    ...seed,
    direction_name: directionMap.get(seed.direction_id)?.name ?? '未命名方向',
  }));

  return {
    highlights,
    annotations,
    cards: cardSummaries,
    evergreen,
  };
};
