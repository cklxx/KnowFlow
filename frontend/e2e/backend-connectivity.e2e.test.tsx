import { render, screen } from '@testing-library/react-native';

import TodayScreen from '../app/(tabs)/today';
import { AppProvider } from '@/providers';
import type { OnboardingBootstrapPayload, OnboardingBootstrapResult } from '@api';

type Fetch = typeof fetch;

defineGlobalFetch();

const liveApiFlag = (process.env.E2E_USE_LIVE_API ?? '').toLowerCase();
const useLiveApi = liveApiFlag === '1' || liveApiFlag === 'true';

let seededPlan: OnboardingBootstrapResult['today_plan'] | null = null;

const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000';

const onboardingSeed: OnboardingBootstrapPayload = {
  directions: [
    {
      name: 'Live Direction · Retrieval',
      stage: 'attack',
      quarterly_goal: '验证向量检索指标与 KV/UDR 提升',
      skills: [
        {
          name: '向量索引调优',
          summary: '定位召回率瓶颈与内存边界',
          level: 'working',
        },
        {
          name: 'Embedding 质量诊断',
          summary: '建立覆盖率与漂移指标体系',
          level: 'emerging',
        },
      ],
      cards: [
        {
          title: 'HNSW 图的建层参数如何影响召回率',
          body: '调节 efConstruction 与 M 以平衡召回率与内存占用。',
          card_type: 'concept',
          skill_point_name: '向量索引调优',
        },
        {
          title: '排查向量检索召回率下降的首要步骤',
          body: '对比离线评估与在线日志，定位增量索引与热点向量漂移。',
          card_type: 'procedure',
          skill_point_name: '向量索引调优',
        },
        {
          title: 'Embedding 漂移监控需要关注的三条指标',
          body: '覆盖率、范数分布与 ANN 召回率趋势超过阈值即触发回滚。',
          card_type: 'fact',
          skill_point_name: 'Embedding 质量诊断',
        },
      ],
    },
  ],
};

function defineGlobalFetch() {
  const globalWithFetch = global as typeof globalThis & { fetch?: Fetch };
  if (!globalWithFetch.fetch) {
    globalWithFetch.fetch = fetch;
  }
}

(useLiveApi ? describe : describe.skip)('Live backend connectivity', () => {
  beforeAll(async () => {
    const response = await fetch(`${baseUrl}/api/onboarding/bootstrap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(onboardingSeed),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to bootstrap onboarding data: ${response.status} ${text}`);
    }

    const result = (await response.json()) as OnboardingBootstrapResult;
    seededPlan = result.today_plan;
  });

  it('renders today workout data from the live backend', async () => {
    expect(seededPlan).not.toBeNull();

    const firstCardTitle = seededPlan?.segments[0]?.items[0]?.card.title;

    render(
      <AppProvider>
        <TodayScreen />
      </AppProvider>,
    );

    await screen.findByText('今日训练');
    await screen.findByText('今日焦点');

    if (firstCardTitle) {
      await screen.findByText(firstCardTitle);
    }

    expect(
      screen.queryByText('今日暂无训练计划，导入材料或创建卡片以启动。'),
    ).toBeNull();
  });
});
