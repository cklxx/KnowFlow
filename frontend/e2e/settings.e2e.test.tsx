import { act, fireEvent, render, screen } from '@testing-library/react-native';
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
    await screen.findByText('最近训练完成');

    await screen.findByText('通知与提醒');
    await screen.findByText('每日提醒');
    await screen.findByText('逾期提醒');

    const dailySwitch = await screen.findByLabelText('切换每日提醒');
    const dueSwitch = await screen.findByLabelText('切换逾期提醒');

    await act(async () => {
      fireEvent(dailySwitch, 'valueChange', false);
    });

    expect(screen.getByLabelText('切换每日提醒')).toHaveProp('value', false);

    await act(async () => {
      fireEvent(dailySwitch, 'valueChange', true);
    });

    await act(async () => {
      fireEvent.press(screen.getByText('21:30'));
    });

    await act(async () => {
      fireEvent.press(screen.getAllByText('快问快答')[0]);
    });

    await act(async () => {
      fireEvent(dueSwitch, 'valueChange', false);
    });

    expect(screen.getByLabelText('切换逾期提醒')).toHaveProp('value', false);

    await act(async () => {
      fireEvent(dueSwitch, 'valueChange', true);
    });

    await act(async () => {
      fireEvent.press(screen.getByText('提前 60 分钟'));
    });

    await screen.findByText(/最近更新于/);

    await act(async () => {
      fireEvent.press(screen.getByText('生成导出'));
    });

    expect(alertSpy).toHaveBeenCalledWith(
      '导出完成',
      expect.stringContaining('已整理'),
    );

    await screen.findByText('最近导出');
    await screen.findByText('方向');
    await screen.findByText('技能点');
    await screen.findByText('卡片');
    await screen.findByText(/共 .* 条记录/);

    alertSpy.mockRestore();
  });
});
