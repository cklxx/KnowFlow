import { act, fireEvent, render, screen } from '@testing-library/react-native';

import OnboardingScreen from '../app/onboarding';
import { AppProvider } from '@/providers';

describe('Onboarding flow end-to-end', () => {
  const renderOnboarding = () =>
    render(
      <AppProvider>
        <OnboardingScreen />
      </AppProvider>,
    );

  it('guides through direction setup, generates drafts, and bootstraps data', async () => {
    renderOnboarding();

    await screen.findByText('快速上手');
    await screen.findByText(/挑选 3–5 个最想推进的主题/);

    fireEvent.press(screen.getByText('下一步'));
    await screen.findByText(/为每个方向标定阶段/);

    fireEvent.press(screen.getByText('下一步'));
    await screen.findByText(/梳理关键技能并做 0–3 级自评/);

    fireEvent.press(screen.getByText('下一步'));
    await screen.findByText(/粘贴最近的材料片段/);

    const materialInputs = await screen.findAllByPlaceholderText('粘贴原文/代码/摘要……');
    fireEvent.changeText(materialInputs[0], '向量检索 pipeline 复盘，梳理指标与调优策略。');

    const generateButtons = screen.getAllByText('生成卡片草稿');
    await act(async () => {
      fireEvent.press(generateButtons[0]);
    });

    await screen.findByText(/关键洞察 1/);
    await screen.findAllByText(/置信度/);

    fireEvent.press(screen.getByText('下一步'));
    await screen.findByText('今日训练预览');

    await act(async () => {
      fireEvent.press(screen.getByText('完成引导'));
    });

    await screen.findByText('已完成初始化');
    await screen.findByText(/今日计划：共/);

    const router = (global as unknown as { __getMockRouter: () => { replace: jest.Mock } }).__getMockRouter();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
