import { fireEvent, render, screen } from '@testing-library/react-native';

import VaultScreen from '../app/(tabs)/vault';
import { AppProvider } from '@/providers';

const renderVault = () =>
  render(
    <AppProvider>
      <VaultScreen />
    </AppProvider>,
  );

describe('Vault screen end-to-end', () => {
  it('renders layered knowledge views and switches between segments', async () => {
    renderVault();

    await screen.findByText('Vault');
    await screen.findByText('L1 高光');
    await screen.findByText('AI × Retrieval');
    await screen.findByText('efConstruction 调整到 240 后，线下召回率回升至 0.93，但内存占用需同步扩容。');

    fireEvent.press(screen.getByText('L2 标注'));
    await screen.findByText('凌晨排查召回率骤降，定位为增量构建任务延后 18 分钟。');
    await screen.findByText('上线前 checklist 复核通过，自定义 Waker 未再触发 double wake。');

    fireEvent.press(screen.getByText('L3 卡片'));
    await screen.findByText('HNSW 图分层参数如何影响召回率');
    await screen.findAllByText('类型：concept');

    fireEvent.press(screen.getByText('L4 Evergreen'));
    await screen.findByText('Embedding 漂移响应手册');
    await screen.findAllByText('应用次数');
    await screen.findByText(/0\.71/);
  });
});
