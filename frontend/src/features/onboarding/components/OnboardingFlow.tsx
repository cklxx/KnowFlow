import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import {
  type CardType,
  type DirectionStage,
  type GeneratedCardDraft,
  type OnboardingBootstrapResult,
  type SkillLevel,
} from '@api';
import { useGenerateCardDrafts } from '@/features/intelligence';
import { useTheme, useToast } from '@/providers';
import { Button, Card, SegmentedControl, Text } from '@/ui/components';

import { useBootstrapOnboarding } from '../hooks';
import { DIRECTION_TEMPLATES, type DirectionTemplate } from '../templates';

type StepKey = 'directions' | 'stages' | 'skills' | 'materials' | 'review';

const STEPS: Array<{ key: StepKey; title: string; description: string }> = [
  {
    key: 'directions',
    title: '选择方向',
    description: '挑选 3–5 个最想推进的主题，可从推荐模板开始。',
  },
  {
    key: 'stages',
    title: '设定阶段与目标',
    description: '为每个方向标定阶段，并写下本季度想完成的“下一块砖”。',
  },
  {
    key: 'skills',
    title: '自评技能点',
    description: '梳理关键技能并做 0–3 级自评，帮助系统识别薄弱区。',
  },
  {
    key: 'materials',
    title: '导入材料 & 生成卡片',
    description: '粘贴最近的材料片段，调用 LLM 生成首批记忆卡片。',
  },
  {
    key: 'review',
    title: '确认并启动训练',
    description: '核对方向、技能与卡片草稿，一键写入数据库并生成今日计划。',
  },
];

const STAGE_OPTIONS = [
  { value: 'explore', label: '探索' },
  { value: 'shape', label: '成型' },
  { value: 'attack', label: '攻坚' },
  { value: 'stabilize', label: '固化' },
];

const LEVEL_OPTIONS = [
  { value: 'unknown', label: '0' },
  { value: 'emerging', label: '1' },
  { value: 'working', label: '2' },
  { value: 'fluent', label: '3' },
];

const CARD_TYPE_OPTIONS = [
  { value: 'concept', label: '概念' },
  { value: 'fact', label: '事实' },
  { value: 'procedure', label: '步骤' },
  { value: 'claim', label: '主张' },
];

const CARD_COUNT_OPTIONS = [
  { value: '3', label: '3' },
  { value: '5', label: '5' },
  { value: '8', label: '8' },
];

type LocalSkill = {
  id: string;
  name: string;
  summary: string;
  level: SkillLevel;
};

type LocalMaterial = {
  id: string;
  title: string;
  content: string;
};

type LocalDraft = GeneratedCardDraft & {
  id: string;
  selected: boolean;
};

type LocalDirection = {
  id: string;
  templateId: string | null;
  name: string;
  stage: DirectionStage;
  quarterlyGoal: string;
  skills: LocalSkill[];
  materials: LocalMaterial[];
  desiredCount: number;
  cardType: CardType;
  drafts: LocalDraft[];
};

const createId = () => Math.random().toString(36).slice(2, 10);

const createEmptySkill = (): LocalSkill => ({
  id: createId(),
  name: '',
  summary: '',
  level: 'unknown',
});

const createEmptyMaterial = (): LocalMaterial => ({
  id: createId(),
  title: '',
  content: '',
});

const buildDirectionFromTemplate = (template?: DirectionTemplate): LocalDirection => {
  const skills = template
    ? template.skills.map((skill) => ({
        id: createId(),
        name: skill.name,
        summary: skill.summary ?? '',
        level: skill.level ?? 'unknown',
      }))
    : [];

  return {
    id: createId(),
    templateId: template?.id ?? null,
    name: template?.name ?? '',
    stage: template?.defaultStage ?? 'explore',
    quarterlyGoal: template?.defaultGoal ?? '',
    skills: skills.length > 0 ? skills : [createEmptySkill()],
    materials: [createEmptyMaterial()],
    desiredCount: template?.defaultCardType === 'procedure' ? 3 : 5,
    cardType: template?.defaultCardType ?? 'concept',
    drafts: [],
  };
};

const hasContent = (value: string) => value.trim().length > 0;

export const OnboardingFlow = () => {
  const { theme } = useTheme();
  const { showToast } = useToast();

  const [stepIndex, setStepIndex] = useState(0);
  const [directions, setDirections] = useState<LocalDirection[]>(() => [
    buildDirectionFromTemplate(DIRECTION_TEMPLATES[0]),
    buildDirectionFromTemplate(DIRECTION_TEMPLATES[1]),
  ]);
  const [generatingDirection, setGeneratingDirection] = useState<string | null>(null);
  const [result, setResult] = useState<OnboardingBootstrapResult | null>(null);

  const generateDrafts = useGenerateCardDrafts();
  const bootstrap = useBootstrapOnboarding();

  const currentStep = STEPS[stepIndex];
  const isFinalStep = currentStep.key === 'review';
  const onboardingComplete = Boolean(result);

  const availableTemplates = useMemo(
    () =>
      DIRECTION_TEMPLATES.filter(
        (template) => !directions.some((direction) => direction.templateId === template.id),
      ),
    [directions],
  );

  const canAdvance = useMemo(() => {
    if (directions.length === 0) {
      return false;
    }
    switch (currentStep.key) {
      case 'directions':
        return directions.some((direction) => hasContent(direction.name));
      case 'stages':
        return directions.every((direction) => hasContent(direction.quarterlyGoal));
      case 'skills':
        return directions.every((direction) =>
          direction.skills.some((skill) => hasContent(skill.name)),
        );
      case 'materials':
        return directions.some((direction) =>
          direction.drafts.some((draft) => draft.selected),
        );
      case 'review':
      default:
        return true;
    }
  }, [directions, currentStep.key]);

  const handleAddDirection = (template?: DirectionTemplate) => {
    setDirections((prev) => [...prev, buildDirectionFromTemplate(template)]);
  };

  const handleRemoveDirection = (id: string) => {
    setDirections((prev) => {
      if (prev.length <= 1) {
        showToast({
          message: '至少保留一个方向才能继续。',
          variant: 'info',
        });
        return prev;
      }
      return prev.filter((direction) => direction.id !== id);
    });
  };

  const updateDirection = (id: string, updater: (direction: LocalDirection) => LocalDirection) => {
    setDirections((prev) => prev.map((direction) => (direction.id === id ? updater(direction) : direction)));
  };

  const handleAddSkill = (directionId: string) => {
    updateDirection(directionId, (direction) => ({
      ...direction,
      skills: [...direction.skills, createEmptySkill()],
    }));
  };

  const handleRemoveSkill = (directionId: string, skillId: string) => {
    updateDirection(directionId, (direction) => {
      if (direction.skills.length <= 1) {
        return direction;
      }
      return {
        ...direction,
        skills: direction.skills.filter((skill) => skill.id !== skillId),
      };
    });
  };

  const handleAddMaterial = (directionId: string) => {
    updateDirection(directionId, (direction) => ({
      ...direction,
      materials: [...direction.materials, createEmptyMaterial()],
    }));
  };

  const handleRemoveMaterial = (directionId: string, materialId: string) => {
    updateDirection(directionId, (direction) => {
      if (direction.materials.length <= 1) {
        return direction;
      }
      return {
        ...direction,
        materials: direction.materials.filter((material) => material.id !== materialId),
      };
    });
  };

  const handleToggleDraft = (directionId: string, draftId: string) => {
    updateDirection(directionId, (direction) => ({
      ...direction,
      drafts: direction.drafts.map((draft) =>
        draft.id === draftId ? { ...draft, selected: !draft.selected } : draft,
      ),
    }));
  };

  const handleGenerateDrafts = async (directionId: string) => {
    const direction = directions.find((item) => item.id === directionId);
    if (!direction) return;

    const materials = direction.materials.filter((material) => hasContent(material.content));
    if (materials.length === 0) {
      showToast({ message: '请先粘贴至少一段材料内容。', variant: 'info' });
      return;
    }

    setGeneratingDirection(directionId);
    try {
      const drafts = await generateDrafts.mutateAsync({
        directionName: hasContent(direction.name) ? direction.name : undefined,
        materials: materials.map((material) => ({
          title: hasContent(material.title) ? material.title : undefined,
          content: material.content,
        })),
        preferredCardType: direction.cardType,
        desiredCount: direction.desiredCount,
      });

      updateDirection(directionId, (current) => ({
        ...current,
        drafts: drafts.map((draft) => ({
          ...draft,
          id: createId(),
          selected: true,
        })),
      }));

      showToast({ message: '已生成卡片草稿，可点击卡片调整选择。', variant: 'success' });
    } catch (error) {
      console.error(error);
      showToast({ message: '生成卡片草稿失败，请稍后再试。', variant: 'error' });
    } finally {
      setGeneratingDirection(null);
    }
  };

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex((index) => Math.max(index - 1, 0));
    }
  };

  const handleComplete = async () => {
    if (bootstrap.isPending) return;

    if (onboardingComplete) {
      router.replace('/(tabs)/today');
      return;
    }

    const payload = {
      directions: directions
        .filter((direction) => hasContent(direction.name))
        .map((direction) => {
          const selectedDrafts = direction.drafts.filter((draft) => draft.selected);
          const defaultSkill = direction.skills.find((skill) => hasContent(skill.name)) ?? direction.skills[0];

          return {
            name: direction.name.trim(),
            stage: direction.stage,
            quarterly_goal: direction.quarterlyGoal.trim() || null,
            skills: direction.skills
              .filter((skill) => hasContent(skill.name))
              .map((skill) => ({
                name: skill.name.trim(),
                summary: skill.summary.trim() || null,
                level: skill.level,
              })),
            cards: selectedDrafts.map((draft) => ({
              title: draft.draft.title,
              body: draft.draft.body,
              card_type: draft.draft.card_type,
              stability: draft.draft.stability,
              relevance: draft.draft.relevance,
              novelty: draft.draft.novelty,
              priority: draft.draft.priority,
              next_due: draft.draft.next_due,
              skill_point_name: defaultSkill && hasContent(defaultSkill.name) ? defaultSkill.name.trim() : null,
            })),
          };
        }),
    };

    if (payload.directions.length === 0) {
      showToast({ message: '至少需要一个有效方向才能写入数据。', variant: 'info' });
      return;
    }

    if (!payload.directions.some((direction) => direction.cards.length > 0)) {
      showToast({ message: '请选择至少一张卡片草稿。', variant: 'info' });
      return;
    }

    try {
      const response = await bootstrap.mutateAsync(payload);
      setResult(response);
      showToast({ message: '已写入方向、技能与卡片，今日训练就绪。', variant: 'success' });
    } catch (error) {
      console.error(error);
      showToast({ message: '写入数据失败，请稍后再试。', variant: 'error' });
    }
  };

  const renderDirectionChips = () => (
    <View style={styles.templateRow}>
      {availableTemplates.map((template) => (
        <Pressable
          key={template.id}
          accessibilityRole="button"
          onPress={() => handleAddDirection(template)}
          style={[styles.templateChip, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
        >
          <Text style={{ color: theme.colors.textSecondary, fontWeight: '500' }}>{template.name}</Text>
          <Text variant="caption" style={{ color: theme.colors.textMuted }}>
            {template.defaultGoal}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const renderDirectionsStep = () => (
    <View style={styles.sectionGap}>
      {directions.map((direction, index) => (
        <Card key={direction.id}>
          <View style={styles.cardHeader}>
            <Text variant="subtitle">方向 {index + 1}</Text>
            <Pressable onPress={() => handleRemoveDirection(direction.id)}>
              <Text style={{ color: theme.colors.textMuted }}>移除</Text>
            </Pressable>
          </View>
          <View style={styles.inputGroup}>
            <Text variant="caption">方向名称</Text>
            <TextInput
              placeholder="例如：Rust × 检索"
              value={direction.name}
              onChangeText={(text) =>
                updateDirection(direction.id, (current) => ({ ...current, name: text }))
              }
              style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt, color: theme.colors.textPrimary }]}
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text variant="caption">一句话说明</Text>
            <TextInput
              placeholder="该方向想解决的核心问题"
              value={direction.quarterlyGoal}
              onChangeText={(text) =>
                updateDirection(direction.id, (current) => ({ ...current, quarterlyGoal: text }))
              }
              style={[styles.input, styles.multiline, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt, color: theme.colors.textPrimary }]}
              placeholderTextColor={theme.colors.textMuted}
              multiline
            />
          </View>
        </Card>
      ))}
      <Button title="添加自定义方向" variant="secondary" onPress={() => handleAddDirection()} />
      {availableTemplates.length > 0 ? (
        <View>
          <Text variant="caption" style={{ marginBottom: 8 }}>
            或者从模板开始：
          </Text>
          {renderDirectionChips()}
        </View>
      ) : null}
    </View>
  );

  const renderStageStep = () => (
    <View style={styles.sectionGap}>
      {directions.map((direction) => (
        <Card key={direction.id}>
          <Text variant="subtitle">{direction.name || '未命名方向'}</Text>
          <Text variant="caption">阶段</Text>
          <SegmentedControl
            options={STAGE_OPTIONS}
            value={direction.stage}
            onChange={(value) =>
              updateDirection(direction.id, (current) => ({
                ...current,
                stage: value as DirectionStage,
              }))
            }
          />
          <View style={styles.inputGroup}>
            <Text variant="caption">季度目标</Text>
            <TextInput
              placeholder="本季度完成的可验证成果"
              value={direction.quarterlyGoal}
              onChangeText={(text) =>
                updateDirection(direction.id, (current) => ({ ...current, quarterlyGoal: text }))
              }
              style={[styles.input, styles.multiline, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt, color: theme.colors.textPrimary }]}
              placeholderTextColor={theme.colors.textMuted}
              multiline
            />
          </View>
        </Card>
      ))}
    </View>
  );

  const renderSkillsStep = () => (
    <View style={styles.sectionGap}>
      {directions.map((direction) => (
        <Card key={direction.id}>
          <Text variant="subtitle">{direction.name || '未命名方向'}</Text>
          <Text variant="caption" style={{ marginBottom: 8 }}>
            为该方向列出 3 个技能点，并给出 0–3 的掌握度。
          </Text>
          <View style={styles.stackGap}>
            {direction.skills.map((skill) => (
              <View key={skill.id} style={[styles.skillCard, { borderColor: theme.colors.border }]}>
                <View style={styles.skillHeader}>
                  <TextInput
                    placeholder="技能点名称"
                    value={skill.name}
                    onChangeText={(text) => {
                      updateDirection(direction.id, (current) => ({
                        ...current,
                        skills: current.skills.map((item) =>
                          item.id === skill.id ? { ...item, name: text } : item,
                        ),
                      }));
                    }}
                    style={[styles.skillInput, { color: theme.colors.textPrimary }]}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  <Pressable onPress={() => handleRemoveSkill(direction.id, skill.id)}>
                    <Text style={{ color: theme.colors.textMuted }}>移除</Text>
                  </Pressable>
                </View>
                <TextInput
                  placeholder="一句话描述该技能点"
                  value={skill.summary}
                  onChangeText={(text) => {
                    updateDirection(direction.id, (current) => ({
                      ...current,
                      skills: current.skills.map((item) =>
                        item.id === skill.id ? { ...item, summary: text } : item,
                      ),
                    }));
                  }}
                  style={[
                    styles.input,
                    styles.multiline,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surfaceAlt,
                      color: theme.colors.textSecondary,
                    },
                  ]}
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                />
                <SegmentedControl
                  options={LEVEL_OPTIONS}
                  value={skill.level}
                  onChange={(value) =>
                    updateDirection(direction.id, (current) => ({
                      ...current,
                      skills: current.skills.map((item) =>
                        item.id === skill.id ? { ...item, level: value as SkillLevel } : item,
                      ),
                    }))
                  }
                />
              </View>
            ))}
          </View>
          <Button title="添加技能点" variant="secondary" onPress={() => handleAddSkill(direction.id)} style={{ marginTop: 12 }} />
        </Card>
      ))}
    </View>
  );

  const renderMaterialsStep = () => (
    <View style={styles.sectionGap}>
      {directions.map((direction) => (
        <Card key={direction.id}>
          <Text variant="subtitle">{direction.name || '未命名方向'}</Text>
          <View style={styles.stackGap}>
            <View style={styles.inlineControls}>
              <SegmentedControl
                options={CARD_TYPE_OPTIONS}
                value={direction.cardType}
                onChange={(value) =>
                  updateDirection(direction.id, (current) => ({
                    ...current,
                    cardType: value as CardType,
                  }))
                }
              />
              <SegmentedControl
                options={CARD_COUNT_OPTIONS}
                value={String(direction.desiredCount)}
                onChange={(value) =>
                  updateDirection(direction.id, (current) => ({
                    ...current,
                    desiredCount: Number.parseInt(value, 10),
                  }))
                }
              />
            </View>
            {direction.materials.map((material) => (
              <View key={material.id} style={styles.materialCard}>
                <View style={styles.cardHeader}>
                  <Text variant="caption">材料片段</Text>
                  <Pressable onPress={() => handleRemoveMaterial(direction.id, material.id)}>
                    <Text style={{ color: theme.colors.textMuted }}>删除</Text>
                  </Pressable>
                </View>
                <TextInput
                  placeholder="标题（可选）"
                  value={material.title}
                  onChangeText={(text) =>
                    updateDirection(direction.id, (current) => ({
                      ...current,
                      materials: current.materials.map((item) =>
                        item.id === material.id ? { ...item, title: text } : item,
                      ),
                    }))
                  }
                  style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt, color: theme.colors.textPrimary }]}
                  placeholderTextColor={theme.colors.textMuted}
                />
                <TextInput
                  placeholder="粘贴原文/代码/摘要……"
                  value={material.content}
                  onChangeText={(text) =>
                    updateDirection(direction.id, (current) => ({
                      ...current,
                      materials: current.materials.map((item) =>
                        item.id === material.id ? { ...item, content: text } : item,
                      ),
                    }))
                  }
                  style={[styles.input, styles.multiline, { height: 120, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt, color: theme.colors.textSecondary }]}
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                />
              </View>
            ))}
            <Button title="添加材料" variant="secondary" onPress={() => handleAddMaterial(direction.id)} />
            <Button
              title={generatingDirection === direction.id ? '正在生成…' : '生成卡片草稿'}
              onPress={() => handleGenerateDrafts(direction.id)}
              loading={generatingDirection === direction.id}
            />
            {generateDrafts.error && generatingDirection === direction.id ? (
              <Text style={{ color: theme.colors.danger }}>生成失败，请检查网络或稍后重试。</Text>
            ) : null}
            <View style={styles.draftList}>
              {direction.drafts.length === 0 ? (
                <Text variant="caption" style={{ color: theme.colors.textMuted }}>
                  暂无草稿，粘贴材料后点击“生成卡片草稿”。
                </Text>
              ) : (
                direction.drafts.map((draft) => (
                  <Pressable
                    key={draft.id}
                    onPress={() => handleToggleDraft(direction.id, draft.id)}
                    style={[
                      styles.draftCard,
                      {
                        borderColor: draft.selected ? theme.colors.accent : theme.colors.border,
                        backgroundColor: draft.selected
                          ? theme.colors.surface
                          : theme.colors.surfaceAlt,
                      },
                    ]}
                  >
                    <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>
                      {draft.draft.title}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary }} numberOfLines={3}>
                      {draft.draft.body}
                    </Text>
                    <Text variant="caption" style={{ color: theme.colors.textMuted }}>
                      {draft.draft.card_type.toUpperCase()} · 置信度 {Math.round(draft.confidence * 100)}%
                    </Text>
                  </Pressable>
                ))
              )}
            </View>
          </View>
        </Card>
      ))}
    </View>
  );

  const renderReviewStep = () => {
    const totalCards = directions.reduce(
      (sum, direction) => sum + direction.drafts.filter((draft) => draft.selected).length,
      0,
    );

    return (
      <View style={styles.sectionGap}>
        <Card>
          <Text variant="subtitle">方向与技能概览</Text>
          <View style={styles.stackGap}>
            {directions.map((direction) => (
              <View key={direction.id} style={styles.summaryCard}>
                <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>
                  {direction.name || '未命名方向'}
                </Text>
                <Text variant="caption" style={{ color: theme.colors.textMuted }}>
                  阶段：{STAGE_OPTIONS.find((option) => option.value === direction.stage)?.label ?? direction.stage}
                </Text>
                <Text style={{ color: theme.colors.textSecondary }}>{direction.quarterlyGoal}</Text>
                <Text variant="caption" style={{ color: theme.colors.textMuted, marginTop: 8 }}>
                  技能点
                </Text>
                {direction.skills.map((skill) => (
                  <Text key={skill.id} style={{ color: theme.colors.textSecondary }}>
                    · {skill.name || '未命名技能'}（{LEVEL_OPTIONS.find((option) => option.value === skill.level)?.label ?? skill.level}）
                  </Text>
                ))}
                <Text variant="caption" style={{ color: theme.colors.textMuted, marginTop: 8 }}>
                  选中的卡片：{direction.drafts.filter((draft) => draft.selected).length}
                </Text>
              </View>
            ))}
          </View>
        </Card>
        <Card>
          <Text variant="subtitle">今日训练预览</Text>
          <Text style={{ color: theme.colors.textSecondary }}>
            本次将写入 {directions.length} 个方向、{totalCards} 张卡片，并自动排程今日训练。
          </Text>
          {result ? (
            <View style={{ marginTop: 12, gap: 8 }}>
              <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>
                已完成初始化
              </Text>
              {result.today_plan ? (
                <Text style={{ color: theme.colors.textSecondary }}>
                  今日计划：共 {result.today_plan.totals.total_cards} 张卡片，包含测验 {result.today_plan.totals.quiz}、应用 {result.today_plan.totals.apply}、巩固 {result.today_plan.totals.review}。
                </Text>
              ) : (
                <Text style={{ color: theme.colors.textSecondary }}>
                  暂无今日计划，请稍后在 Today 页手动刷新。
                </Text>
              )}
              <Button title="前往 Today 开始训练" onPress={() => router.replace('/(tabs)/today')} />
            </View>
          ) : (
            <Button
              title={bootstrap.isPending ? '写入中…' : '写入数据并生成计划'}
              onPress={handleComplete}
              loading={bootstrap.isPending}
              disabled={bootstrap.isPending}
            />
          )}
        </Card>
      </View>
    );
  };

  const renderStepContent = () => {
    switch (currentStep.key) {
      case 'directions':
        return renderDirectionsStep();
      case 'stages':
        return renderStageStep();
      case 'skills':
        return renderSkillsStep();
      case 'materials':
        return renderMaterialsStep();
      case 'review':
      default:
        return renderReviewStep();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="title">快速上手</Text>
          <Text style={{ color: theme.colors.textSecondary }}>{currentStep.description}</Text>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.border }] }>
            <View
              style={{
                width: `${((stepIndex + 1) / STEPS.length) * 100}%`,
                backgroundColor: theme.colors.accent,
                borderRadius: 999,
                height: '100%',
              }}
            />
          </View>
        </View>
        {renderStepContent()}
      </ScrollView>
      <View style={[styles.footer, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }] }>
        <Button title="上一步" variant="ghost" onPress={handlePrev} disabled={stepIndex === 0} />
        {isFinalStep ? (
          <Button
            title={onboardingComplete ? '已完成' : bootstrap.isPending ? '写入中…' : '完成引导'}
            onPress={handleComplete}
            loading={bootstrap.isPending}
            disabled={!canAdvance || bootstrap.isPending || onboardingComplete}
          />
        ) : (
          <Button title="下一步" onPress={handleNext} disabled={!canAdvance} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingBottom: 120,
    gap: 20,
  },
  header: {
    gap: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  sectionGap: {
    gap: 16,
  },
  stackGap: {
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputGroup: {
    gap: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  templateRow: {
    flexDirection: 'column',
    gap: 12,
  },
  templateChip: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  skillCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  skillInput: {
    flex: 1,
    fontSize: 16,
  },
  inlineControls: {
    gap: 12,
  },
  materialCard: {
    gap: 8,
  },
  draftList: {
    gap: 12,
  },
  draftCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  summaryCard: {
    gap: 6,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
});
