import type { TreeDirectionBranch } from '@api';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/providers';
import { Card, Text } from '@/ui/components';
import { formatDirectionStageLabel } from '@/lib/formatters';

type Props = {
  directions: TreeDirectionBranch[];
  selectedId?: string;
  onSelect: (id: string) => void;
};

export const DirectionSummaryList = ({ directions, selectedId, onSelect }: Props) => {
  const { theme } = useTheme();

  if (!directions.length) {
    return (
      <Card variant="outline" style={styles.emptyCard}>
        <Text variant="subtitle">暂无方向</Text>
      </Card>
    );
  }

  return (
    <View style={styles.list}>
      {directions.map((branch) => {
        const isSelected = branch.direction.id === selectedId;
        return (
          <Pressable
            key={branch.direction.id}
            onPress={() => onSelect(branch.direction.id)}
            accessibilityRole="button"
            accessibilityLabel={`选择方向：${branch.direction.name}`}
            testID={`direction-summary-${branch.direction.id}`}
          >
            <Card
              variant="outline"
              style={[
                styles.card,
                {
                  borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                  backgroundColor: isSelected ? theme.colors.surfaceAlt : theme.colors.surface,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text variant="subtitle">{branch.direction.name}</Text>
                <View
                  style={[
                    styles.stageTag,
                    {
                      backgroundColor: isSelected ? theme.colors.accent : theme.colors.surfaceAlt,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{ color: isSelected ? theme.colors.background : theme.colors.textSecondary }}
                  >
                    {formatDirectionStageLabel(branch.direction.stage)}
                  </Text>
                </View>
              </View>
              {branch.direction.quarterly_goal ? (
                <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
                  {branch.direction.quarterly_goal}
                </Text>
              ) : (
                <Text variant="caption" style={{ color: theme.colors.textMuted }}>
                  暂无季度目标
                </Text>
              )}
              <View style={styles.metricsRow}>
                <MetricPill label="技能点" value={branch.metrics.skill_point_count} />
                <MetricPill label="卡片" value={branch.metrics.card_count} />
              </View>
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
};

type MetricProps = {
  label: string;
  value: number | string;
};

const MetricPill = ({ label, value }: MetricProps) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.metric, { backgroundColor: theme.colors.surfaceAlt }]}>
      <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
        {label}
      </Text>
      <Text variant="subtitle">{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  card: {
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  stageTag: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metric: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  emptyCard: {
    alignItems: 'flex-start',
  },
});
