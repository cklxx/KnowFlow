import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useVaultSnapshot, VaultAnnotationList, VaultCardList, VaultEvergreenList, VaultHighlightList } from '@/features/vault';
import { useTheme } from '@/providers';
import { Card, Screen, SegmentedControl, Text } from '@/ui/components';

type LayerKey = 'highlights' | 'annotations' | 'cards' | 'evergreen';

export default function VaultScreen() {
  const { theme } = useTheme();
  const [layer, setLayer] = useState<LayerKey>('highlights');
  const { data, isLoading, isRefetching, refetch, error } = useVaultSnapshot();

  const segments = useMemo(
    () => [
      { value: 'highlights', label: 'L1 高光', description: '原文摘录' },
      { value: 'annotations', label: 'L2 标注', description: '任务应用' },
      { value: 'cards', label: 'L3 卡片', description: '记忆单元' },
      { value: 'evergreen', label: 'L4 Evergreen', description: '沉淀复用' },
    ],
    [],
  );

  const renderLayer = () => {
    if (!data) {
      if (isLoading) {
        return (
          <Card style={styles.loadingCard}>
            <ActivityIndicator color={theme.colors.accent} />
            <Text style={{ color: theme.colors.textMuted }}>加载知识库内容中…</Text>
          </Card>
        );
      }

      if (error) {
        return (
          <Card style={styles.loadingCard}>
            <Text style={{ color: theme.colors.danger }}>拉取数据失败，请稍后重试。</Text>
          </Card>
        );
      }

      return null;
    }

    switch (layer) {
      case 'highlights':
        return <VaultHighlightList items={data.highlights} />;
      case 'annotations':
        return <VaultAnnotationList items={data.annotations} />;
      case 'cards':
        return <VaultCardList items={data.cards} />;
      case 'evergreen':
        return <VaultEvergreenList items={data.evergreen} />;
      default:
        return null;
    }
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(isLoading || isRefetching)}
            onRefresh={() => refetch()}
            tintColor={theme.colors.accent}
          />
        }
      >
        <View style={styles.header}>
          <Text variant="title">Vault</Text>
          <Text variant="caption" style={{ color: theme.colors.textMuted }}>
            分层浏览高光、标注、卡片与沉淀的 Evergreen 笔记。
          </Text>
        </View>
        <SegmentedControl
          options={segments}
          value={layer}
          onChange={(value) => setLayer(value as LayerKey)}
        />
        <View style={styles.listContainer}>{renderLayer()}</View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
    gap: 20,
  },
  header: {
    gap: 6,
  },
  listContainer: {
    gap: 16,
  },
  loadingCard: {
    alignItems: 'center',
    gap: 12,
  },
});
