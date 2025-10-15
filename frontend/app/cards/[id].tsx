import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import type { CardType } from '@api';
import {
  CardMetricList,
  useCard,
  useCardEvidence,
  useCardMetrics,
  useCreateEvidence,
  useDeleteCard,
  useDeleteEvidence,
  useUpdateCard,
} from '@/features/cards';
import { useTheme } from '@/providers';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Text } from '@/ui/components/Text';

const CARD_TYPES: CardType[] = ['fact', 'concept', 'procedure', 'claim'];

type EvidenceDraft = {
  source_type: string;
  source_uri: string;
  excerpt: string;
  credibility: string;
};

const DEFAULT_EVIDENCE: EvidenceDraft = {
  source_type: 'url',
  source_uri: '',
  excerpt: '',
  credibility: '0',
};

export default function CardDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const cardId = useMemo(() => params.id, [params.id]);
  const router = useRouter();
  const { theme } = useTheme();

  const { data: card, isLoading, error } = useCard(cardId);
  const { data: evidence, isLoading: loadingEvidence } = useCardEvidence(cardId);
  const metrics = useCardMetrics(card ?? undefined);

  const updateCard = useUpdateCard(cardId);
  const deleteCard = useDeleteCard(cardId);
  const createEvidence = useCreateEvidence(cardId);
  const deleteEvidence = useDeleteEvidence(cardId);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [cardType, setCardType] = useState<CardType>('fact');
  const [stability, setStability] = useState('0');
  const [relevance, setRelevance] = useState('0');
  const [novelty, setNovelty] = useState('0');
  const [priority, setPriority] = useState('0');
  const [nextDue, setNextDue] = useState('');
  const [skillPointId, setSkillPointId] = useState('');
  const [evidenceDraft, setEvidenceDraft] = useState<EvidenceDraft>({ ...DEFAULT_EVIDENCE });

  useEffect(() => {
    if (!card) return;
    setTitle(card.title);
    setBody(card.body);
    setCardType(card.card_type);
    setStability(card.stability.toString());
    setRelevance(card.relevance.toString());
    setNovelty(card.novelty.toString());
    setPriority(card.priority.toString());
    setNextDue(card.next_due ?? '');
    setSkillPointId(card.skill_point_id ?? '');
  }, [card]);

  useEffect(() => {
    if (error) {
      Alert.alert('加载失败', error.message);
    }
  }, [error]);

  const handleSave = async () => {
    if (!cardId) return;

    const payload = {
      title: title.trim(),
      body: body.trim(),
      card_type: cardType,
      stability: Number.parseFloat(stability) || 0,
      relevance: Number.parseFloat(relevance) || 0,
      novelty: Number.parseFloat(novelty) || 0,
      priority: Number.parseFloat(priority) || 0,
      next_due: nextDue ? new Date(nextDue).toISOString() : null,
      skill_point_id: skillPointId.trim() ? skillPointId.trim() : null,
    };

    try {
      await updateCard.mutateAsync(payload);
      Alert.alert('已保存', '卡片详情已更新');
    } catch (err) {
      Alert.alert('保存失败', (err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!cardId) return;

    Alert.alert('删除卡片', '确认删除这张卡片？操作不可恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCard.mutateAsync();
            router.back();
          } catch (err) {
            Alert.alert('删除失败', (err as Error).message);
          }
        },
      },
    ]);
  };

  const handleCreateEvidence = async () => {
    if (!cardId) return;

    if (!evidenceDraft.source_type.trim()) {
      Alert.alert('请填写来源类型');
      return;
    }

    try {
      await createEvidence.mutateAsync({
        source_type: evidenceDraft.source_type.trim(),
        source_uri: evidenceDraft.source_uri.trim() || null,
        excerpt: evidenceDraft.excerpt.trim() || null,
        credibility: evidenceDraft.credibility ? Number(evidenceDraft.credibility) : null,
      });
      setEvidenceDraft({ ...DEFAULT_EVIDENCE });
    } catch (err) {
      Alert.alert('添加证据失败', (err as Error).message);
    }
  };

  const handleDeleteEvidence = async (id: string) => {
    try {
      await deleteEvidence.mutateAsync(id);
    } catch (err) {
      Alert.alert('删除失败', (err as Error).message);
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      </Screen>
    );
  }

  if (!cardId || !card) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text>未找到卡片。</Text>
        </View>
      </Screen>
    );
  }

  const isSaving = updateCard.isPending;
  const isDeleting = deleteCard.isPending;
  const isCreatingEvidence = createEvidence.isPending;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Button title="返回" variant="ghost" onPress={() => router.back()} />
          <View style={{ flex: 1 }} />
          <Button title="删除卡片" variant="ghost" onPress={handleDelete} disabled={isDeleting} />
        </View>

        <Card>
          <Text variant="title">卡片详情</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="标题"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
          />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="正文"
            placeholderTextColor={theme.colors.textMuted}
            multiline
            style={[
              styles.textArea,
              { color: theme.colors.textSecondary, borderColor: theme.colors.border },
            ]}
          />
          <View style={styles.row}>
            {CARD_TYPES.map((type) => (
              <Button
                key={type}
                title={type.toUpperCase()}
                variant={cardType === type ? 'primary' : 'secondary'}
                onPress={() => setCardType(type)}
              />
            ))}
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <Text variant="caption">Skill Point Id</Text>
              <TextInput
                value={skillPointId}
                onChangeText={setSkillPointId}
                placeholder="关联的技能点"
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              />
            </View>
            <View style={styles.half}>
              <Text variant="caption">Next Due</Text>
              <TextInput
                value={nextDue}
                onChangeText={setNextDue}
                placeholder="例如 2024-06-01T10:00:00Z"
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <Text variant="caption">Stability</Text>
              <TextInput
                value={stability}
                onChangeText={setStability}
                keyboardType="numeric"
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              />
            </View>
            <View style={styles.half}>
              <Text variant="caption">Relevance</Text>
              <TextInput
                value={relevance}
                onChangeText={setRelevance}
                keyboardType="numeric"
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <Text variant="caption">Novelty</Text>
              <TextInput
                value={novelty}
                onChangeText={setNovelty}
                keyboardType="numeric"
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              />
            </View>
            <View style={styles.half}>
              <Text variant="caption">Priority</Text>
              <TextInput
                value={priority}
                onChangeText={setPriority}
                keyboardType="numeric"
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              />
            </View>
          </View>
          <Button title="保存修改" onPress={handleSave} loading={isSaving} disabled={isSaving} />
        </Card>

        <Card>
          <Text variant="subtitle">当前指标</Text>
          <CardMetricList
            metrics={[
              { label: 'Stability', value: metrics.stability },
              { label: 'Relevance', value: metrics.relevance },
              { label: 'Novelty', value: metrics.novelty },
              { label: 'Priority', value: metrics.priority },
            ]}
          />
          <Text variant="caption" style={{ color: theme.colors.textMuted }}>
            指标值会在训练完成后自动刷新，也可在此手动微调。
          </Text>
        </Card>

        <Card>
          <Text variant="subtitle">添加证据</Text>
          <View style={styles.row}>
            <View style={styles.half}>
              <Text variant="caption">来源类型</Text>
              <TextInput
                value={evidenceDraft.source_type}
                onChangeText={(value) => setEvidenceDraft((prev) => ({ ...prev, source_type: value }))}
                placeholder="例如 url / note / code"
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              />
            </View>
            <View style={styles.half}>
              <Text variant="caption">可信度 (-5 ~ 5)</Text>
              <TextInput
                value={evidenceDraft.credibility}
                onChangeText={(value) => setEvidenceDraft((prev) => ({ ...prev, credibility: value }))}
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              />
            </View>
          </View>
          <TextInput
            value={evidenceDraft.source_uri}
            onChangeText={(value) => setEvidenceDraft((prev) => ({ ...prev, source_uri: value }))}
            placeholder="来源链接（可选）"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
          />
          <TextInput
            value={evidenceDraft.excerpt}
            onChangeText={(value) => setEvidenceDraft((prev) => ({ ...prev, excerpt: value }))}
            placeholder="摘录或代码片段"
            placeholderTextColor={theme.colors.textMuted}
            multiline
            style={[
              styles.textArea,
              { color: theme.colors.textSecondary, borderColor: theme.colors.border },
            ]}
          />
          <Button
            title="添加证据"
            onPress={handleCreateEvidence}
            loading={isCreatingEvidence}
            disabled={isCreatingEvidence}
          />
        </Card>

        <Card>
          <Text variant="subtitle">证据列表</Text>
          {loadingEvidence ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.colors.accent} />
            </View>
          ) : evidence && evidence.length > 0 ? (
            <View style={styles.list}>
              {evidence.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.evidence,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surface,
                    },
                  ]}
                >
                  <Text variant="caption">{item.source_type}</Text>
                  {item.source_uri ? (
                    <Text style={{ color: theme.colors.accent }}>{item.source_uri}</Text>
                  ) : null}
                  {item.excerpt ? (
                    <Text style={{ color: theme.colors.textSecondary }}>{item.excerpt}</Text>
                  ) : null}
                  <View style={styles.evidenceFooter}>
                    <Text variant="caption" style={{ color: theme.colors.textMuted }}>
                      Credibility: {item.credibility}
                    </Text>
                    <Button
                      title="删除"
                      variant="ghost"
                      onPress={() => handleDeleteEvidence(item.id)}
                      disabled={deleteEvidence.isPending}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text>暂未关联任何证据。</Text>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 48,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  half: {
    flex: 1,
    minWidth: '48%',
    gap: 8,
  },
  list: {
    gap: 12,
  },
  evidence: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  evidenceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
