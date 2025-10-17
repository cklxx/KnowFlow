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

  it('loads aggregated results grouped by section', async () => {
    renderSearch();

    const input = await screen.findByPlaceholderText('搜索方向、卡片、证据或应用');
    fireEvent.changeText(input, 'embedding');
    act(() => {
      jest.runOnlyPendingTimers();
    });

    await waitFor(() => expect(screen.getByText('卡片')).toBeTruthy());
    await waitFor(() =>
      expect(screen.getAllByText(/Embedding pipeline health checklist/).length).toBeGreaterThan(0),
    );
    await waitFor(() => expect(screen.getByText('证据高光')).toBeTruthy());
    await waitFor(() =>
      expect(
        screen.getByText(/Embedding 精度在 14 天回归后重新拉升 8%，说明清洗有效。/),
      ).toBeTruthy(),
    );
    await waitFor(() => expect(screen.getByText('Evergreen 摘要')).toBeTruthy());
    await waitFor(() => expect(screen.getByText(/Embedding 质量复盘模板/)).toBeTruthy());
    await waitFor(() => expect(screen.getByText('最近应用')).toBeTruthy());
    await waitFor(() => expect(screen.getByText(/影响力 74\.50/)).toBeTruthy());
    await waitFor(() => expect(screen.getByText('方向概览')).toBeTruthy());
    await waitFor(() => expect(screen.getAllByText('AI × Retrieval').length).toBeGreaterThan(0));
  });
});
