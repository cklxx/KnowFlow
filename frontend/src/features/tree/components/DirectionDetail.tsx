import type { TreeCardSummary, TreeDirectionBranch } from '@api';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/providers';
import { Card, Text } from '@/ui/components';
import { formatDirectionStageLabel, formatSkillLevelLabel } from '@/lib/formatters';

type Props = {
  branch: TreeDirectionBranch | undefined;
};

export const DirectionDetail = ({ branch }: Props) => {
  const { theme } = useTheme();

  if (!branch) {
    return (
      <Card variant="outline" style={styles.placeholder}>
        <Text variant="subtitle">选择方向</Text>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <Card variant="outline" style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text variant="title">{branch.direction.name}</Text>
            <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
              {formatDirectionStageLabel(branch.direction.stage)}阶段 · {branch.metrics.card_count} 卡片
            </Text>
          </View>
          {branch.direction.quarterly_goal ? (
            <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
              {branch.direction.quarterly_goal}
            </Text>
          ) : null}
        </View>
        <View style={styles.metricsRow}>
          <MetricBadge label="技能点" value={branch.metrics.skill_point_count} />
          <MetricBadge label="卡片" value={branch.metrics.card_count} />
        </View>
      </Card>

      <View style={styles.section}>
        <Text variant="subtitle">技能点路径</Text>
        {branch.skill_points.length ? (
          <View style={styles.skillList}>
            {branch.skill_points.map((node) => (
              <Card key={node.skill_point.id} variant="outline" style={styles.skillCard}>
                <View style={styles.skillHeader}>
                  <View style={styles.skillTitle}>
                    <Text variant="subtitle">{node.skill_point.name}</Text>
                    <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
                      {node.skill_point.summary ?? '暂无摘要'}
                    </Text>
                  </View>
                  <View style={[styles.levelBadge, { backgroundColor: theme.colors.surfaceAlt }]}>
                    <Text variant="caption">{formatSkillLevelLabel(node.skill_point.level)}</Text>
                  </View>
                </View>
                <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
                  {node.card_count} 张关联卡片
                </Text>
                <View style={styles.cardList}>
                  {node.cards.map((card) => (
                    <CardRow key={card.id} card={card} />
                  ))}
                  {!node.cards.length ? (
                    <View style={[styles.cardEmpty, { borderColor: theme.colors.border }]}>
                      <Text variant="caption" style={{ color: theme.colors.textMuted }}>
                        暂无卡片
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <Card variant="outline" style={styles.emptyNotice}>
            <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
              暂无技能点
            </Text>
          </Card>
        )}
      </View>

      {branch.orphan_cards.length ? (
        <View style={styles.section}>
          <Text variant="subtitle">未归属的卡片</Text>
          <View style={styles.cardList}>
            {branch.orphan_cards.map((card) => (
              <CardRow key={card.id} card={card} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const MetricBadge = ({ label, value }: { label: string; value: number | string }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.metricBadge, { backgroundColor: theme.colors.surfaceAlt }]}>
      <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
        {label}
      </Text>
      <Text variant="subtitle">{value}</Text>
    </View>
  );
};

const CardRow = ({ card }: { card: TreeCardSummary }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.cardRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardRowHeader}>
        <Text variant="body" style={styles.cardTitle}>
          {card.title}
        </Text>
        <View style={[styles.cardType, { backgroundColor: theme.colors.surfaceAlt }]}>
          <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
            {card.card_type}
          </Text>
        </View>
      </View>
      <Text variant="caption" style={{ color: theme.colors.textSecondary }} numberOfLines={2}>
        {card.body}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  placeholder: {
    alignItems: 'flex-start',
  },
  headerCard: {
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    gap: 4,
    flex: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  section: {
    gap: 12,
  },
  skillList: {
    gap: 12,
  },
  skillCard: {
    gap: 16,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  skillTitle: {
    flex: 1,
    gap: 4,
  },
  levelBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  cardList: {
    gap: 12,
  },
  cardRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  cardRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
  },
  cardType: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cardEmpty: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  emptyNotice: {
    padding: 16,
  },
});
