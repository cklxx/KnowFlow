import { render, screen, fireEvent } from '@testing-library/react-native';

import TodayScreen from '../app/(tabs)/today';
import { AppProvider } from '@/providers';

describe('Today screen end-to-end', () => {
  const renderToday = () =>
    render(
      <AppProvider>
        <TodayScreen />
      </AppProvider>,
    );

  it('loads mock workout, records answers, and submits summary', async () => {
    renderToday();

    await screen.findByText('今日训练');
    await screen.findByText('今日焦点');
    await screen.findByText(/已完成 0\/3 张 · 0%/);

    const passButtons = await screen.findAllByText('通过');
    passButtons.forEach((button) => fireEvent.press(button));

    const retryButtons = await screen.findAllByText('重练');
    fireEvent.press(retryButtons[1]);

    await screen.findByText(/已完成 3\/3 张 · 100%/);
    expect(screen.getAllByText(/已标记/)[0]).toHaveTextContent('已标记 2/2');

    fireEvent.press(screen.getByText('提交结果'));

    await screen.findByText('今日更新');
    await screen.findByText('UDR');
    await screen.findByText('方向表现');
    const directionLabels = await screen.findAllByText('AI × Retrieval');
    expect(directionLabels.length).toBeGreaterThan(0);
    await screen.findByText('技能表现');
    await screen.findByText('下一块砖：下一步复盘 embedding 质量诊断');
  });
});
