import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { DirectionList, MemoryCardList, SkillPointList } from '@/features/directions/components';
import { DirectionDetail, DirectionSummaryList, useTreeSnapshot } from '@/features/tree';
import { useTheme } from '@/providers';
import { Card, Screen, Text } from '@/ui/components';

export default function TreeScreen() {
  const { data, isLoading, isError } = useTreeSnapshot();
  const { theme } = useTheme();
  const [selectedDirectionId, setSelectedDirectionId] = useState<string | undefined>(undefined);

  const branches = useMemo(() => data?.directions ?? [], [data?.directions]);

  useEffect(() => {
    if (!branches.length) {
      setSelectedDirectionId(undefined);
      return;
    }

    if (!selectedDirectionId) {
      setSelectedDirectionId(branches[0].direction.id);
      return;
    }

    if (!branches.some((branch) => branch.direction.id === selectedDirectionId)) {
      setSelectedDirectionId(branches[0].direction.id);
    }
  }, [branches, selectedDirectionId]);

  const summary = useMemo(
    () =>
      branches.reduce(
        (acc, branch) => {
          acc.skillPoints += branch.metrics.skill_point_count;
          acc.cards += branch.metrics.card_count;
          return acc;
        },
        { skillPoints: 0, cards: 0 },
      ),
    [branches],
  );

  const activeBranch = branches.find((branch) => branch.direction.id === selectedDirectionId);

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <View style={styles.center}>
          <Card variant="outline" style={styles.statusCard}>
            <Text variant="subtitle">方向树加载失败</Text>
            <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
              稍后再试。
            </Text>
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text variant="title">方向树</Text>
            <Text variant="caption" style={{ color: theme.colors.textSecondary }}>概览</Text>
          </View>
          <View style={styles.summaryRow}>
            <SummaryStat label="方向" value={branches.length} />
            <SummaryStat label="技能点" value={summary.skillPoints} />
            <SummaryStat label="卡片" value={summary.cards} />
          </View>
        </View>

        <Card variant="outline" style={styles.treeLayout}>
          <View style={styles.sidebar}>
            <DirectionSummaryList
              directions={branches}
              selectedId={selectedDirectionId}
              onSelect={setSelectedDirectionId}
            />
          </View>
          <View style={styles.detail}>
            <DirectionDetail branch={activeBranch} />
          </View>
        </Card>

        <Card variant="outline" style={styles.manageSection}>
          <Text variant="subtitle">结构管理</Text>
          <View style={styles.managerGrid}>
            <Card variant="outline" style={styles.managerColumn}>
              <Text variant="caption" style={styles.managerLabel}>
                方向
              </Text>
              <DirectionList selectedId={selectedDirectionId} onSelect={setSelectedDirectionId} />
            </Card>
            <Card variant="outline" style={styles.managerColumn}>
              <Text variant="caption" style={styles.managerLabel}>
                技能点
              </Text>
              <SkillPointList directionId={selectedDirectionId} />
            </Card>
            <Card variant="outline" style={styles.managerColumn}>
              <Text variant="caption" style={styles.managerLabel}>
                卡片
              </Text>
              <MemoryCardList directionId={selectedDirectionId} />
            </Card>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const SummaryStat = ({ label, value }: { label: string; value: number }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.summaryStat, { backgroundColor: theme.colors.surfaceAlt }]}>
      <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
        {label}
      </Text>
      <Text variant="subtitle">{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
    gap: 24,
  },
  header: {
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryStat: {
    flex: 1,
    minWidth: 96,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
    borderRadius: 14,
  },
  treeLayout: {
    gap: 16,
    padding: 20,
  },
  sidebar: {
    gap: 12,
  },
  detail: {
    gap: 16,
  },
  manageSection: {
    gap: 16,
    padding: 20,
  },
  managerGrid: {
    gap: 12,
  },
  managerColumn: {
    gap: 12,
    padding: 16,
  },
  managerLabel: {
    marginBottom: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  statusCard: {
    alignItems: 'flex-start',
  },
});
