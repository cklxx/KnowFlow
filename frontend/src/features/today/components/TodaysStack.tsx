import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/ui/components/Text';
import { useTheme, useToast } from '@/providers';
import type { WorkoutSegmentFocus } from '@api';
import { formatDirectionStageLabel, formatSkillLevelLabel } from '@/lib/formatters';
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

const formatKvDelta = (value: number) => {
  if (!Number.isFinite(value)) return '0.00';
  const rounded = value.toFixed(2);
  return value > 0 ? `+${rounded}` : rounded;
};

const formatUdr = (value: number) => {
  if (!Number.isFinite(value)) return '0%';
  const percent = Math.round(value * 100);
  return `${percent > 0 ? '+' : ''}${percent}%`;
};

const formatRate = (value: number) => {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value * 100)}%`;
};

const formatPriorityPercent = (value: number) => {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value * 100)}%`;
};

export const TodaysStack = () => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { data: workout, isLoading, isRefetching, error } = useTodayWorkout();
  const items = useTodayItems(workout ?? null);
  const [responses, setResponses] = useState<Record<string, WorkoutResultKind>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [summary, setSummary] = useState<WorkoutCompletionSummary | null>(null);
  const completeWorkout = useCompleteWorkout();

  const lastWorkoutId = useRef<string | null>(null);

  useEffect(() => {
    if (!workout) {
      setResponses({});
      setTouched({});
      setSummary(null);
      lastWorkoutId.current = null;
      return;
    }

    setResponses(getDefaultResultMap(workout));
    setTouched({});

    if (lastWorkoutId.current !== workout.workout_id) {
      setSummary(null);
      lastWorkoutId.current = workout.workout_id;
    }
  }, [workout]);

  const allAnswered = useMemo(() => {
    if (!workout) return false;
    return workout.segments.every((segment) =>
      segment.items.every((item) => touched[item.item_id]),
    );
  }, [touched, workout]);

  const totalItems = items.length;
  const answeredCount = useMemo(
    () => Object.values(touched).filter(Boolean).length,
    [touched],
  );
  const completionPercent = totalItems
    ? Math.round((answeredCount / totalItems) * 100)
    : 0;

  const primaryFocus = useMemo(() => {
    if (!workout) return '保持节奏，每日 15 分钟训练。';
    const withHeadline = workout.segments.find(
      (segment) => segment.focus_details?.headline,
    );
    if (withHeadline?.focus_details?.headline) {
      return withHeadline.focus_details.headline;
    }
    const withFocus = workout.segments.find((segment) => segment.focus);
    return withFocus?.focus ?? '保持节奏，每日 15 分钟训练。';
  }, [workout]);

  const handleSelect = (itemId: string, result: WorkoutResultKind) => {
    setResponses((prev) => ({ ...prev, [itemId]: result }));
    setTouched((prev) => ({ ...prev, [itemId]: true }));
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
          styles.progressCard,
          { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt },
        ]}
      >
        <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
          今日焦点
        </Text>
        <Text variant="subtitle" style={{ color: theme.colors.textPrimary }}>
          {primaryFocus}
        </Text>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${completionPercent}%`, backgroundColor: theme.colors.accent },
            ]}
          />
        </View>
        <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
          已完成 {answeredCount}/{totalItems} 张 · {completionPercent}%
        </Text>
      </View>
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
          <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
            已标记 {segment.items.filter((item) => touched[item.item_id]).length}/
            {segment.items.length}
          </Text>
          {segment.focus_details ? (
            <SegmentFocusDetails focus={segment.focus_details} />
          ) : segment.focus ? (
            <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
              {segment.focus}
            </Text>
          ) : null}
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
                  active={Boolean(
                    touched[item.item_id] && responses[item.item_id] === 'pass',
                  )}
                  onPress={() => handleSelect(item.item_id, 'pass')}
                  themeColor={theme.colors.success}
                />
                <OptionButton
                  label="重练"
                  active={Boolean(
                    touched[item.item_id] && responses[item.item_id] === 'fail',
                  )}
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
          <View style={styles.metricsRow}>
            <MetricPill
              label="正确率"
              value={`${Math.round((summary.metrics.pass_rate ?? 0) * 100)}%`}
              colors={theme.colors}
            />
            <MetricPill
              label="完成"
              value={`${summary.metrics.total_items}`}
              colors={theme.colors}
            />
            <MetricPill
              label="KV Δ"
              value={formatKvDelta(summary.metrics.kv_delta)}
              colors={theme.colors}
            />
            <MetricPill
              label="UDR"
              value={formatUdr(summary.metrics.udr)}
              colors={theme.colors}
            />
          </View>
          {summary.metrics.direction_breakdown.length ? (
            <View style={styles.breakdownSection}>
              <Text variant="subtitle">方向表现</Text>
              <View style={styles.breakdownList}>
                {summary.metrics.direction_breakdown.map((direction) => (
                  <View
                    key={direction.direction_id}
                    style={[
                      styles.breakdownCard,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surface,
                      },
                    ]}
                  >
                    <View style={styles.breakdownHeader}>
                      <Text variant="subtitle">{direction.name}</Text>
                      <Text
                        variant="caption"
                        style={{ color: theme.colors.textSecondary }}
                      >
                        占比 {formatRate(direction.share)}
                      </Text>
                    </View>
                    <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
                      {formatDirectionStageLabel(direction.stage)} · 通过率 {formatRate(direction.pass_rate)} · KV{' '}
                      {formatKvDelta(direction.kv_delta)} · UDR {formatUdr(direction.udr)}
                    </Text>
                    <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
                      优先级 {formatPriorityPercent(direction.avg_priority)} · 完成 {direction.pass_count}/
                      {direction.total}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {summary.metrics.skill_breakdown.length ? (
            <View style={styles.breakdownSection}>
              <Text variant="subtitle">技能表现</Text>
              <View style={styles.breakdownList}>
                {summary.metrics.skill_breakdown.map((skill) => (
                  <View
                    key={skill.skill_point_id}
                    style={[
                      styles.breakdownCard,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surface,
                      },
                    ]}
                  >
                    <View style={styles.breakdownHeader}>
                      <Text variant="subtitle">{skill.name}</Text>
                      <Text
                        variant="caption"
                        style={{ color: theme.colors.textSecondary }}
                      >
                        占比 {formatRate(skill.share)}
                      </Text>
                    </View>
                    <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
                      {formatSkillLevelLabel(skill.level)} · 通过率 {formatRate(skill.pass_rate)} · KV{' '}
                      {formatKvDelta(skill.kv_delta)} · UDR {formatUdr(skill.udr)}
                    </Text>
                    <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
                      优先级 {formatPriorityPercent(skill.avg_priority)} · 完成 {skill.pass_count}/
                      {skill.total}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {summary.metrics.recommended_focus ? (
            <Text
              style={[styles.recommendation, { color: theme.colors.accent }]}
            >
              下一块砖：{summary.metrics.recommended_focus}
            </Text>
          ) : null}
          {summary.insights.length ? (
            <View style={styles.insights}>
              {summary.insights.map((insight, index) => (
                <Text
                  key={`${insight}-${index}`}
                  style={{ color: theme.colors.textSecondary }}
                >
                  • {insight}
                </Text>
              ))}
            </View>
          ) : null}
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

const SegmentFocusDetails = ({ focus }: { focus: WorkoutSegmentFocus }) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.focusContainer,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceAlt,
        },
      ]}
    >
      <Text variant="caption" style={{ color: theme.colors.accent }}>
        {focus.headline}
      </Text>
      {focus.highlights.length ? (
        <View style={styles.focusHighlights}>
          {focus.highlights.map((highlight, index) => (
            <Text
              key={`${highlight}-${index}`}
              style={{ color: theme.colors.textSecondary }}
            >
              • {highlight}
            </Text>
          ))}
        </View>
      ) : null}
      {focus.direction_breakdown.length ? (
        <View style={styles.focusDirections}>
          {focus.direction_breakdown.map((direction) => (
            <View
              key={direction.direction_id}
              style={[
                styles.directionChip,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <Text
                variant="caption"
                style={[styles.directionName, { color: theme.colors.textPrimary }]}
              >
                {direction.name}
              </Text>
              <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
                {formatDirectionStageLabel(direction.stage)} · {direction.count} 张 ·{' '}
                {Math.round(direction.share * 100)}%
              </Text>
              {direction.signals.length ? (
                <View style={styles.directionSignals}>
                  {direction.signals.map((signal, index) => (
                    <Text
                      key={`${direction.direction_id}-signal-${index}`}
                      variant="caption"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      • {signal}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      {focus.skill_breakdown.length ? (
        <View style={styles.focusSkills}>
          {focus.skill_breakdown.map((skill) => (
            <View
              key={skill.skill_point_id}
              style={[
                styles.skillChip,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <Text
                variant="caption"
                style={[styles.skillName, { color: theme.colors.textPrimary }]}
              >
                {skill.name}
              </Text>
              <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
                {formatSkillLevelLabel(skill.level)} · {skill.count} 张 ·{' '}
                {Math.round(skill.share * 100)}%
              </Text>
              {skill.signals.length ? (
                <View style={styles.skillSignals}>
                  {skill.signals.map((signal, index) => (
                    <Text
                      key={`${skill.skill_point_id}-signal-${index}`}
                      variant="caption"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      • {signal}
                    </Text>
                  ))}
                </View>
              ) : null}
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

const MetricPill = ({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { surfaceAlt: string; border: string; textSecondary: string };
}) => (
  <View
    style={[
      styles.metricPill,
      { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
    ]}
  >
    <Text variant="caption" style={[styles.metricLabel, { color: colors.textSecondary }]}>
      {label}
    </Text>
    <Text variant="subtitle">{value}</Text>
  </View>
);

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
  progressCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
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
  focusContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  focusHighlights: {
    gap: 4,
  },
  focusDirections: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  focusSkills: {
    gap: 8,
  },
  directionChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 2,
  },
  directionName: {
    fontWeight: '600',
  },
  directionSignals: {
    marginTop: 2,
    gap: 2,
  },
  skillChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 2,
  },
  skillName: {
    fontWeight: '600',
  },
  skillSignals: {
    marginTop: 2,
    gap: 2,
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
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  breakdownSection: {
    marginTop: 12,
    gap: 8,
  },
  breakdownList: {
    gap: 8,
  },
  breakdownCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricPill: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 88,
    gap: 2,
  },
  metricLabel: {
    fontSize: 12,
  },
  recommendation: {
    marginTop: 12,
    fontWeight: '600',
  },
  insights: {
    gap: 4,
    marginTop: 8,
  },
  summaryRow: {
    gap: 2,
  },
});
