import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { DirectionList, MemoryCardList, SkillPointList } from '@/features/directions';
import { useTheme } from '@/providers';
import { Button, Card, Screen, Text } from '@/ui/components';

import { useTreeSnapshot } from '../hooks';
import { DirectionDetail } from './DirectionDetail';
import { DirectionSummaryList } from './DirectionSummaryList';

export const TreeWorkspace = () => {
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch, isFetching } = useTreeSnapshot();
  const [selectedDirectionId, setSelectedDirectionId] = useState<string | undefined>(undefined);
  const pendingManualSelection = useRef<string | undefined>(undefined);
  const [selectionSource, setSelectionSource] = useState<'auto' | 'manual'>('auto');

  const branches = useMemo(() => data?.directions ?? [], [data]);
  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.direction.id === selectedDirectionId),
    [branches, selectedDirectionId],
  );
  const generatedAtInfo = useMemo(() => {
    if (!data?.generated_at) {
      return { label: null, isStale: false };
    }
    const parsed = new Date(data.generated_at);
    if (Number.isNaN(parsed.getTime())) {
      return { label: null, isStale: false };
    }

    const label = parsed.toLocaleString('zh-CN', { hour12: false });
    const diffMs = Date.now() - parsed.getTime();
    const staleThresholdMs = 5 * 60 * 1000;

    return {
      label,
      isStale: diffMs > staleThresholdMs,
    };
  }, [data?.generated_at]);

  const showRefreshIndicator = isFetching && !isLoading;

  const handleSelectDirection = useCallback((nextId: string | undefined) => {
    if (nextId) {
      pendingManualSelection.current = nextId;
      setSelectionSource('manual');
    } else {
      pendingManualSelection.current = undefined;
      setSelectionSource('auto');
    }
    setSelectedDirectionId(nextId);
  }, []);

  useEffect(() => {
    if (!branches.length) {
      if (selectedDirectionId !== undefined) {
        setSelectedDirectionId(undefined);
      }
      if (selectionSource !== 'auto') {
        setSelectionSource('auto');
      }
      pendingManualSelection.current = undefined;
      return;
    }

    if (selectedDirectionId) {
      const hasSelection = branches.some((branch) => branch.direction.id === selectedDirectionId);
      if (hasSelection) {
        if (pendingManualSelection.current === selectedDirectionId) {
          pendingManualSelection.current = undefined;
        }
        return;
      }

      if (pendingManualSelection.current === selectedDirectionId) {
        return;
      }
    }

    const fallbackId = branches[0].direction.id;
    if (selectedDirectionId !== fallbackId) {
      setSelectedDirectionId(fallbackId);
    }
    if (selectionSource !== 'auto') {
      setSelectionSource('auto');
    }
    if (pendingManualSelection.current) {
      pendingManualSelection.current = undefined;
    }
  }, [branches, selectedDirectionId, selectionSource]);

  const totals = useMemo(() => {
    return branches.reduce(
      (acc, branch) => {
        acc.directions += 1;
        acc.skillPoints += branch.metrics.skill_point_count;
        acc.cards += branch.metrics.card_count;
        return acc;
      },
      { directions: 0, skillPoints: 0, cards: 0 },
    );
  }, [branches]);

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.centerContent}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <View style={styles.centerContent}>
          <Text>Failed to load tree snapshot.</Text>
          <Button title="Retry" onPress={() => void refetch()} loading={isFetching} style={styles.retryButton} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.overviewSection}>
          <View style={styles.overviewHeader}>
            <Text variant="title">方向概览</Text>
            <View style={styles.headerActions}>
              {generatedAtInfo.label ? (
                <View style={styles.timestampRow}>
                  {showRefreshIndicator ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        generatedAtInfo.isStale
                          ? theme.colors.warning
                          : theme.colors.textSecondary
                      }
                    />
                  ) : null}
                  <Text
                    variant="caption"
                    style={[
                      styles.timestampText,
                      {
                        color: generatedAtInfo.isStale
                          ? theme.colors.warning
                          : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    上次更新：{generatedAtInfo.label}
                    {generatedAtInfo.isStale ? '（超过 5 分钟）' : ''}
                  </Text>
                </View>
              ) : showRefreshIndicator ? (
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
              ) : null}
              <Button
                title={isFetching ? '刷新中…' : '刷新'}
                variant="secondary"
                onPress={() => void refetch()}
                loading={isFetching}
                style={styles.refreshButton}
              />
            </View>
          </View>
          <View style={styles.metricsRow}>
            <MetricCard label="方向" value={totals.directions} />
            <MetricCard label="技能点" value={totals.skillPoints} />
            <MetricCard label="卡片" value={totals.cards} />
          </View>
        </View>

        <View style={styles.snapshotSection}>
          <View style={styles.summaryColumn}>
            <Text variant="subtitle">方向列表</Text>
            <DirectionSummaryList
              directions={branches}
              selectedId={selectedDirectionId}
              onSelect={(id) => handleSelectDirection(id)}
            />
          </View>
          <View style={styles.detailColumn}>
            <DirectionDetail branch={selectedBranch} />
          </View>
        </View>

        <View style={styles.managementSection}>
          <View style={styles.managementColumn}>
            <Text variant="subtitle">维护方向</Text>
            <DirectionList onSelect={handleSelectDirection} selectedId={selectedDirectionId} />
          </View>
          <View style={styles.managementColumn}>
            <Text variant="subtitle">维护技能点</Text>
            <SkillPointList directionId={selectedDirectionId} />
          </View>
          <View style={styles.managementColumn}>
            <Text variant="subtitle">维护记忆卡片</Text>
            <MemoryCardList directionId={selectedDirectionId} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

const MetricCard = ({ label, value }: { label: string; value: number }) => {
  const { theme } = useTheme();

  return (
    <Card variant="outline" style={styles.metricCard}>
      <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
        {label}
      </Text>
      <Text variant="title">{value}</Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  content: {
    gap: 24,
    paddingBottom: 40,
  },
  overviewSection: {
    gap: 12,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    minWidth: 96,
  },
  timestampText: {
    alignSelf: 'flex-end',
  },
  snapshotSection: {
    gap: 16,
  },
  summaryColumn: {
    gap: 12,
  },
  detailColumn: {
    gap: 12,
  },
  managementSection: {
    gap: 16,
  },
  managementColumn: {
    gap: 12,
  },
  retryButton: {
    minWidth: 120,
  },
});
