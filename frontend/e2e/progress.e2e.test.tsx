import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

import MoreScreen from '../app/(tabs)/more';
import { AppProvider } from '@/providers';

const renderMore = () =>
  render(
    <AppProvider>
      <MoreScreen />
    </AppProvider>,
  );

describe('Progress overview end-to-end', () => {
  it('displays mastery, retention, streaks, and recommendations', async () => {
    renderMore();

    await screen.findByText('Progress');
    await screen.findByText('掌握概览');
    await screen.findByText('总卡片');
    await screen.findByText('方向表现');
    await screen.findByText('攻坚');
    await screen.findByText('平均技能 2.6 · 待复习 9');
    await screen.findByText('技能热区');
    await screen.findByText('向量检索调参');
    await screen.findByText('记忆保持');
    await screen.findByText('最近趋势');
    await screen.findByText(/86%/);
    await screen.findByText(/7 题/);
    await screen.findByText('训练节奏');
    await screen.findByText('学习势能');
    await screen.findByText('知识速度 (KV)');
    await screen.findByText('7 天均值 +0.92');
    await screen.findByText('30 天均值 +0.54');
    await screen.findByText('不确定性下降率 (UDR)');
    await screen.findByText('7 天均值 +38%');
    await screen.findByText('系统建议');
    await screen.findByText(/优先清理 AI × Retrieval 的待复习/);
    await screen.findByText('最近应用');
    await screen.findByText('Dense Retriever 召回调优 checklist');
    await screen.findByText(/影响力 86/);
  });
});
