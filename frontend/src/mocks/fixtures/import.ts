import type { ImportPreview, ImportPreviewParams } from '@api';

type PreviewCluster = ImportPreview['clusters'][number];
type PreviewDraft = PreviewCluster['drafts'][number];
type PreviewMaterial = PreviewCluster['materials'][number];

const seedPreview: ImportPreview = {
  clusters: [
    {
      id: 'cluster-embedding-drift',
      topic: 'Embedding 漂移排查',
      summary: '定位 embedding 指标回落与对话错配的调试切入点。',
      materials: [
        {
          id: 'mat-observability-report',
          title: 'Observability 事故复盘',
          snippet: '对话命中率下降 12%，回滚 embedding 模型后指标恢复正常。',
          kind: 'markdown',
          source_url: 'https://wiki.knowflow.dev/embedding-drift',
          tags: ['embedding', 'drift', 'monitoring'],
        },
        {
          id: 'mat-similarity-dashboard',
          title: 'Similarity 仪表盘',
          snippet: 'Cosine 相似度分布整体左移，长尾 query 漂移明显。',
          kind: 'text',
          source_url: null,
          tags: ['analytics'],
        },
      ],
      drafts: [
        {
          draft: {
            skill_point_id: 'sp-embedding',
            title: 'Embedding 漂移应急检查单',
            body: '确认离线评估基线 → 对比 top-K 覆盖率 → 检查热门 query 召回。',
            card_type: 'procedure',
            stability: 0.12,
            relevance: 0.88,
            novelty: 0.34,
            priority: 0.82,
            next_due: null,
          },
          rationale: '源材料多次提到覆盖率监控与回滚流程。',
          confidence: 0.91,
        },
        {
          draft: {
            skill_point_id: 'sp-embedding',
            title: 'Embedding 监控指标分层',
            body: '在线覆盖率、query 漂移、向量范数散度分别归属 SLO / 警报 / 回滚。',
            card_type: 'concept',
            stability: 0.18,
            relevance: 0.84,
            novelty: 0.41,
            priority: 0.77,
            next_due: null,
          },
          rationale: '材料中拆分了指标的层级与响应动作。',
          confidence: 0.86,
        },
      ],
    },
    {
      id: 'cluster-async-runtime',
      topic: 'Async Runtime 调度',
      summary: '对比不同 waker 实现与 poll 驱动策略的取舍。',
      materials: [
        {
          id: 'mat-runtime-review',
          title: 'Runtime 设计评审',
          snippet: '自定义 waker 需校验 wake_by_ref → 队列推送 → timer 驱动。',
          kind: 'markdown',
          source_url: 'https://wiki.knowflow.dev/runtime-review',
          tags: ['async', 'runtime'],
        },
        {
          id: 'mat-metrics',
          title: '任务饱和度数据',
          snippet: 'IO 线程饱和度 65%，存在批量任务饿死情况。',
          kind: 'text',
          source_url: null,
          tags: ['metrics'],
        },
      ],
      drafts: [
        {
          draft: {
            skill_point_id: 'sp-async',
            title: '自定义 Waker 校验三步',
            body: '确认 wake_by_ref 线程安全 → 任务重新排队 → timer 驱动下一次 poll。',
            card_type: 'procedure',
            stability: 0.22,
            relevance: 0.79,
            novelty: 0.28,
            priority: 0.75,
            next_due: null,
          },
          rationale: '评审记录强调了三步校验并与指标匹配。',
          confidence: 0.83,
        },
      ],
    },
  ],
};

const cloneMaterial = (material: PreviewMaterial): PreviewMaterial => ({
  ...material,
  tags: [...material.tags],
});

const cloneDraft = (draft: PreviewDraft): PreviewDraft => ({
  draft: { ...draft.draft },
  rationale: draft.rationale,
  confidence: draft.confidence,
});

const snip = (value: string, length: number) =>
  value.length <= length ? value : `${value.slice(0, length)}…`;

const MAX_DRAFTS_PER_CLUSTER = 8;

export const buildImportPreview = (payload?: ImportPreviewParams): ImportPreview => {
  const directionName = payload?.directionName?.trim();
  const language = payload?.language?.trim();
  const desired = payload?.desiredCardsPerCluster && payload.desiredCardsPerCluster > 0
    ? Math.min(payload.desiredCardsPerCluster, MAX_DRAFTS_PER_CLUSTER)
    : null;
  const sources = payload?.sources ?? [];

  const clusters = seedPreview.clusters.map((cluster, index) => {
    const materials = cluster.materials.map((material) => cloneMaterial(material));

    if (index === 0 && sources.length) {
      sources.forEach((source, sourceIndex) => {
        const rawContent = `${source.content ?? ''}`;
        const snippetSource = rawContent.trim();
        materials.push({
          id: `user-source-${sourceIndex + 1}`,
          title: source.title?.trim() || `外部材料 ${sourceIndex + 1}`,
          snippet: snip(snippetSource, 160),
          kind: source.kind ?? 'text',
          source_url: source.url ?? null,
          tags: source.tags ? [...source.tags] : [],
        });
      });
    }

    const drafts = cluster.drafts.map((draft) => {
      const cloned = cloneDraft(draft);
      if (language) {
        cloned.rationale = `${cloned.rationale}（${language}）`;
      }
      return cloned;
    });

    const limitedDrafts = desired ? drafts.slice(0, desired) : drafts;

    const enrichedTopic = directionName && index === 0 ? `${directionName} · ${cluster.topic}` : cluster.topic;
    const enrichedSummary = directionName && index === 0
      ? `${directionName} 的当前焦点：${cluster.summary}`
      : cluster.summary;

    return {
      id: cluster.id,
      topic: enrichedTopic,
      summary: enrichedSummary,
      materials,
      drafts: limitedDrafts,
    } satisfies ImportPreview['clusters'][number];
  });

  return { clusters };
};

export const mockImportPreview = buildImportPreview();
