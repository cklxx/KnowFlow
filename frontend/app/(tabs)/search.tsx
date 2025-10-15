import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/ui/components/Screen';
import { Text } from '@/ui/components/Text';
import { useCardSearch } from '@/features/search';
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

  const { data, isFetching, error } = useCardSearch(params);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text variant="title">Search</Text>
          <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
            支持按标题、正文与方向关键词检索，结合到期与优先度排序。
          </Text>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="搜索卡片、证据或关键词"
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
        ) : data && data.length > 0 ? (
          <View style={styles.results}>
            {data.map((card) => (
              <Pressable
                key={card.id}
                onPress={() => router.push(`/cards/${card.id}`)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text variant="subtitle">{card.title}</Text>
                <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
                  {card.card_type.toUpperCase()} · 优先级 {card.priority.toFixed(2)} · 稳定度{' '}
                  {card.stability.toFixed(2)}
                </Text>
                <Text style={{ color: theme.colors.textSecondary }}>{card.body}</Text>
              </Pressable>
            ))}
          </View>
        ) : debouncedQuery ? (
          <Text>没有找到匹配的卡片，尝试调整关键词或方向。</Text>
        ) : (
          <Text>输入关键词以开始检索你的记忆卡片。</Text>
        )}
      </ScrollView>
    </Screen>
  );
}

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
  results: {
    gap: 12,
  },
  card: {
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
});
