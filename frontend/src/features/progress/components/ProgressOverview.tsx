import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '@/ui/components/Text';
import { useTheme } from '@/providers';
import { useProgressSnapshot } from '../hooks';

const formatNumber = (value: number) => value.toLocaleString();

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

  const { totals, activity } = data;

  return (
    <View style={styles.grid}>
      <View
        style={[
          styles.card,
          { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
        ]}
      >
        <Text variant="subtitle">掌握概览</Text>
        <MetricRow label="总卡片" value={formatNumber(totals.total_cards)} />
        <MetricRow label="活跃方向" value={formatNumber(totals.active_directions)} />
        <MetricRow label="今日到期" value={formatNumber(totals.due_today)} />
        <MetricRow label="已逾期" value={formatNumber(totals.overdue)} />
        <MetricRow label="平均稳定度" value={totals.avg_stability.toFixed(2)} />
      </View>
      <View
        style={[
          styles.card,
          { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
        ]}
      >
        <Text variant="subtitle">最近 7 天</Text>
        <MetricRow label="完成训练" value={formatNumber(activity.workouts_completed_7d)} />
        <MetricRow label="新增卡片" value={formatNumber(activity.new_cards_7d)} />
        <MetricRow label="记录应用" value={formatNumber(activity.applications_logged_7d)} />
      </View>
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
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
