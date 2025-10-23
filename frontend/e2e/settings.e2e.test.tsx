import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import SettingsScreen from '../app/settings';
import { AppProvider } from '@/providers';

describe('Settings workspace end-to-end', () => {
  const renderSettings = () =>
    render(
      <AppProvider>
        <SettingsScreen />
      </AppProvider>,
    );

  it('loads summary metrics and generates export snapshot', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    renderSettings();

    await screen.findByText('设置与导出');
    await screen.findByText('数据概览');
    await screen.findByText('数据目录');
    await screen.findByText('数据库大小');
    await screen.findByText('实体总览');

    await act(async () => {
      fireEvent.press(screen.getByText('刷新概览'));
    });

    await act(async () => {
      fireEvent.press(screen.getByText('生成导出'));
    });

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        '导出完成',
        expect.stringContaining('已整理'),
      ),
    );

    await screen.findByText('最近导出');
    await screen.findByText('方向');
    await screen.findByText('技能点');
    await screen.findByText('卡片');
    await screen.findByText('证据');
    await screen.findByText('标签');
    await screen.findByText(/共 .* 条记录/);

    alertSpy.mockRestore();
  });

  it('updates notification preferences', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    renderSettings();

    await screen.findByText('提醒设置');
    await screen.findByDisplayValue('20:30');

    const dailyTimeInput = screen.getByDisplayValue('20:30');
    fireEvent.changeText(dailyTimeInput, '21:15');

    const dueTimeInput = screen.getByDisplayValue('18:45');
    fireEvent.changeText(dueTimeInput, '19:00');

    const remindMinutesInput = screen.getByDisplayValue('45');
    fireEvent.changeText(remindMinutesInput, '30');

    const reviewOptions = screen.getAllByText('复习');
    fireEvent.press(reviewOptions[0]);

    const todayOptions = screen.getAllByText('今日');
    fireEvent.press(todayOptions[1]);

    fireEvent.press(screen.getByText('保存提醒设置'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('通知已更新', '提醒设置保存成功。'),
    );

    await screen.findByDisplayValue('21:15');
    await screen.findByDisplayValue('19:00');
    await screen.findByDisplayValue('30');

    alertSpy.mockRestore();
  });
});
