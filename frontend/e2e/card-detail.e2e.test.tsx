import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import CardDetailScreen from '../app/cards/[id]';
import { AppProvider } from '@/providers';
import { resetMockDirectionData } from '@/mocks/fixtures/directions';

type GlobalWithRouterSetter = typeof globalThis & {
  __setMockRouterParams?: (params: Record<string, string>) => void;
};

const setRouterParams = (params: Record<string, string>) => {
  (global as GlobalWithRouterSetter).__setMockRouterParams?.(params);
};

const renderCardDetail = () =>
  render(
    <AppProvider>
      <CardDetailScreen />
    </AppProvider>,
  );

describe('Card detail screen end-to-end', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    resetMockDirectionData();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    setRouterParams({ id: 'card-hnsw-graph' });
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('edits card properties and manages evidence lifecycle', async () => {
    setRouterParams({ id: 'card-hnsw-graph' });

    renderCardDetail();

    await screen.findByText('卡片详情');
    await screen.findByDisplayValue('HNSW 图分层参数如何影响召回率');
    await screen.findByText('Credibility: 0.9');

    fireEvent.changeText(screen.getByPlaceholderText('标题'), 'HNSW 图分层参数检查');
    fireEvent.press(screen.getByText('保存修改'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('已保存', '卡片详情已更新'),
    );
    await screen.findByDisplayValue('HNSW 图分层参数检查');

    fireEvent.changeText(screen.getByPlaceholderText('例如 url / note / code'), 'lab-note');
    fireEvent.changeText(screen.getByDisplayValue('0'), '1.2');
    fireEvent.changeText(
      screen.getByPlaceholderText('来源链接（可选）'),
      'https://knowflow.dev/evidence',
    );
    fireEvent.changeText(screen.getByPlaceholderText('摘录或代码片段'), '测试摘录内容');
    const addEvidenceButtons = screen.getAllByText('添加证据');
    fireEvent.press(addEvidenceButtons[addEvidenceButtons.length - 1]);

    await screen.findByText('测试摘录内容');
    await screen.findByText('Credibility: 1.2');

    const deleteButtons = screen.getAllByText('删除');
    fireEvent.press(deleteButtons[0]);

    await waitFor(() => expect(screen.queryByText('测试摘录内容')).toBeNull());

    fireEvent.changeText(
      screen.getByPlaceholderText('描述这张卡片最近的应用场景'),
      '在复盘召回率下降时，根据 checklist 快速定位索引延迟。',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('记录时间（可选，如 2024-09-18T09:30:00Z）'),
      '2024-10-07T08:30:00Z',
    );
    fireEvent.press(screen.getByText('记录应用'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('已记录', '应用场景已登记'),
    );

    await screen.findByText('在复盘召回率下降时，根据 checklist 快速定位索引延迟。');
  });
});
