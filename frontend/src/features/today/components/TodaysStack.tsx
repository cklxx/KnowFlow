import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/ui/components/Text';
import { useTheme, useToast } from '@/providers';
import {
  useCompleteWorkout,
  useTodayItems,
  useTodayWorkout,
  type WorkoutResultKind,
  type TodayWorkoutPlan,
  type WorkoutCompletionSummary,
} from '../hooks';

const formatPhaseLabel = (phase: string) => {
  switch (phase) {
    case 'quiz':
      return 'Quick Quiz';
    case 'apply':
      return 'Application';
    case 'review':
      return 'Reinforce';
    default:
      return phase;
  }
};

const getDefaultResultMap = (workout: TodayWorkoutPlan | null) => {
  if (!workout) return {};
  const map: Record<string, WorkoutResultKind> = {};
  workout.segments.forEach((segment) => {
    segment.items.forEach((item) => {
      map[item.item_id] = 'pass';
    });
  });
  return map;
};

export const TodaysStack = () => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { data: workout, isLoading, isRefetching, error } = useTodayWorkout();
  const items = useTodayItems(workout ?? null);
  const [responses, setResponses] = useState<Record<string, WorkoutResultKind>>({});
  const [summary, setSummary] = useState<WorkoutCompletionSummary | null>(null);
  const completeWorkout = useCompleteWorkout();

  useEffect(() => {
    setResponses(getDefaultResultMap(workout ?? null));
    setSummary(null);
  }, [workout]);

  const allAnswered = useMemo(() => {
    if (!workout) return false;
    return workout.segments.every((segment) =>
      segment.items.every((item) => responses[item.item_id] !== undefined),
    );
  }, [responses, workout]);

  const handleSelect = (itemId: string, result: WorkoutResultKind) => {
    setResponses((prev) => ({ ...prev, [itemId]: result }));
  };

  const handleSubmit = async () => {
    if (!workout) return;
    if (!allAnswered) {
      showToast({
        message: '请为每张卡片选择通过或重练结果。',
        variant: 'info',
      });
      return;
    }
    const results = items.map(({ item }) => ({
      item_id: item.item_id,
      result: responses[item.item_id] ?? 'pass',
    }));

    try {
      const payload = await completeWorkout.mutateAsync({
        workoutId: workout.workout_id,
        results,
      });
      setSummary(payload.summary);
      showToast({ message: '今日训练完成 ✅', variant: 'success' });
    } catch (error) {
      console.error(error);
      showToast({ message: '提交训练结果失败', variant: 'error' });
    }
  };

  if (isLoading || isRefetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text>无法加载今日训练：{error.message}</Text>
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={styles.center}>
        <Text>今日暂无训练计划，导入材料或创建卡片以启动。</Text>
      </View>
    );
  }

  const totals = workout.totals;
  const scheduledDate = new Date(workout.scheduled_for);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.summaryCard,
          { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={styles.summaryContent}>
          <Text variant="subtitle">今日训练</Text>
          <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
            {scheduledDate.toLocaleDateString()} · {totals.total_cards} 张卡片
          </Text>
        </View>
        <SubmitButton
          disabled={completeWorkout.isPending}
          onPress={handleSubmit}
          label={completeWorkout.isPending ? '提交中…' : '提交结果'}
        />
      </View>
      {workout.segments.map((segment) => (
        <View key={segment.phase} style={styles.segment}>
          <Text variant="subtitle">{formatPhaseLabel(segment.phase)}</Text>
          {segment.items.map((item) => (
            <View
              key={item.item_id}
              style={[
                styles.card,
                { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text variant="subtitle">{item.card.title}</Text>
                <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
                  {item.card.card_type.toUpperCase()}
                </Text>
              </View>
              <Text style={{ color: theme.colors.textSecondary }}>{item.card.body}</Text>
              <View style={styles.actions}>
                <OptionButton
                  label="通过"
                  active={responses[item.item_id] === 'pass'}
                  onPress={() => handleSelect(item.item_id, 'pass')}
                  themeColor={theme.colors.success}
                />
                <OptionButton
                  label="重练"
                  active={responses[item.item_id] === 'fail'}
                  onPress={() => handleSelect(item.item_id, 'fail')}
                  themeColor={theme.colors.warning}
                />
              </View>
            </View>
          ))}
        </View>
      ))}
      {summary ? (
        <View
          style={[
            styles.summary,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt },
          ]}
        >
          <Text variant="subtitle">今日更新</Text>
          <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
            完成时间：{new Date(summary.completed_at).toLocaleTimeString()}
          </Text>
          {summary.updates.map((update) => (
            <View key={update.card_id} style={styles.summaryRow}>
              <Text>
                {update.result === 'pass' ? '✅' : '🔁'} 稳定度 {update.stability.toFixed(2)} ·
                优先级 {update.priority.toFixed(2)}
              </Text>
              <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
                下次复习：{update.next_due ? new Date(update.next_due).toLocaleDateString() : '待定'}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const OptionButton = ({
  label,
  active,
  onPress,
  themeColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  themeColor: string;
}) => {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.option,
        {
          borderColor: active ? themeColor : theme.colors.border,
          backgroundColor: active ? `${themeColor}1A` : theme.colors.surfaceAlt,
        },
      ]}
    >
      <Text style={{ color: active ? themeColor : theme.colors.textPrimary }}>{label}</Text>
    </Pressable>
  );
};

const SubmitButton = ({
  disabled,
  onPress,
  label,
}: {
  disabled: boolean;
  onPress: () => void;
  label: string;
}) => {
  const { theme } = useTheme();
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.submit,
        {
          backgroundColor: disabled ? theme.colors.surfaceAlt : theme.colors.accent,
        },
      ]}
    >
      <Text style={{ color: disabled ? theme.colors.textSecondary : theme.colors.background }}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  center: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  summaryContent: {
    flex: 1,
    gap: 4,
  },
  segment: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  submit: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  summary: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  summaryRow: {
    gap: 2,
  },
});
