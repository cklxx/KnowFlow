import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import SearchScreen from '../app/(tabs)/search';
import { AppProvider } from '@/providers';

describe('Search screen end-to-end', () => {
  const renderSearch = () =>
    render(
      <AppProvider>
        <SearchScreen />
      </AppProvider>,
    );

  it('shows suggestions and loads grouped results after quick search', async () => {
    renderSearch();

    await screen.findByText('快速提示');
    await screen.findByText('最近方向');
    await screen.findByText('技能热区');

    fireEvent.press(screen.getByLabelText('使用建议：复盘 embedding 监控'));
    act(() => {
      jest.runOnlyPendingTimers();
    });

    await waitFor(() => expect(screen.getByDisplayValue('embedding')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('卡片')).toBeTruthy());
    await waitFor(() =>
      expect(screen.getAllByText(/Embedding pipeline health checklist/).length).toBeGreaterThan(0),
    );
    await waitFor(() => expect(screen.getByText('证据')).toBeTruthy());
    await waitFor(() =>
      expect(
        screen.getByText(/Embedding 精度在 14 天回归后重新拉升 8%，说明清洗有效。/),
      ).toBeTruthy(),
    );
    await waitFor(() => expect(screen.getByText('Evergreen')).toBeTruthy());
    await waitFor(() => expect(screen.getByText(/Embedding 质量复盘模板/)).toBeTruthy());
    await waitFor(() => expect(screen.getByText('应用')).toBeTruthy());
    await waitFor(() => expect(screen.getByText(/影响力 74\.50/)).toBeTruthy());
    await waitFor(() => expect(screen.getByText('方向')).toBeTruthy());
    await waitFor(() => expect(screen.getAllByText('AI × Retrieval').length).toBeGreaterThan(0));
  });
});
