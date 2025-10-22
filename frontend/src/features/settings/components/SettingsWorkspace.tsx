import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { useTheme } from '@/providers';
import { Button, Card, Screen, Text } from '@/ui/components';

import { useSettingsExport, useSettingsSummary } from '../hooks';

const formatBytes = (size: number) => {
  if (!Number.isFinite(size) || size <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const formatTimestamp = (value: string | null) => {
  if (!value) {
    return '未知时间';
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
};

const EXPORT_LABELS: Record<keyof ExportCounts, string> = {
  directions: '方向',
  skill_points: '技能点',
  cards: '卡片',
  evidence: '证据',
  card_tags: '标签',
};

export const SettingsWorkspace = () => {
  const { theme } = useTheme();
  const { data: summary, isLoading, isRefetching, refetch } = useSettingsSummary();
  const exportMutation = useSettingsExport();
  const [exportCounts, setExportCounts] = useState<ExportCounts | null>(null);
  const [exportedAt, setExportedAt] = useState<string | null>(null);

  const totalRecords = useMemo(
    () =>
      exportCounts
        ? Object.values(exportCounts).reduce((total, value) => total + value, 0)
        : 0,
    [exportCounts],
  );

  const handleExport = async () => {
    try {
      const payload = await exportMutation.mutateAsync();
      const counts: ExportCounts = {
        directions: payload.directions.length,
        skill_points: payload.skill_points.length,
        cards: payload.cards.length,
        evidence: payload.evidence.length,
        card_tags: payload.card_tags.length,
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
                    包含所有方向、技能点、卡片数据。
                  </Text>
                </View>
                <Text style={styles.statValue}>{formatBytes(summary.database_size_bytes)}</Text>
              </View>
              <View style={[styles.statRow, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.statColumn}>
                  <Text style={styles.statLabel}>实体总览</Text>
                  <Text style={styles.statHint} variant="caption">
                    方向 / 技能点 / 卡片
                  </Text>
                </View>
                <Text style={styles.statValue}>
                  {`${formatNumber(summary.direction_count)} / ${formatNumber(summary.skill_point_count)} / ${formatNumber(summary.card_count)}`}
                </Text>
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
          <Text variant="subtitle">导出 JSON 快照</Text>
          <Text>
            生成一份包含方向、技能点、卡片数据的 JSON，便于手动备份或导入至其他工具。
          </Text>
          <Button title="生成导出" onPress={handleExport} loading={exportMutation.isPending} />
        </Card>
        {exportCounts ? (
          <Card>
            <Text variant="subtitle">最近导出</Text>
            {exportedAt ? (
              <Text variant="caption" style={styles.exportMeta}>
                {`生成于 ${formatTimestamp(exportedAt)}`}
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
});
