import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Pressable,
} from 'react-native';

import type { GeneratedCardDraft, ImportSourceKind } from '@api';
import { useDirections, useCreateMemoryCard } from '@/features/directions';
import { Button, Card, Screen, Text } from '@/ui/components';
import { useTheme } from '@/providers';

import { useImportPreview, type ImportPreview } from '../hooks';

const SOURCE_KIND_OPTIONS: { kind: ImportSourceKind; label: string }[] = [
  { kind: 'markdown', label: 'Markdown' },
  { kind: 'text', label: '纯文本' },
  { kind: 'url', label: 'URL' },
  { kind: 'code', label: '代码片段' },
];

type SourceDraft = {
  id: string;
  kind: ImportSourceKind;
  title: string;
  content: string;
  url: string;
  tags: string;
};

const createSourceDraft = (kind: ImportSourceKind): SourceDraft => ({
  id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `source-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  kind,
  title: '',
  content: '',
  url: '',
  tags: '',
});

type DraftSelection = Set<string>;

const keyForDraft = (clusterId: string, index: number) => `${clusterId}:${index}`;

export const ImportWorkspace = () => {
  const { theme } = useTheme();
  const { data: directions = [] } = useDirections();
  const [directionId, setDirectionId] = useState<string | null>(null);
  const [directionNameHint, setDirectionNameHint] = useState('');
  const [language, setLanguage] = useState('');
  const [sources, setSources] = useState<SourceDraft[]>([createSourceDraft('markdown')]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selectedDrafts, setSelectedDrafts] = useState<DraftSelection>(new Set());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  useEffect(() => {
    if (!directionId && directions.length > 0) {
      setDirectionId(directions[0].id);
    }
  }, [directionId, directions]);

  const previewMutation = useImportPreview();
  const createCardMutation = useCreateMemoryCard(directionId ?? undefined);

  const directionChips = useMemo(
    () =>
      directions.map((direction) => ({
        id: direction.id,
        name: direction.name,
      })),
    [directions],
  );

  const applyPreviewSelection = (nextPreview: ImportPreview) => {
    const nextSelection: DraftSelection = new Set();
    nextPreview.clusters.forEach((cluster) => {
      cluster.drafts.forEach((_draft, index) => {
        nextSelection.add(keyForDraft(cluster.id, index));
      });
    });
    setSelectedDrafts(nextSelection);
  };

  const handleAddSource = (kind: ImportSourceKind) => {
    setSources((prev) => [...prev, createSourceDraft(kind)]);
  };

  const handleChangeSource = (id: string, field: keyof SourceDraft, value: string) => {
    setSources((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleRemoveSource = (id: string) => {
    setSources((prev) => prev.filter((item) => item.id !== id));
  };

  const handlePreview = async () => {
    setStatusMessage(null);
    const payloadSources = sources
      .map((source) => ({
        title: source.title.trim() || undefined,
        content: source.content,
        url: source.url.trim() || undefined,
        tags: source.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        kind: source.kind,
      }))
      .filter((source) => Boolean(source.content.trim()) || source.url);

    if (!payloadSources.length) {
      setStatusMessage('请至少输入一段材料或提供一个链接。');
      return;
    }

    try {
      const result = await previewMutation.mutateAsync({
        directionName: directionNameHint.trim() || undefined,
        language: language.trim() || undefined,
        desiredCardsPerCluster: 3,
        sources: payloadSources.map((source) => ({
          ...source,
          content: source.content.trim(),
        })),
      });
      setPreview(result);
      applyPreviewSelection(result);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '生成卡片失败');
    }
  };

  const toggleDraftSelection = (clusterId: string, index: number) => {
    setSelectedDrafts((prev) => {
      const next = new Set(prev);
      const key = keyForDraft(clusterId, index);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectedDraftList: GeneratedCardDraft[] = useMemo(() => {
    if (!preview) return [];
    const items: GeneratedCardDraft[] = [];
    preview.clusters.forEach((cluster) => {
      cluster.drafts.forEach((draft, index) => {
        if (selectedDrafts.has(keyForDraft(cluster.id, index))) {
          items.push(draft);
        }
      });
    });
    return items;
  }, [preview, selectedDrafts]);

  const handleCommit = async () => {
    if (!preview) {
      setStatusMessage('请先生成卡片草稿。');
      return;
    }
    if (!directionId) {
      setStatusMessage('请选择一个方向以写入卡片。');
      return;
    }
    if (!selectedDrafts.size) {
      setStatusMessage('请选择至少一张卡片。');
      return;
    }

    setIsCommitting(true);
    setStatusMessage(null);

    try {
      for (const draft of selectedDraftList) {
        await createCardMutation.mutateAsync({
          title: draft.draft.title,
          body: draft.draft.body,
          card_type: draft.draft.card_type,
          skill_point_id: draft.draft.skill_point_id ?? undefined,
          stability: draft.draft.stability ?? undefined,
          relevance: draft.draft.relevance ?? undefined,
          novelty: draft.draft.novelty ?? undefined,
          priority: draft.draft.priority ?? undefined,
          next_due: draft.draft.next_due ?? undefined,
        });
      }
      setStatusMessage('已写入选中的卡片到当前方向。');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '写入卡片失败');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text variant="title">导入上下文</Text>
          <Text variant="caption" style={{ color: theme.colors.textMuted }}>
            指定导入的目标方向与语言，帮助系统更准确生成卡片草稿。
          </Text>
          <View style={styles.fieldGroup}>
            <Text style={{ color: theme.colors.textSecondary }}>目标方向（可选）</Text>
            <TextInput
              placeholder="例如：AI × 阅读萃取"
              value={directionNameHint}
              onChangeText={setDirectionNameHint}
              style={[
                styles.input,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surfaceAlt,
                  color: theme.colors.textPrimary,
                },
              ]}
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={{ color: theme.colors.textSecondary }}>语言（可选）</Text>
            <TextInput
              placeholder="zh / en"
              value={language}
              onChangeText={setLanguage}
              style={[
                styles.input,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surfaceAlt,
                  color: theme.colors.textPrimary,
                },
              ]}
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={{ color: theme.colors.textSecondary, marginBottom: 8 }}>
              写入方向
            </Text>
            <View style={styles.chipRow}>
              {directionChips.map((chip) => {
                const isSelected = chip.id === directionId;
                return (
                  <Pressable
                    key={chip.id}
                    onPress={() => setDirectionId(chip.id)}
                    style={({ pressed }) => [
                      styles.chip,
                      {
                        borderColor: isSelected
                          ? theme.colors.accent
                          : theme.colors.border,
                        backgroundColor: isSelected
                          ? `${theme.colors.accent}12`
                          : theme.colors.surfaceAlt,
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: isSelected
                          ? theme.colors.accent
                          : theme.colors.textSecondary,
                        fontWeight: isSelected ? '600' : '500',
                      }}
                    >
                      {chip.name}
                    </Text>
                  </Pressable>
                );
              })}
              {directionChips.length === 0 ? (
                <Text style={{ color: theme.colors.textMuted }}>
                  还没有方向，先在 Tree 中创建一个。
                </Text>
              ) : null}
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.headerRow}>
            <Text variant="title">导入材料</Text>
            <View style={styles.kindRow}>
              {SOURCE_KIND_OPTIONS.map((option) => (
                <Pressable
                  key={option.kind}
                  onPress={() => handleAddSource(option.kind)}
                  style={({ pressed }) => [
                    styles.kindButton,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surfaceAlt,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.textSecondary }}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={{ gap: 16 }}>
            {sources.map((source) => (
              <Card key={source.id} variant="outline" style={styles.sourceCard}>
                <View style={styles.fieldGroup}>
                  <Text style={{ color: theme.colors.textSecondary }}>标题</Text>
                  <TextInput
                    placeholder="可选标题"
                    value={source.title}
                    onChangeText={(value) => handleChangeSource(source.id, 'title', value)}
                    style={[
                      styles.input,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surfaceAlt,
                        color: theme.colors.textPrimary,
                      },
                    ]}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={{ color: theme.colors.textSecondary }}>标签（逗号分隔，可选）</Text>
                  <TextInput
                    placeholder="方向, 主题"
                    value={source.tags}
                    onChangeText={(value) => handleChangeSource(source.id, 'tags', value)}
                    style={[
                      styles.input,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surfaceAlt,
                        color: theme.colors.textPrimary,
                      },
                    ]}
                    placeholderTextColor={theme.colors.textMuted}
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={{ color: theme.colors.textSecondary }}>原文</Text>
                  <TextInput
                    placeholder="粘贴材料、代码或总结"
                    value={source.content}
                    onChangeText={(value) => handleChangeSource(source.id, 'content', value)}
                    multiline
                    style={[
                      styles.multilineInput,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surfaceAlt,
                        color: theme.colors.textPrimary,
                      },
                    ]}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={{ color: theme.colors.textSecondary }}>来源链接（可选）</Text>
                  <TextInput
                    placeholder="https://..."
                    value={source.url}
                    onChangeText={(value) => handleChangeSource(source.id, 'url', value)}
                    style={[
                      styles.input,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surfaceAlt,
                        color: theme.colors.textPrimary,
                      },
                    ]}
                    placeholderTextColor={theme.colors.textMuted}
                    autoCapitalize="none"
                  />
                </View>
                <Button
                  title="移除材料"
                  variant="ghost"
                  onPress={() => handleRemoveSource(source.id)}
                />
              </Card>
            ))}
          </View>
          <Button
            title={previewMutation.isPending ? '生成中...' : '生成卡片草稿'}
            onPress={handlePreview}
            loading={previewMutation.isPending}
            style={{ marginTop: 12 }}
          />
        </Card>

        {preview ? (
          <Card>
            <Text variant="title">生成结果</Text>
            <Text variant="caption" style={{ color: theme.colors.textMuted }}>
              选择需要写入的卡片，确认后会保存到所选方向。
            </Text>
            <View style={{ gap: 20 }}>
              {preview.clusters.map((cluster) => (
                <Card key={cluster.id} variant="outline">
                  <Text style={{ color: theme.colors.textSecondary }}>{cluster.topic}</Text>
                  <Text style={{ color: theme.colors.textPrimary }}>{cluster.summary}</Text>
                  <View style={styles.materialList}>
                    {cluster.materials.map((material) => (
                      <View
                        key={material.id}
                        style={[
                          styles.materialPill,
                          {
                            backgroundColor: theme.colors.surfaceAlt,
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        <Text style={{ color: theme.colors.textMuted }}>
                          {material.title}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ gap: 12 }}>
                    {cluster.drafts.map((draft, index) => {
                      const key = keyForDraft(cluster.id, index);
                      const isSelected = selectedDrafts.has(key);
                      return (
                        <Pressable
                          key={key}
                          onPress={() => toggleDraftSelection(cluster.id, index)}
                          style={({ pressed }) => [
                            styles.draftCard,
                            {
                              borderColor: isSelected
                                ? theme.colors.accent
                                : theme.colors.border,
                              backgroundColor: isSelected
                                ? `${theme.colors.accent}10`
                                : theme.colors.surfaceAlt,
                              opacity: pressed ? 0.88 : 1,
                            },
                          ]}
                        >
                          <Text style={{
                            color: theme.colors.textSecondary,
                            fontWeight: '600',
                          }}>
                            {draft.draft.title}
                          </Text>
                          <Text style={{ color: theme.colors.textPrimary }}>
                            {draft.draft.body}
                          </Text>
                          <Text variant="caption" style={{ color: theme.colors.textMuted }}>
                            {draft.draft.card_type.toUpperCase()} · 置信度 {Math.round(
                              draft.confidence * 100,
                            ) / 100}
                          </Text>
                          <Text variant="caption" style={{ color: theme.colors.textMuted }}>
                            {draft.rationale}
                          </Text>
                        </Pressable>
                      );
                    })}
                    {cluster.drafts.length === 0 ? (
                      <Text style={{ color: theme.colors.textMuted }}>
                        未生成卡片草稿，可尝试补充材料。
                      </Text>
                    ) : null}
                  </View>
                </Card>
              ))}
            </View>
            <Button
              title="写入选中卡片"
              onPress={handleCommit}
              loading={isCommitting}
              disabled={!selectedDrafts.size || isCommitting}
              style={{ marginTop: 16 }}
            />
          </Card>
        ) : null}

        {statusMessage ? (
          <Text style={{ color: theme.colors.textMuted, textAlign: 'center' }}>
            {statusMessage}
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  multilineInput: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kindRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  kindButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  sourceCard: {
    gap: 16,
  },
  materialList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  materialPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  draftCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
});
