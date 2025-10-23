import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ImportScreen from '../app/import';
import { AppProvider } from '@/providers';
import { emitShareImportIntent } from '@/features/import';

describe('Share sheet import integration', () => {
  const renderImport = () =>
    render(
      <AppProvider>
        <ImportScreen />
      </AppProvider>,
    );

  it('prefills form fields and triggers preview from share payloads', async () => {
    renderImport();

    await screen.findByText('导入上下文');

    act(() => {
      emitShareImportIntent({
        directionId: 'dir-systems',
        directionName: 'Rust × Systems',
        language: 'en',
        desiredCardsPerCluster: 5,
        autoPreview: true,
        sources: [
          {
            kind: 'markdown',
            title: 'Async 调度优化',
            content: '使用 affinity hints 降低 IO 线程饥饿，结合 steal 队列均衡负载。',
            url: 'https://notes.example.dev/runtime',
            tags: ['runtime', 'async'],
          },
        ],
      });
    });

    await waitFor(() =>
      expect(
        screen.getByText('已载入分享内容并生成卡片草稿。'),
      ).toBeTruthy(),
    );

    expect(screen.getByDisplayValue('Rust × Systems')).toBeTruthy();
    expect(screen.getByDisplayValue('en')).toBeTruthy();
    expect(screen.getByDisplayValue('Async 调度优化')).toBeTruthy();

    await screen.findByText('生成结果');
    await screen.findByText(/Async Runtime 调度/);
  });

  it('merges multiple shared sources into the preview materials', async () => {
    renderImport();

    await screen.findByText('导入上下文');

    act(() => {
      emitShareImportIntent({
        autoPreview: true,
        sources: [
          {
            kind: 'markdown',
            title: '分布式事务对账',
            content: '使用 SAGA 保障最终一致，结合补偿任务收敛。',
            tags: ['saga', 'consistency'],
          },
          {
            kind: 'code',
            title: '双阶段提交实现',
            content: 'fn prepare(tx) { /* ... */ }',
            url: 'https://gist.example.dev/two-phase',
            tags: ['2pc'],
          },
        ],
      });
    });

    await waitFor(() =>
      expect(
        screen.getByText('已载入分享内容并生成卡片草稿。'),
      ).toBeTruthy(),
    );

    await screen.findByText('生成结果');
    await screen.findByText('分布式事务对账');
    await screen.findByText('双阶段提交实现');
  });

  it('respects autoPreview = false by awaiting manual confirmation', async () => {
    renderImport();

    await screen.findByText('导入上下文');

    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockClear();

    act(() => {
      emitShareImportIntent({
        autoPreview: false,
        directionName: '多模态问答',
        language: 'en',
        desiredCardsPerCluster: 8,
        sources: [
          {
            kind: 'markdown',
            title: 'Retriever 召回数据',
            content: 'MM-RAG 召回准确率 72%，需要扩充多模态特征。',
          },
        ],
      });
    });

    await waitFor(() =>
      expect(
        screen.getByText('已载入分享的材料，准备生成卡片草稿。'),
      ).toBeTruthy(),
    );

    expect(screen.queryByText('生成结果')).toBeNull();
    expect(
      fetchMock.mock.calls.filter(
        ([url]) => typeof url === 'string' && url.endsWith('/api/import/preview'),
      ),
    ).toHaveLength(0);

    const previewButton = screen.getByText('生成卡片草稿');
    await act(async () => {
      fireEvent.press(previewButton);
    });

    await screen.findByText('生成结果');
  });

  it('surfaces an error message when the shared payload is empty', async () => {
    renderImport();

    await screen.findByText('导入上下文');

    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockClear();

    act(() => {
      emitShareImportIntent({
        autoPreview: true,
        sources: [],
      });
    });

    await waitFor(() =>
      expect(screen.getByText('分享内容为空，无法生成卡片。')).toBeTruthy(),
    );

    expect(screen.queryByText('生成结果')).toBeNull();
    expect(
      fetchMock.mock.calls.filter(
        ([url]) => typeof url === 'string' && url.endsWith('/api/import/preview'),
      ),
    ).toHaveLength(0);
  });
});
