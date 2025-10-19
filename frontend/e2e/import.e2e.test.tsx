import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ImportScreen from '../app/import';
import { AppProvider } from '@/providers';
import { resetMockDirectionData } from '@/mocks/fixtures/directions';

describe('Import screen end-to-end', () => {
  const renderImport = () =>
    render(
      <AppProvider>
        <ImportScreen />
      </AppProvider>,
    );

  beforeEach(() => {
    resetMockDirectionData();
  });

  it('generates an import preview and commits selected drafts', async () => {
    renderImport();

    await screen.findByText('导入上下文');

    fireEvent.changeText(screen.getByPlaceholderText('例如：AI × 阅读萃取'), 'Agentic Retrieval Diagnostics');
    fireEvent.changeText(screen.getByPlaceholderText('zh / en'), 'zh');

    fireEvent.changeText(screen.getByPlaceholderText('可选标题'), 'Embedding Drift RCA');
    fireEvent.changeText(screen.getByPlaceholderText('方向, 主题'), 'retrieval, drift');
    fireEvent.changeText(
      screen.getByPlaceholderText('粘贴材料、代码或总结'),
      '离线评估覆盖率下滑 12%，上线后 query 长尾错配，需要监测 embedding 漂移。',
    );
    fireEvent.changeText(screen.getByPlaceholderText('https://...'), 'https://example.com/drift');

    fireEvent.press(screen.getByText('生成卡片草稿'));

    await screen.findByText('生成结果');
    await screen.findByText(/Embedding 漂移排查/);
    await screen.findByText('Embedding 漂移应急检查单');
    await screen.findByText('Embedding 监控指标分层');
    await screen.findByText('Embedding Drift RCA');

    const commitButton = screen.getByRole('button', { name: '写入选中卡片' });
    expect(commitButton).toBeEnabled();

    fireEvent.press(commitButton);

    await waitFor(() =>
      expect(screen.getByText('已写入选中的卡片到当前方向。')).toBeTruthy(),
    );
  });
});
