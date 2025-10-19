import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '@/providers';
import { Button, Card, Screen, SegmentedControl, Text } from '@/ui/components';

import { useSettingsExport, useSettingsSummary, useNotificationPreferences, useUpdateNotificationPreferences } from '../hooks';
import type { NotificationPreferences } from '@api';

const formatBytes = (size: number) => {
  if (!Number.isFinite(size) || size <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const formatDate = (value: string | null) => {
  if (!value) {
    return '未完成';
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const formatNumber = (value: number) => value.toLocaleString('zh-CN');

type ExportCounts = {
  directions: number;
  skill_points: number;
  cards: number;
  evidence: number;
  card_tags: number;
  workouts: number;
  workout_items: number;
  applications: number;
};

const EXPORT_LABELS: Record<keyof ExportCounts, string> = {
  directions: '方向',
  skill_points: '技能点',
  cards: '卡片',
  evidence: '证据',
  card_tags: '标签',
  workouts: '训练',
  workout_items: '训练条目',
  applications: '应用记录',
};

const DAILY_REMINDER_OPTIONS = [
  { value: '20:30', label: '20:30', description: '晚饭后' },
  { value: '21:00', label: '21:00', description: '黄金复盘时间' },
  { value: '21:30', label: '21:30', description: '睡前提醒' },
];

const DUE_REMINDER_OPTIONS = [
  { value: '19:00', label: '19:00', description: '晚饭前' },
  { value: '20:00', label: '20:00', description: '黄金复盘' },
  { value: '21:00', label: '21:00', description: '睡前最后提醒' },
];

const REMIND_LEAD_OPTIONS = [
  { value: '30', label: '提前 30 分钟' },
  { value: '45', label: '提前 45 分钟' },
  { value: '60', label: '提前 60 分钟' },
];

const TARGET_OPTIONS = [
  { value: 'today', label: 'Today 首页', description: '进入训练概览' },
  { value: 'quiz', label: '快问快答', description: '直接开始 T-2' },
  { value: 'review', label: '巩固回顾', description: '查看待复习队列' },
];

export const SettingsWorkspace = () => {
  const { theme } = useTheme();
  const { data: summary, isLoading, isRefetching, refetch } = useSettingsSummary();
  const exportMutation = useSettingsExport();
  const [exportCounts, setExportCounts] = useState<ExportCounts | null>(null);
  const [exportedAt, setExportedAt] = useState<string | null>(null);
  const { data: notificationPrefs, isLoading: loadingNotificationPrefs } = useNotificationPreferences();
  const updateNotifications = useUpdateNotificationPreferences();
  const [localNotificationPrefs, setLocalNotificationPrefs] = useState<NotificationPreferences | null>(null);

  const totalRecords = useMemo(
    () =>
      exportCounts
        ? Object.values(exportCounts).reduce((total, value) => total + value, 0)
        : 0,
    [exportCounts],
  );

  useEffect(() => {
    if (notificationPrefs) {
      setLocalNotificationPrefs(notificationPrefs);
    }
  }, [notificationPrefs]);

  const handleNotificationChange = async (
    patch: Partial<Omit<NotificationPreferences, 'updated_at'>>,
  ) => {
    if (!localNotificationPrefs) {
      return;
    }
    const previous = localNotificationPrefs;
    const next = { ...localNotificationPrefs, ...patch };
    setLocalNotificationPrefs(next);
    try {
      const updated = await updateNotifications.mutateAsync({
        daily_reminder_enabled: next.daily_reminder_enabled,
        daily_reminder_time: next.daily_reminder_time,
        daily_reminder_target: next.daily_reminder_target,
        due_reminder_enabled: next.due_reminder_enabled,
        due_reminder_time: next.due_reminder_time,
        due_reminder_target: next.due_reminder_target,
        remind_before_due_minutes: next.remind_before_due_minutes,
      });
      setLocalNotificationPrefs(updated);
    } catch (error) {
      setLocalNotificationPrefs(previous);
      const message = error instanceof Error ? error.message : '未知错误';
      Alert.alert('更新失败', message);
    }
  };

  const handleExport = async () => {
    try {
      const payload = await exportMutation.mutateAsync();
      const counts: ExportCounts = {
        directions: payload.directions.length,
        skill_points: payload.skill_points.length,
        cards: payload.cards.length,
        evidence: payload.evidence.length,
        card_tags: payload.card_tags.length,
        workouts: payload.workouts.length,
        workout_items: payload.workout_items.length,
        applications: payload.applications.length,
      };
      setExportCounts(counts);
      const generatedAt = new Date().toISOString();
      setExportedAt(generatedAt);
      Alert.alert(
        '导出完成',
        `已整理 ${formatNumber(Object.values(counts).reduce((sum, item) => sum + item, 0))} 条记录，可通过 /api/settings/export 下载完整 JSON。`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      Alert.alert('导出失败', message);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="title">设置与导出</Text>
        <Card>
          <Text variant="subtitle">数据概览</Text>
          {summary ? (
            <View style={styles.statList}>
              <View style={[styles.statRow, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.statColumn}>
                  <Text style={styles.statLabel}>数据目录</Text>
                  <Text style={styles.statHint} variant="caption">
                    SQLite 文件位置，便于本地备份。
                  </Text>
                </View>
                <Text style={styles.statValue}>{summary.data_path ?? '内存数据库'}</Text>
              </View>
              <View style={[styles.statRow, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.statColumn}>
                  <Text style={styles.statLabel}>数据库大小</Text>
                  <Text style={styles.statHint} variant="caption">
                    包含所有方向、卡片、训练等数据。
                  </Text>
                </View>
                <Text style={styles.statValue}>{formatBytes(summary.database_size_bytes)}</Text>
              </View>
              <View style={[styles.statRow, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.statColumn}>
                  <Text style={styles.statLabel}>实体总览</Text>
                  <Text style={styles.statHint} variant="caption">
                    方向 / 技能点 / 卡片 / 证据 / 训练
                  </Text>
                </View>
                <Text style={styles.statValue}>
                  {`${formatNumber(summary.direction_count)} / ${formatNumber(summary.skill_point_count)} / ${formatNumber(summary.card_count)} / ${formatNumber(summary.evidence_count)} / ${formatNumber(summary.workout_count)}`}
                </Text>
              </View>
              <View style={[styles.statRow, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.statColumn}>
                  <Text style={styles.statLabel}>最近训练完成</Text>
                  <Text style={styles.statHint} variant="caption">
                    用于确认调度是否持续运行。
                  </Text>
                </View>
                <Text style={styles.statValue}>{formatDate(summary.last_workout_completed_at)}</Text>
              </View>
            </View>
          ) : (
            <Text>{isLoading ? '正在加载数据概览…' : '暂无数据'}</Text>
          )}
          <Button
            title="刷新概览"
            variant="secondary"
            onPress={() => {
              void refetch();
            }}
            loading={isRefetching}
          />
        </Card>
        <Card>
          <Text variant="subtitle">通知与提醒</Text>
          {loadingNotificationPrefs && !localNotificationPrefs ? (
            <Text>正在加载通知偏好…</Text>
          ) : localNotificationPrefs ? (
            <View style={styles.preferenceGroup}>
              <View style={[styles.preferenceRow, { borderBottomColor: theme.colors.border }]}> 
                <View style={styles.preferenceColumn}>
                  <Text style={styles.statLabel}>每日提醒</Text>
                  <Text style={styles.statHint} variant="caption">
                    晚间提醒完成 Today 训练，可一键深链到指定步骤。
                  </Text>
                </View>
                <Switch
                  accessibilityRole="switch"
                  accessibilityLabel="切换每日提醒"
                  value={localNotificationPrefs.daily_reminder_enabled}
                  onValueChange={(value) =>
                    handleNotificationChange({ daily_reminder_enabled: value })
                  }
                  trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                  thumbColor={theme.colors.surface}
                />
              </View>
              {localNotificationPrefs.daily_reminder_enabled ? (
                <>
                  <View style={styles.preferenceControl}>
                    <Text style={styles.preferenceLabel}>提醒时间</Text>
                    <SegmentedControl
                      options={DAILY_REMINDER_OPTIONS}
                      value={localNotificationPrefs.daily_reminder_time}
                      onChange={(value) =>
                        handleNotificationChange({ daily_reminder_time: value })
                      }
                    />
                  </View>
                  <View style={styles.preferenceControl}>
                    <Text style={styles.preferenceLabel}>打开页面</Text>
                    <SegmentedControl
                      options={TARGET_OPTIONS}
                      value={localNotificationPrefs.daily_reminder_target}
                      onChange={(value) =>
                        handleNotificationChange({
                          daily_reminder_target: value as NotificationPreferences['daily_reminder_target'],
                        })
                      }
                    />
                  </View>
                </>
              ) : null}

              <View style={[styles.preferenceRow, { borderBottomColor: theme.colors.border }]}> 
                <View style={styles.preferenceColumn}>
                  <Text style={styles.statLabel}>逾期提醒</Text>
                  <Text style={styles.statHint} variant="caption">
                    当日仍有卡片未完成时，晚上再次提醒你回顾。
                  </Text>
                </View>
                <Switch
                  accessibilityRole="switch"
                  accessibilityLabel="切换逾期提醒"
                  value={localNotificationPrefs.due_reminder_enabled}
                  onValueChange={(value) =>
                    handleNotificationChange({ due_reminder_enabled: value })
                  }
                  trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                  thumbColor={theme.colors.surface}
                />
              </View>
              {localNotificationPrefs.due_reminder_enabled ? (
                <>
                  <View style={styles.preferenceControl}>
                    <Text style={styles.preferenceLabel}>提醒时间</Text>
                    <SegmentedControl
                      options={DUE_REMINDER_OPTIONS}
                      value={localNotificationPrefs.due_reminder_time}
                      onChange={(value) =>
                        handleNotificationChange({ due_reminder_time: value })
                      }
                    />
                  </View>
                  <View style={styles.preferenceControl}>
                    <Text style={styles.preferenceLabel}>打开页面</Text>
                    <SegmentedControl
                      options={TARGET_OPTIONS}
                      value={localNotificationPrefs.due_reminder_target}
                      onChange={(value) =>
                        handleNotificationChange({
                          due_reminder_target: value as NotificationPreferences['due_reminder_target'],
                        })
                      }
                    />
                  </View>
                  <View style={styles.preferenceControl}>
                    <Text style={styles.preferenceLabel}>提前时间</Text>
                    <SegmentedControl
                      options={REMIND_LEAD_OPTIONS}
                      value={String(localNotificationPrefs.remind_before_due_minutes)}
                      onChange={(value) =>
                        handleNotificationChange({
                          remind_before_due_minutes: Number.parseInt(value, 10),
                        })
                      }
                    />
                  </View>
                </>
              ) : null}

              <Text
                variant="caption"
                style={[styles.preferenceMeta, { color: theme.colors.textMuted }]}
              >
                最近更新于 {formatDate(localNotificationPrefs.updated_at)}
                {updateNotifications.isPending ? ' · 正在保存…' : ''}
              </Text>
            </View>
          ) : (
            <Text>暂无通知设置。</Text>
          )}
        </Card>
        <Card>
          <Text variant="subtitle">导出 JSON 快照</Text>
          <Text>
            生成一份包含方向、技能点、卡片、证据与训练记录的 JSON，便于手动备份或导入至其他工具。
          </Text>
          <Button title="生成导出" onPress={handleExport} loading={exportMutation.isPending} />
        </Card>
        {exportCounts ? (
          <Card>
            <Text variant="subtitle">最近导出</Text>
            {exportedAt ? (
              <Text variant="caption" style={styles.exportMeta}>
                {`生成于 ${formatDate(exportedAt)}`}
              </Text>
            ) : null}
            <View style={styles.statList}>
              {Object.entries(exportCounts).map(([key, value]) => (
                <View key={key} style={[styles.statRow, { borderBottomColor: theme.colors.border }]}> 
                  <Text style={styles.statLabel}>{EXPORT_LABELS[key as keyof ExportCounts]}</Text>
                  <Text style={styles.statValue}>{formatNumber(value)}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.totalText}>
              共 {formatNumber(totalRecords)} 条记录，可访问 /api/settings/export 获取完整内容。
            </Text>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
    gap: 20,
  },
  statList: {
    gap: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  statColumn: {
    flex: 1,
    paddingRight: 12,
    gap: 2,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  statHint: {
    lineHeight: 18,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 0,
    maxWidth: '48%',
  },
  exportMeta: {
    marginBottom: 4,
  },
  totalText: {
    fontSize: 14,
    fontWeight: '500',
  },
  preferenceGroup: {
    marginTop: 12,
    gap: 16,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  preferenceColumn: {
    flex: 1,
    gap: 4,
  },
  preferenceControl: {
    gap: 8,
  },
  preferenceLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  preferenceMeta: {
    marginTop: 4,
  },
});
