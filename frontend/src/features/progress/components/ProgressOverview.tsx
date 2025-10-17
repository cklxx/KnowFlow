import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '@/ui/components/Text';
import { useTheme } from '@/providers';
import { useProgressSnapshot } from '../hooks';
import type {
  DirectionStage,
  ProgressApplication,
  ProgressDirectionMastery,
  ProgressRecommendation,
  ProgressRetentionSample,
  ProgressSkillGap,
  ProgressTrendSeries,
  SkillLevel,
} from '@/lib/api/types';

const formatNumber = (value: number) => value.toLocaleString();
const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const stageLabel: Record<DirectionStage, string> = {
  explore: '探索',
  shape: '成型',
  attack: '攻坚',
  stabilize: '固化',
};

const skillLevelLabel: Record<SkillLevel, string> = {
  unknown: '待熟悉',
  emerging: '萌芽',
  working: '实战中',
  fluent: '自如',
};

export const ProgressOverview = () => {
  const { theme } = useTheme();
  const { data, isLoading, error } = useProgressSnapshot();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text>无法加载进度概览：{error.message}</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text>暂无进度数据。</Text>
      </View>
    );
  }

  const { totals, activity, mastery, retention, streaks, applications, recommendations, momentum } = data;

  return (
    <View style={styles.grid}>
      <CardShell title="掌握概览">
        <MetricRow label="总卡片" value={formatNumber(totals.total_cards)} />
        <MetricRow label="活跃方向" value={formatNumber(totals.active_directions)} />
        <MetricRow label="今日到期" value={formatNumber(totals.due_today)} />
        <MetricRow label="已逾期" value={formatNumber(totals.overdue)} />
        <MetricRow label="平均稳定度" value={totals.avg_stability.toFixed(2)} />
      </CardShell>

      <CardShell title="最近 7 天">
        <MetricRow label="完成训练" value={formatNumber(activity.workouts_completed_7d)} />
        <MetricRow label="新增卡片" value={formatNumber(activity.new_cards_7d)} />
        <MetricRow label="记录应用" value={formatNumber(activity.applications_logged_7d)} />
      </CardShell>

      <CardShell title="方向表现">
        {mastery.directions.length === 0 ? (
          <Text variant="caption" style={{ color: theme.colors.textMuted }}>
            暂无方向数据。
          </Text>
        ) : (
          mastery.directions.slice(0, 5).map((direction) => (
            <DirectionRow key={direction.id} direction={direction} />
          ))
        )}
      </CardShell>

      <CardShell title="技能热区">
        {mastery.skill_gaps.length === 0 ? (
          <Text variant="caption" style={{ color: theme.colors.textMuted }}>
            尚未登记技能点。
          </Text>
        ) : (
          mastery.skill_gaps.map((skill) => <SkillRow key={skill.id} skill={skill} />)
        )}
      </CardShell>

      <CardShell title="记忆保持">
        <MetricRow label="7 天保持率" value={formatPercent(retention.retention_7d)} />
        <MetricRow label="30 天保持率" value={formatPercent(retention.retention_30d)} />
        <MetricRow label="90 天保持率" value={formatPercent(retention.retention_90d)} />
        <RetentionTrend samples={retention.trend} />
      </CardShell>

      <CardShell title="训练节奏">
        <MetricRow label="当前连续天数" value={`${streaks.current} 天`} />
        <MetricRow label="最佳纪录" value={`${streaks.longest} 天`} />
        <MetricRow
          label="上次完成"
          value={
            streaks.last_completed_at
              ? formatLastCompleted(streaks.last_completed_at)
              : '尚未完成训练'
          }
        />
      </CardShell>

      <CardShell title="学习势能">
        <MomentumMetric
          label="知识速度 (KV)"
          trend={momentum.knowledge_velocity}
          formatValue={formatKvDelta}
        />
        <View
          style={[styles.momentumDivider, { borderBottomColor: theme.colors.border }]}
        />
        <MomentumMetric
          label="不确定性下降率 (UDR)"
          trend={momentum.uncertainty_drop_rate}
          formatValue={formatUdr}
        />
      </CardShell>

      <CardShell title="系统建议">
        {recommendations.length === 0 ? (
          <Text variant="caption" style={{ color: theme.colors.textMuted }}>
            当前节奏良好，保持即可。
          </Text>
        ) : (
          recommendations.map((note) => (
            <RecommendationItem key={note.headline} recommendation={note} />
          ))
        )}
      </CardShell>

      <CardShell title="最近应用">
        {applications.length === 0 ? (
          <Text variant="caption" style={{ color: theme.colors.textMuted }}>
            暂无应用记录。
          </Text>
        ) : (
          applications.map((application) => (
            <ApplicationRow key={application.id} application={application} />
          ))
        )}
      </CardShell>
    </View>
  );
};

const MetricRow = ({ label, value }: { label: string; value: string }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.metricRow}>
      <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
        {label}
      </Text>
      <Text style={{ color: theme.colors.textPrimary }}>{value}</Text>
    </View>
  );
};

const RetentionTrend = ({ samples }: { samples: ProgressRetentionSample[] }) => {
  const { theme } = useTheme();

  if (!samples.length) {
    return (
      <Text variant="caption" style={{ color: theme.colors.textMuted }}>
        最近尚未完成训练。
      </Text>
    );
  }

  const rows = samples.slice(0, 5);

  return (
    <View
      style={[
        styles.trendContainer,
        { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt },
      ]}
    >
      <Text variant="caption" style={[styles.trendTitle, { color: theme.colors.textSecondary }]}>
        最近趋势
      </Text>
      {rows.map((sample, index) => (
        <View
          key={`${sample.date}-${sample.total_reviews}`}
          style={[
            styles.trendRow,
            {
              borderBottomColor: theme.colors.border,
              borderBottomWidth:
                index === rows.length - 1 ? 0 : StyleSheet.hairlineWidth,
            },
          ]}
        >
          <Text style={{ color: theme.colors.textPrimary }}>{formatTrendDate(sample.date)}</Text>
          <Text variant="caption" style={{ color: theme.colors.textMuted }}>
            {formatPercent(sample.pass_rate)}
          </Text>
          <Text variant="caption" style={{ color: theme.colors.textMuted }}>
            {sample.total_reviews} 题
          </Text>
        </View>
      ))}
    </View>
  );
};

const CardShell = ({ title, children }: { title: string; children: ReactNode }) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
      ]}
    >
      <Text variant="subtitle" style={styles.cardTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
};

const DirectionRow = ({ direction }: { direction: ProgressDirectionMastery }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.directionRow}>
      <View style={styles.directionHeader}>
        <Text style={[styles.directionName, { color: theme.colors.textPrimary }]}>
          {direction.name}
        </Text>
        <View
          style={[
            styles.stageChip,
            { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
          ]}
        >
          <Text variant="caption" style={{ color: theme.colors.textMuted }}>
            {stageLabel[direction.stage]}
          </Text>
        </View>
      </View>
      <View style={styles.directionMetrics}>
        <Text variant="caption" style={{ color: theme.colors.textMuted }}>
          平均技能 {direction.avg_skill_level.toFixed(1)} · 待复习 {direction.due_next_7d}
        </Text>
        <Text variant="caption" style={{ color: theme.colors.textMuted }}>
          30 天通过率 {formatPercent(direction.recent_pass_rate)}
        </Text>
      </View>
    </View>
  );
};

const SkillRow = ({ skill }: { skill: ProgressSkillGap }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.skillRow}>
      <View style={styles.skillHeader}>
        <Text style={[styles.skillName, { color: theme.colors.textPrimary }]}>{skill.name}</Text>
        <Text variant="caption" style={{ color: theme.colors.textMuted }}>
          {skill.direction_name}
        </Text>
      </View>
      <View style={styles.skillBadges}>
        <View
          style={[
            styles.skillChip,
            { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
          ]}
        >
          <Text variant="caption" style={{ color: theme.colors.textMuted }}>
            {skillLevelLabel[skill.level]}
          </Text>
        </View>
        <Text variant="caption" style={{ color: theme.colors.textMuted }}>
          卡片 {skill.card_count}
        </Text>
        <Text variant="caption" style={{ color: theme.colors.textMuted }}>
          待复习 {skill.due_next_7d}
        </Text>
        <Text variant="caption" style={{ color: theme.colors.textMuted }}>
          30 天失误率 {formatPercent(skill.recent_fail_rate)}
        </Text>
      </View>
    </View>
  );
};

const RecommendationItem = ({ recommendation }: { recommendation: ProgressRecommendation }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.recommendation}>
      <Text style={[styles.recommendationHeadline, { color: theme.colors.textPrimary }]}>
        {recommendation.headline}
      </Text>
      <Text variant="caption" style={{ color: theme.colors.textMuted }}>
        {recommendation.rationale}
      </Text>
    </View>
  );
};

const ApplicationRow = ({ application }: { application: ProgressApplication }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.applicationRow}>
      <View style={styles.applicationHeader}>
        <Text style={[styles.applicationTitle, { color: theme.colors.textPrimary }]}>
          {application.card_title}
        </Text>
        <View
          style={[
            styles.applicationBadge,
            { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
          ]}
        >
          <Text variant="caption" style={{ color: theme.colors.textMuted }}>
            影响力 {Math.round(application.impact_score)}
          </Text>
        </View>
      </View>
      <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
        {application.direction_name}
        {application.skill_point_name ? ` · ${application.skill_point_name}` : ''} ·{' '}
        {formatApplicationDate(application.noted_at)}
      </Text>
      <Text variant="caption" style={{ color: theme.colors.textMuted }} numberOfLines={3}>
        {application.context}
      </Text>
    </View>
  );
};

const formatLastCompleted = (value: string) => {
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) {
    return '日期未知';
  }
  return `${time.getMonth() + 1} 月 ${time.getDate()} 日`;
};

const formatApplicationDate = (value: string) => {
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) {
    return '时间未知';
  }
  return `${time.getMonth() + 1} 月 ${time.getDate()} 日`;
};

const formatTrendDate = (value: string) => {
  const time = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(time.getTime())) {
    return value;
  }
  return `${time.getMonth() + 1}/${time.getDate()}`;
};

const formatKvDelta = (value: number) => {
  if (!Number.isFinite(value)) return '+0.00';
  const rounded = value.toFixed(2);
  return value >= 0 ? `+${rounded}` : rounded;
};

const formatUdr = (value: number) => {
  if (!Number.isFinite(value)) return '+0%';
  const percent = Math.round(value * 100);
  return `${percent >= 0 ? '+' : ''}${percent}%`;
};

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  grid: {
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardTitle: {
    fontWeight: '600',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginTop: 4,
  },
  trendTitle: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  directionRow: {
    gap: 4,
  },
  directionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  directionName: {
    fontWeight: '600',
  },
  stageChip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  directionMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skillRow: {
    gap: 4,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skillName: {
    fontWeight: '600',
  },
  skillBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  recommendation: {
    gap: 4,
  },
  recommendationHeadline: {
    fontWeight: '600',
  },
  applicationRow: {
    gap: 6,
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  applicationTitle: {
    fontWeight: '600',
  },
  applicationBadge: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  momentumDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  momentumMetric: {
    gap: 8,
  },
  momentumHeader: {
    fontWeight: '600',
  },
  momentumAverages: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  momentumRecent: {
    gap: 4,
  },
});

const MomentumMetric = ({
  label,
  trend,
  formatValue,
}: {
  label: string;
  trend: ProgressTrendSeries;
  formatValue: (value: number) => string;
}) => {
  const { theme } = useTheme();
  return (
    <View style={styles.momentumMetric}>
      <Text style={[styles.momentumHeader, { color: theme.colors.textPrimary }]}>{label}</Text>
      <View style={styles.momentumAverages}>
        <Text variant="caption" style={{ color: theme.colors.textMuted }}>
          7 天均值 {formatValue(trend.average_7d)}
        </Text>
        <Text variant="caption" style={{ color: theme.colors.textMuted }}>
          30 天均值 {formatValue(trend.average_30d)}
        </Text>
      </View>
      <View style={styles.momentumRecent}>
        {trend.recent.length === 0 ? (
          <Text variant="caption" style={{ color: theme.colors.textMuted }}>
            暂无近期训练记录。
          </Text>
        ) : (
          trend.recent.slice(0, 5).map((sample) => (
            <Text key={`${label}-${sample.completed_at}`} variant="caption" style={{ color: theme.colors.textSecondary }}>
              {formatApplicationDate(sample.completed_at)} · {formatValue(sample.value)}
            </Text>
          ))
        )}
      </View>
    </View>
  );
};
