import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
} from '@api';
import { useSearchResults } from '@/features/search';
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

  const hasQuery = debouncedQuery.trim().length > 0;
  const hasResults = Boolean(
    data &&
      (data.cards.length ||
        data.evidence.length ||
        data.evergreen.length ||
        data.applications.length ||
        data.directions.length),
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text variant="title">搜索</Text>
          <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
            输入关键词，跨方向检索卡片、证据、应用记录与 Evergreen 摘要。
          </Text>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="搜索方向、卡片、证据或应用"
          placeholderTextColor={theme.colors.textMuted}
          style={[
            styles.input,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              color: theme.colors.textPrimary,
            },
          ]}
        />
        {error ? (
          <Text>检索失败：{error.message}</Text>
        ) : isFetching ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : !hasQuery ? (
          <Text style={{ color: theme.colors.textSecondary }}>输入关键词以开始检索你的知识库。</Text>
        ) : !hasResults ? (
          <Text style={{ color: theme.colors.textSecondary }}>
            暂无匹配结果，试试其他关键词或过滤条件。
          </Text>
        ) : data ? (
          <View style={styles.sections}>
            {data.cards.length > 0 ? (
              <ResultSection title="卡片">
                {data.cards.map((card) => (
                  <CardResult key={card.id} card={card} onPress={() => router.push(`/cards/${card.id}`)} />
                ))}
              </ResultSection>
            ) : null}

            {data.evidence.length > 0 ? (
              <ResultSection title="证据高光">
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
              <ResultSection title="Evergreen 摘要">
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
              <ResultSection title="最近应用">
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
              <ResultSection title="方向概览">
                {data.directions.map((direction) => (
                  <DirectionResult key={direction.id} direction={direction} />
                ))}
              </ResultSection>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const ResultSection = ({ title, children }: { title: string; children: ReactNode }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <Text variant="subtitle" style={{ color: theme.colors.textPrimary }}>
        {title}
      </Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
};

const CardResult = ({ card, onPress }: { card: SearchCardResult; onPress: () => void }) => {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}> 
      <Card variant="outline" style={styles.resultCard}>
        <Text variant="subtitle" style={{ color: theme.colors.textPrimary }}>
          {card.title}
        </Text>
        <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
          {card.card_type.toUpperCase()} · {card.direction_name}
          {card.skill_point_name ? ` · ${card.skill_point_name}` : ''}
        </Text>
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
        <Text variant="subtitle" style={{ color: theme.colors.textPrimary }}>
          {evidence.card_title}
        </Text>
        <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
          {evidence.direction_name} · 来源 {evidence.source_type}
          {evidence.source_uri ? ` · ${evidence.source_uri}` : ''}
        </Text>
        <Text style={{ color: theme.colors.textSecondary }} numberOfLines={3}>
          {evidence.excerpt ?? '暂无摘录，可打开卡片查看原文。'}
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
        <Text variant="subtitle" style={{ color: theme.colors.textPrimary }}>
          {evergreen.title}
        </Text>
        <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
          {evergreen.direction_name} · 应用 {evergreen.application_count}
        </Text>
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
        <Text variant="subtitle" style={{ color: theme.colors.textPrimary }}>
          {application.card_title}
        </Text>
        <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
          {application.direction_name}
          {application.skill_point_name ? ` · ${application.skill_point_name}` : ''}
        </Text>
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
      <Text variant="subtitle" style={{ color: theme.colors.textPrimary }}>
        {direction.name}
      </Text>
      <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
        阶段：{stageLabel(direction.stage)} · 卡片 {direction.card_count} · 技能点 {direction.skill_point_count}
      </Text>
      {direction.quarterly_goal ? (
        <Text style={{ color: theme.colors.textSecondary }} numberOfLines={3}>
          {direction.quarterly_goal}
        </Text>
      ) : (
        <Text variant="caption" style={{ color: theme.colors.textMuted }}>
          暂无季度目标。
        </Text>
      )}
    </Card>
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
    gap: 16,
    paddingBottom: 32,
  },
  header: {
    gap: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  sections: {
    gap: 20,
  },
  section: {
    gap: 12,
  },
  sectionContent: {
    gap: 12,
  },
  resultCard: {
    gap: 8,
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
    paddingVertical: 4,
  },
});
