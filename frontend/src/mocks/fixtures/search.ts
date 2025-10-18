import type { SearchResponse, SearchSuggestionsResponse } from '@api';

export const mockSearchResponse: SearchResponse = {
  query: 'embedding',
  cards: [
    {
      id: 'c1f1e800-1111-4d1e-b5e6-aaaaaaaaaaaa',
      title: 'Embedding pipeline health checklist',
      body: '逐步检查 embedding 数据源、归一化、监控指标，确保相似度稳定。',
      card_type: 'procedure',
      priority: 0.9,
      stability: 0.58,
      next_due: '2025-06-20T08:00:00Z',
      direction_id: 'd111aaaa-2222-4bbb-9ccc-333344445555',
      direction_name: 'AI × Retrieval',
      skill_point_id: 'sp-aaaa-1111-2222-3333bbbbcccc',
      skill_point_name: 'Embedding Pipeline Ops',
    },
    {
      id: 'c2f1e800-1111-4d1e-b5e6-bbbbbbbbbbbb',
      title: 'Vector drift diagnostics',
      body: '通过余弦相似度分布和召回率监控 embedding 漂移，必要时回滚模型。',
      card_type: 'concept',
      priority: 0.82,
      stability: 0.67,
      next_due: null,
      direction_id: 'd111aaaa-2222-4bbb-9ccc-333344445555',
      direction_name: 'AI × Retrieval',
      skill_point_id: null,
      skill_point_name: null,
    },
  ],
  evidence: [
    {
      id: 'evid-aaaa-bbbb-cccc-ddddeeeeffff',
      excerpt: 'Embedding 精度在 14 天回归后重新拉升 8%，说明清洗有效。',
      source_type: 'notion',
      source_uri: 'https://example.com/notes/embedding',
      credibility: 4,
      captured_at: '2025-06-15T10:00:00Z',
      card_id: 'c1f1e800-1111-4d1e-b5e6-aaaaaaaaaaaa',
      card_title: 'Embedding pipeline health checklist',
      direction_id: 'd111aaaa-2222-4bbb-9ccc-333344445555',
      direction_name: 'AI × Retrieval',
    },
  ],
  evergreen: [
    {
      id: 'c3f1e800-1111-4d1e-b5e6-cccccccccccc',
      title: 'Embedding 质量复盘模板',
      summary: '每周复盘 embedding 指标：召回率、延迟、相似度阈值，并记录改进项。',
      stability: 0.78,
      application_count: 5,
      last_applied_at: '2025-06-14T09:30:00Z',
      direction_id: 'd111aaaa-2222-4bbb-9ccc-333344445555',
      direction_name: 'AI × Retrieval',
    },
  ],
  applications: [
    {
      id: 'app-aaaa-bbbb-cccc-ddddeeeeffff',
      context: '在 PRD 复盘中引用 embedding 监控模板，帮助识别向量漂移根因。',
      noted_at: '2025-06-16T12:30:00Z',
      impact_score: 74.5,
      card_id: 'c2f1e800-1111-4d1e-b5e6-bbbbbbbbbbbb',
      card_title: 'Vector drift diagnostics',
      direction_id: 'd111aaaa-2222-4bbb-9ccc-333344445555',
      direction_name: 'AI × Retrieval',
      skill_point_id: 'sp-cccc-1111-2222-3333ddddaaaa',
      skill_point_name: '数据验证',
    },
  ],
  directions: [
    {
      id: 'd111aaaa-2222-4bbb-9ccc-333344445555',
      name: 'AI × Retrieval',
      stage: 'attack',
      quarterly_goal: '上线 embedding 监控体系并完成一次回归分析。',
      card_count: 42,
      skill_point_count: 6,
    },
  ],
};

export const mockSearchSuggestions: SearchSuggestionsResponse = {
  groups: [
    {
      id: 'quickstart',
      title: '快速提示',
      hint: '结合最近训练推荐的检索词与操作',
      items: [
        {
          id: 'quick-embedding-review',
          label: '复盘 embedding 监控',
          description: '回顾最近一次漂移复盘提到的三步检查表。',
          pill: '推荐',
          action: { type: 'search', query: 'embedding' },
        },
        {
          id: 'quick-draft-async',
          label: '向 AI 请求 async 诊断清单',
          description: '打开 Draft Studio 生成针对 async runtime 的检查项。',
          pill: 'AI Draft',
          action: { type: 'navigate', href: '/(tabs)/intelligence' },
        },
      ],
    },
    {
      id: 'recent-directions',
      title: '最近方向',
      items: [
        {
          id: 'suggest-dir-rag',
          label: 'AI × Retrieval',
          description: '攻坚 · 48 张卡片',
          pill: '攻坚',
          action: { type: 'navigate', href: '/tree?direction=dir-rag' },
        },
        {
          id: 'suggest-dir-systems',
          label: 'Rust × Systems',
          description: '成型 · 36 张卡片',
          pill: '成型',
          action: { type: 'navigate', href: '/tree?direction=dir-systems' },
        },
      ],
    },
    {
      id: 'skill-focus',
      title: '技能热区',
      hint: '点击快速检索相关卡片与证据',
      items: [
        {
          id: 'suggest-skill-embedding',
          label: 'Embedding 质量诊断',
          description: '5 张卡片 · 近期 4 条证据更新',
          pill: '技能',
          action: { type: 'search', query: 'Embedding 质量诊断' },
        },
        {
          id: 'suggest-skill-async',
          label: 'Async Runtime Mastery',
          description: '4 张卡片 · 最近 2 次应用记录',
          pill: '技能',
          action: { type: 'search', query: 'Async Runtime' },
        },
      ],
    },
  ],
};
