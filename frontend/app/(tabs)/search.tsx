import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import type {
  SearchApplicationResult,
  SearchCardResult,
  SearchDirectionResult,
  SearchEvidenceResult,
  SearchEvergreenResult,
  SearchSuggestionGroup,
  SearchSuggestionItem,
} from '@api';
import { useSearchResults, useSearchSuggestions } from '@/features/search';
import { Screen } from '@/ui/components/Screen';
import { Text } from '@/ui/components/Text';
import { Card } from '@/ui/components/Card';
import { useTheme } from '@/providers';

export default function SearchScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const params = useMemo(
    () => ({
      q: debouncedQuery,
    }),
    [debouncedQuery],
  );

  const { data, isFetching, error } = useSearchResults(params);
  const {
    data: suggestionData,
    isLoading: suggestionsLoading,
    error: suggestionsError,
  } = useSearchSuggestions();

  const hasQuery = debouncedQuery.trim().length > 0;
  const hasResults = Boolean(
    data &&
      (data.cards.length ||
        data.evidence.length ||
        data.evergreen.length ||
        data.applications.length ||
        data.directions.length),
  );

  const handleSuggestionSelect = useCallback(
    (item: SearchSuggestionItem) => {
      if (item.action.type === 'search') {
        setQuery(item.action.query);
        setDebouncedQuery(item.action.query);
        return;
      }

      if (item.action.type === 'navigate') {
        router.push(item.action.href);
      }
    },
    [router],
  );

  let bodyContent: ReactNode;

  if (!hasQuery) {
    if (suggestionsLoading) {
      bodyContent = (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent} size="small" />
        </View>
      );
    } else if (suggestionsError) {
      bodyContent = <StatusCard tone="error">推荐暂时不可用</StatusCard>;
    } else if (!suggestionData || suggestionData.groups.length === 0) {
      bodyContent = <StatusCard tone="muted">开始输入以唤起内容</StatusCard>;
    } else {
      bodyContent = (
        <View style={styles.sections}>
          {suggestionData.groups.map((group) => (
            <SuggestionSection key={group.id} group={group} onSelect={handleSuggestionSelect} />
          ))}
        </View>
      );
    }
  } else if (error) {
    bodyContent = <StatusCard tone="error">检索失败</StatusCard>;
  } else if (isFetching) {
    bodyContent = (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} size="small" />
      </View>
    );
  } else if (!hasResults || !data) {
    bodyContent = <StatusCard tone="muted">暂无结果</StatusCard>;
  } else {
    bodyContent = (
      <View style={styles.sections}>
        {data.cards.length > 0 ? (
          <ResultSection title="卡片">
            {data.cards.map((card) => (
              <CardResult key={card.id} card={card} onPress={() => router.push(`/cards/${card.id}`)} />
            ))}
          </ResultSection>
        ) : null}

        {data.evidence.length > 0 ? (
          <ResultSection title="证据">
            {data.evidence.map((item) => (
              <EvidenceResult
                key={item.id}
                evidence={item}
                onPress={() => router.push(`/cards/${item.card_id}`)}
              />
            ))}
          </ResultSection>
        ) : null}

        {data.evergreen.length > 0 ? (
          <ResultSection title="Evergreen">
            {data.evergreen.map((item) => (
              <EvergreenResult
                key={item.id}
                evergreen={item}
                onPress={() => router.push(`/cards/${item.id}`)}
              />
            ))}
          </ResultSection>
        ) : null}

        {data.applications.length > 0 ? (
          <ResultSection title="应用">
            {data.applications.map((application) => (
              <ApplicationResult
                key={application.id}
                application={application}
                onPress={() => router.push(`/cards/${application.card_id}`)}
              />
            ))}
          </ResultSection>
        ) : null}

        {data.directions.length > 0 ? (
          <ResultSection title="方向">
            {data.directions.map((direction) => (
              <DirectionResult key={direction.id} direction={direction} />
            ))}
          </ResultSection>
        ) : null}
      </View>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.header}>
          <Text variant="title">搜索</Text>
        </View>
        <View
          style={[
            styles.searchField,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.searchIcon, { color: theme.colors.textMuted }]}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="搜索方向、卡片、证据或应用"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, { color: theme.colors.textPrimary }]}
          />
        </View>
        {bodyContent}
      </ScrollView>
    </Screen>
  );
}

const StatusCard = ({ tone, children }: { tone: 'muted' | 'error'; children: ReactNode }) => {
  const { theme } = useTheme();
  const danger = theme.colors.danger;
  const textColor = tone === 'error' ? danger : theme.colors.textSecondary;
  const backgroundColor = tone === 'error' ? `${danger}12` : theme.colors.surfaceAlt;
  const glyph = tone === 'error' ? '⚠︎' : '⌕';

  return (
    <Card
      variant="outline"
      style={[
        styles.statusCard,
        {
          backgroundColor,
          borderColor: tone === 'error' ? danger : theme.colors.border,
        },
      ]}
    >
      <Text style={[styles.statusIcon, { color: textColor }]}>{glyph}</Text>
      <Text style={{ color: textColor }}>{children}</Text>
    </Card>
  );
};

const SuggestionSection = ({
  group,
  onSelect,
}: {
  group: SearchSuggestionGroup;
  onSelect: (item: SearchSuggestionItem) => void;
}) => {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="subtitle" style={{ color: theme.colors.textPrimary }}>
          {group.title}
        </Text>
        {group.hint ? (
          <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
            {group.hint}
          </Text>
        ) : null}
      </View>
      <View style={styles.sectionPills}>
        {group.items.map((item) => (
          <SuggestionItem key={item.id} item={item} onSelect={onSelect} />
        ))}
      </View>
    </View>
  );
};

const SuggestionItem = ({
  item,
  onSelect,
}: {
  item: SearchSuggestionItem;
  onSelect: (item: SearchSuggestionItem) => void;
}) => {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`使用建议：${item.label}`}
      onPress={() => onSelect(item)}
      style={({ pressed }) => [
        styles.suggestionPill,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderColor: theme.colors.border,
        },
        pressed ? { opacity: 0.86 } : undefined,
      ]}
    >
      <View style={styles.pillContent}>
        <Text style={[styles.pillLabel, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {item.label}
        </Text>
        {item.pill ? <Badge label={item.pill} /> : null}
      </View>
      {item.description ? (
        <Text variant="caption" style={{ color: theme.colors.textMuted }} numberOfLines={1}>
          {item.description}
        </Text>
      ) : null}
    </Pressable>
  );
};

const ResultSection = ({ title, children }: { title: string; children: ReactNode }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="subtitle" style={{ color: theme.colors.textPrimary }}>
          {title}
        </Text>
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
};

const CardResult = ({ card, onPress }: { card: SearchCardResult; onPress: () => void }) => {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}> 
      <Card variant="outline" style={styles.resultCard}>
        <ResultHeader
          title={card.title}
          caption={
            `${card.card_type.toUpperCase()} · ${card.direction_name}` +
            (card.skill_point_name ? ` · ${card.skill_point_name}` : '')
          }
        />
        <Text numberOfLines={3} style={{ color: theme.colors.textSecondary }}>
          {card.body}
        </Text>
        <View style={styles.badgesRow}>
          <Badge label={`优先级 ${card.priority.toFixed(2)}`} />
          <Badge label={`稳定度 ${card.stability.toFixed(2)}`} />
          {card.next_due ? <Badge label={`到期 ${formatDate(card.next_due)}`} /> : null}
        </View>
      </Card>
    </Pressable>
  );
};

const EvidenceResult = ({
  evidence,
  onPress,
}: {
  evidence: SearchEvidenceResult;
  onPress: () => void;
}) => {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}> 
      <Card variant="outline" style={styles.resultCard}>
        <ResultHeader
          title={evidence.card_title}
          caption={
            `${evidence.direction_name} · 来源 ${evidence.source_type}` +
            (evidence.source_uri ? ` · ${evidence.source_uri}` : '')
          }
        />
        <Text style={{ color: theme.colors.textSecondary }} numberOfLines={3}>
          {evidence.excerpt ?? '暂无摘录'}
        </Text>
        <View style={styles.badgesRow}>
          <Badge label={`可信度 ${evidence.credibility}`} />
          <Badge label={`记录于 ${formatDate(evidence.captured_at)}`} />
        </View>
      </Card>
    </Pressable>
  );
};

const EvergreenResult = ({
  evergreen,
  onPress,
}: {
  evergreen: SearchEvergreenResult;
  onPress: () => void;
}) => {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}> 
      <Card variant="outline" style={styles.resultCard}>
        <ResultHeader
          title={evergreen.title}
          caption={`${evergreen.direction_name} · 应用 ${evergreen.application_count}`}
        />
        <Text style={{ color: theme.colors.textSecondary }} numberOfLines={3}>
          {evergreen.summary}
        </Text>
        <View style={styles.badgesRow}>
          <Badge label={`稳定度 ${evergreen.stability.toFixed(2)}`} />
          {evergreen.last_applied_at ? (
            <Badge label={`最近应用 ${formatDate(evergreen.last_applied_at)}`} />
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
};

const ApplicationResult = ({
  application,
  onPress,
}: {
  application: SearchApplicationResult;
  onPress: () => void;
}) => {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}> 
      <Card variant="outline" style={styles.resultCard}>
        <ResultHeader
          title={application.card_title}
          caption={
            application.direction_name +
            (application.skill_point_name ? ` · ${application.skill_point_name}` : '')
          }
        />
        <Text style={{ color: theme.colors.textSecondary }} numberOfLines={3}>
          {application.context}
        </Text>
        <View style={styles.badgesRow}>
          <Badge label={`影响力 ${application.impact_score.toFixed(2)}`} />
          <Badge label={`记录于 ${formatDate(application.noted_at)}`} />
        </View>
      </Card>
    </Pressable>
  );
};

const DirectionResult = ({ direction }: { direction: SearchDirectionResult }) => {
  const { theme } = useTheme();
  return (
    <Card variant="outline" style={styles.resultCard}>
      <ResultHeader
        title={direction.name}
        caption={`阶段：${stageLabel(direction.stage)} · 卡片 ${direction.card_count} · 技能点 ${direction.skill_point_count}`}
      />
      <Text
        style={{ color: direction.quarterly_goal ? theme.colors.textSecondary : theme.colors.textMuted }}
        numberOfLines={3}
      >
        {direction.quarterly_goal ?? '—'}
      </Text>
    </Card>
  );
};

const ResultHeader = ({ title, caption }: { title: string; caption: string }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.resultHeader}>
      <Text variant="subtitle" style={{ color: theme.colors.textPrimary }}>
        {title}
      </Text>
      <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
        {caption}
      </Text>
    </View>
  );
};

const Badge = ({ label }: { label: string }) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
        {label}
      </Text>
    </View>
  );
};

const stageLabel = (stage: SearchDirectionResult['stage']) => {
  switch (stage) {
    case 'explore':
      return '探索';
    case 'shape':
      return '成型';
    case 'attack':
      return '攻坚';
    case 'stabilize':
      return '固化';
    default:
      return stage;
  }
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '未知日期';
  }
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingBottom: 32,
  },
  header: {
    gap: 4,
  },
  searchField: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  sections: {
    gap: 24,
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionContent: {
    gap: 12,
  },
  statusCard: {
    borderRadius: 14,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  statusIcon: {
    fontSize: 18,
  },
  resultCard: {
    gap: 12,
  },
  resultHeader: {
    gap: 4,
  },
  sectionPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionPill: {
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pillContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
});
