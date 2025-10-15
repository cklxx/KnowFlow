import type { TreeCardSummary, TreeDirectionBranch } from '@api';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/providers';
import { Card, Text } from '@/ui/components';

type Props = {
  branch: TreeDirectionBranch | undefined;
};

export const DirectionDetail = ({ branch }: Props) => {
  const { theme } = useTheme();

  if (!branch) {
    return (
      <Card variant="outline" style={styles.placeholder}>
        <Text variant="subtitle">选择左侧的方向</Text>
        <Text variant="caption">查看技能点掌握情况与卡片网络。</Text>
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
              阶段：{branch.direction.stage} · {branch.metrics.card_count} 张卡片
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
          <MetricBadge label="已熟练" value={branch.metrics.fluent_points} />
          <MetricBadge label="稳定度" value={`${Math.round(branch.metrics.average_stability * 100)}%`} />
          <MetricBadge label="即将复习" value={branch.metrics.upcoming_reviews} />
        </View>
      </Card>

      <View style={styles.section}>
        <Text variant="subtitle">技能点路径</Text>
        <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
          依据掌握度与卡片数量自动排序。
        </Text>
        {branch.skill_points.length ? (
          <View style={styles.skillList}>
            {branch.skill_points.map((node) => (
              <Card key={node.skill_point.id} variant="outline" style={styles.skillCard}>
                <View style={styles.skillHeader}>
                  <View style={styles.skillTitle}>
                    <Text variant="subtitle">{node.skill_point.name}</Text>
                    <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
                      {node.skill_point.summary ?? '未填写摘要'}
                    </Text>
                  </View>
                  <View style={[styles.levelBadge, { backgroundColor: theme.colors.surfaceAlt }]}>
                    <Text variant="caption">{node.skill_point.level}</Text>
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
                        暂无卡片，尝试导入材料或从训练生成。
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
              尚未记录技能点，可在下方“结构管理”中补充。
            </Text>
          </Card>
        )}
      </View>

      {branch.orphan_cards.length ? (
        <View style={styles.section}>
          <Text variant="subtitle">未归属的卡片</Text>
          <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
            这些卡片尚未挂接到技能点，可在下方管理区补充分类。
          </Text>
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
      <View style={styles.cardMetaRow}>
        <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
          复习：{formatDue(card.next_due)}
        </Text>
        <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
          证据 {card.evidence_count} · 应用 {card.application_count}
        </Text>
        {card.last_applied_at ? (
          <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
            上次应用 {formatLastApplied(card.last_applied_at)}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const formatDue = (value: string | null) => {
  if (!value) return '未安排';
  const due = new Date(value);
  const diffDays = Math.round((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '今天';
  if (diffDays > 0) return `${diffDays} 天后`;
  return `${Math.abs(diffDays)} 天前`;
};

const formatLastApplied = (value: string) => {
  const applied = new Date(value);
  const diffDays = Math.round((Date.now() - applied.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨日';
  return `${diffDays} 天前`;
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
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
