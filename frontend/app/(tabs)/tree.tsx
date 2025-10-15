import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { DirectionList, MemoryCardList, SkillPointList } from '@/features/directions/components';
import { DirectionDetail, DirectionSummaryList, useTreeSnapshot } from '@/features/tree';
import { useTheme } from '@/providers';
import { Screen } from '@/ui/components/Screen';
import { Text } from '@/ui/components/Text';

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
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text variant="subtitle">无法加载方向树</Text>
          <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
            请稍后重试，或检查后端服务是否运行。
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="title">方向树</Text>
          <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
            从方向 → 技能点 → 卡片的全景地图，辅助日常训练与应用。
          </Text>
          <View style={styles.summaryRow}>
            <SummaryStat label="方向" value={branches.length} />
            <SummaryStat label="技能点" value={summary.skillPoints} />
            <SummaryStat label="卡片" value={summary.cards} />
          </View>
        </View>

        <View style={styles.treeLayout}>
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
        </View>

        <View style={styles.manageSection}>
          <Text variant="subtitle">结构管理</Text>
          <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
            在此维护方向、技能点与卡片映射，保持训练节奏稳定。
          </Text>
          <View style={styles.managerGrid}>
            <View style={styles.managerColumn}>
              <Text variant="caption" style={styles.managerLabel}>
                方向
              </Text>
              <DirectionList selectedId={selectedDirectionId} onSelect={setSelectedDirectionId} />
            </View>
            <View style={styles.managerColumn}>
              <Text variant="caption" style={styles.managerLabel}>
                技能点
              </Text>
              <SkillPointList directionId={selectedDirectionId} />
            </View>
            <View style={styles.managerColumn}>
              <Text variant="caption" style={styles.managerLabel}>
                卡片
              </Text>
              <MemoryCardList directionId={selectedDirectionId} />
            </View>
          </View>
        </View>
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
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryStat: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
  treeLayout: {
    gap: 20,
  },
  sidebar: {
    gap: 12,
  },
  detail: {
    gap: 16,
  },
  manageSection: {
    gap: 16,
  },
  managerGrid: {
    gap: 20,
  },
  managerColumn: {
    gap: 12,
  },
  managerLabel: {
    marginBottom: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
