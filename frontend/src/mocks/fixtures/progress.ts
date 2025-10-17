import type { ProgressSnapshot } from '@/lib/api/types';

export const mockProgressSnapshot: ProgressSnapshot = {
  totals: {
    total_cards: 128,
    active_directions: 4,
    due_today: 12,
    overdue: 3,
    avg_stability: 0.67,
  },
  activity: {
    workouts_completed_7d: 5,
    new_cards_7d: 14,
    applications_logged_7d: 6,
  },
  mastery: {
    directions: [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'AI × Retrieval',
        stage: 'attack',
        avg_skill_level: 2.6,
        card_count: 48,
        due_next_7d: 9,
        recent_pass_rate: 0.72,
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Rust × Systems',
        stage: 'shape',
        avg_skill_level: 2.1,
        card_count: 36,
        due_next_7d: 5,
        recent_pass_rate: 0.82,
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Product × Narrative',
        stage: 'explore',
        avg_skill_level: 1.4,
        card_count: 22,
        due_next_7d: 3,
        recent_pass_rate: 0.63,
      },
    ],
    skill_gaps: [
      {
        id: '44444444-4444-4444-4444-444444444444',
        direction_id: '11111111-1111-1111-1111-111111111111',
        direction_name: 'AI × Retrieval',
        name: '向量检索调参',
        level: 'emerging',
        card_count: 8,
        due_next_7d: 4,
        recent_fail_rate: 0.4,
      },
      {
        id: '55555555-5555-5555-5555-555555555555',
        direction_id: '22222222-2222-2222-2222-222222222222',
        direction_name: 'Rust × Systems',
        name: '异步诊断',
        level: 'working',
        card_count: 6,
        due_next_7d: 2,
        recent_fail_rate: 0.2,
      },
    ],
  },
  retention: {
    retention_7d: 0.78,
    retention_30d: 0.84,
    retention_90d: 0.87,
    trend: [
      {
        date: new Date().toISOString().slice(0, 10),
        pass_rate: 0.86,
        total_reviews: 7,
      },
      {
        date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().slice(0, 10),
        pass_rate: 0.74,
        total_reviews: 5,
      },
      {
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString().slice(0, 10),
        pass_rate: 0.91,
        total_reviews: 6,
      },
      {
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString().slice(0, 10),
        pass_rate: 0.67,
        total_reviews: 4,
      },
      {
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString().slice(0, 10),
        pass_rate: 0.8,
        total_reviews: 5,
      },
    ],
  },
  streaks: {
    current: 2,
    longest: 8,
    last_completed_at: new Date().toISOString(),
  },
  applications: [
    {
      id: '66666666-6666-6666-6666-666666666666',
      card_id: '11111111-aaaa-1111-aaaa-111111111111',
      direction_id: '11111111-1111-1111-1111-111111111111',
      direction_name: 'AI × Retrieval',
      skill_point_id: '44444444-4444-4444-4444-444444444444',
      skill_point_name: '向量检索调参',
      card_title: 'Dense Retriever 召回调优 checklist',
      context:
        '在复盘最近的评测时，基于 checklist 找到了 embedding 标准化的缺失并立刻修复。',
      noted_at: new Date().toISOString(),
      impact_score: 86.0,
    },
    {
      id: '77777777-7777-7777-7777-777777777777',
      card_id: '22222222-bbbb-2222-bbbb-222222222222',
      direction_id: '22222222-2222-2222-2222-222222222222',
      direction_name: 'Rust × Systems',
      skill_point_id: null,
      skill_point_name: null,
      card_title: 'Async Runtime 诊断路径',
      context: '使用诊断路径定位了一处导致任务阻塞的阻塞调用，并输出了修复 PR。',
      noted_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      impact_score: 72.0,
    },
  ],
  recommendations: [
    {
      headline: '优先清理 AI × Retrieval 的待复习',
      rationale: '未来 7 天有 9 张卡片到期，最近 30 天通过率仅 72%'
    },
    {
      headline: '针对 向量检索调参 设计一次应用演练',
      rationale: '当前水平为 emerging，未来 7 天有 4 张卡片到期'
    },
  ],
  momentum: {
    knowledge_velocity: {
      average_7d: 0.92,
      average_30d: 0.54,
      recent: [
        {
          completed_at: new Date().toISOString(),
          value: 1.1,
        },
        {
          completed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
          value: 0.8,
        },
        {
          completed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
          value: 0.6,
        },
      ],
    },
    uncertainty_drop_rate: {
      average_7d: 0.38,
      average_30d: 0.22,
      recent: [
        {
          completed_at: new Date().toISOString(),
          value: 0.42,
        },
        {
          completed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
          value: 0.35,
        },
        {
          completed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
          value: 0.18,
        },
      ],
    },
  },
};
