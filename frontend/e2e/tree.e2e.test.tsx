import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TreeScreen from '../app/(tabs)/tree';
import { AppProvider } from '@/providers';
import { resetMockDirectionData } from '@/mocks/fixtures/directions';

const renderTree = () =>
  render(
    <AppProvider>
      <TreeScreen />
    </AppProvider>,
  );

describe('Tree screen end-to-end', () => {
  beforeEach(() => {
    resetMockDirectionData();
  });

  it('displays the tree snapshot and switches between branches', async () => {
    renderTree();

    await screen.findByText('方向树');
    await screen.findAllByText('AI × Retrieval');
    await screen.findAllByText('Rust × Systems');

    await screen.findAllByText(/攻坚阶段 ·/);

    const [rustBranch] = screen.getAllByText('Rust × Systems');
    fireEvent.press(rustBranch);

    await screen.findAllByText(/成型阶段 ·/);
    await screen.findByText('Async Runtime Mastery');
    await screen.findByText('低层内存安全');
    await screen.findByText('自定义 Waker 的三步校验');
  });

  it('creates new structures and reflects them in the tree snapshot', async () => {
    renderTree();

    await screen.findByText('方向树');

    fireEvent.changeText(screen.getByPlaceholderText('Direction name'), 'Model Compression');
    fireEvent.changeText(
      screen.getByPlaceholderText('Quarterly goal (optional)'),
      '完成蒸馏与量化评审',
    );
    fireEvent.press(screen.getByText('Create direction'));

    await screen.findByText('Model Compression');
    const [newDirectionCard] = screen.getAllByText('Model Compression');
    fireEvent.press(newDirectionCard);

    await screen.findByText('暂无技能点');
    await screen.findByText('Add Skill Point');

    fireEvent.changeText(screen.getByPlaceholderText('Name'), '模型压缩策略');
    fireEvent.changeText(screen.getByPlaceholderText('Summary (optional)'), '聚焦量化与剪枝协同');
    fireEvent.press(screen.getByText('Add skill point'));

    await screen.findAllByText('模型压缩策略');
    await screen.findByText('掌握度：未评估');
    await screen.findByText('暂无卡片');

    fireEvent.changeText(screen.getByPlaceholderText('Title'), '量化步骤检查单');
    fireEvent.changeText(screen.getByPlaceholderText('Body'), '对齐指标 → 选择方案 → 离线校验 → 上线监控');
    fireEvent.press(screen.getByText('Add card'));

    await screen.findByText('量化步骤检查单');
    await waitFor(() => screen.getByText('探索阶段 · 1 卡片'));
    await screen.findByText(/复习 /);
  });
});
