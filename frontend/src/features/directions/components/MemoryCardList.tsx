import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  useCreateMemoryCard,
  useDeleteMemoryCard,
  useSkillPoints,
  useMemoryCards,
  useUpdateMemoryCard,
} from '../hooks';
import { Text } from '@/ui/components/Text';
import { useTheme, useToast } from '@/providers';
import type { SkillPoint } from '@api';

const CARD_TYPES: Array<'fact' | 'concept' | 'procedure' | 'claim'> = [
  'fact',
  'concept',
  'procedure',
  'claim',
];

const UNASSIGNED_FILTER = '__unassigned__';

type SkillPointFilterValue = string | typeof UNASSIGNED_FILTER | null;

type Props = {
  directionId?: string;
};

export const MemoryCardList = ({ directionId }: Props) => {
  const { theme } = useTheme();
  const { mutateAsync: createMemoryCard, isPending: creating } = useCreateMemoryCard(directionId);
  const { mutateAsync: updateMemoryCard, isPending: updating } = useUpdateMemoryCard(directionId);
  const { mutateAsync: deleteMemoryCard, isPending: deleting } = useDeleteMemoryCard(directionId);
  const {
    data: skillPoints = [],
    isLoading: skillPointsLoading,
  } = useSkillPoints(directionId);
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [cardType, setCardType] = useState<'fact' | 'concept' | 'procedure' | 'claim'>('fact');
  const [skillPointId, setSkillPointId] = useState<string | null>(null);
  const [filterSkillPointId, setFilterSkillPointId] = useState<SkillPointFilterValue>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editType, setEditType] = useState<'fact' | 'concept' | 'procedure' | 'claim'>('fact');
  const [editSkillPointId, setEditSkillPointId] = useState<string | null>(null);

  useEffect(() => {
    setSkillPointId(null);
    setEditingId(null);
    setEditSkillPointId(null);
    setFilterSkillPointId(null);
  }, [directionId]);

  useEffect(() => {
    if (skillPointId && !skillPoints.some((skill) => skill.id === skillPointId)) {
      setSkillPointId(null);
    }
  }, [skillPointId, skillPoints]);

  useEffect(() => {
    if (editSkillPointId && !skillPoints.some((skill) => skill.id === editSkillPointId)) {
      setEditSkillPointId(null);
    }
  }, [editSkillPointId, skillPoints]);

  useEffect(() => {
    if (
      filterSkillPointId &&
      filterSkillPointId !== UNASSIGNED_FILTER &&
      !skillPoints.some((skill) => skill.id === filterSkillPointId)
    ) {
      setFilterSkillPointId(null);
    }
  }, [filterSkillPointId, skillPoints]);

  useEffect(() => {
    if (filterSkillPointId === UNASSIGNED_FILTER) {
      setSkillPointId(null);
    } else if (filterSkillPointId) {
      setSkillPointId(filterSkillPointId);
    }
  }, [filterSkillPointId]);

  const appliedSkillPointId =
    filterSkillPointId && filterSkillPointId !== UNASSIGNED_FILTER ? filterSkillPointId : undefined;

  const {
    data: cards = [],
    isLoading: cardsLoading,
    isError,
  } = useMemoryCards(directionId, appliedSkillPointId);

  const cardsToDisplay = useMemo(() => {
    if (filterSkillPointId === UNASSIGNED_FILTER) {
      return cards.filter((card) => !card.skill_point_id);
    }
    return cards;
  }, [cards, filterSkillPointId]);

  const skillPointNameMap = useMemo(() => {
    const map = new Map<string, string>();
    skillPoints.forEach((skill) => {
      map.set(skill.id, skill.name);
    });
    return map;
  }, [skillPoints]);

  if (!directionId) {
    return <Text variant="caption">Pick a direction to review cards.</Text>;
  }

  if (cardsLoading || skillPointsLoading) {
    return <ActivityIndicator />;
  }

  const handleCreate = async () => {
    if (!directionId || !title.trim()) return;
    try {
      await createMemoryCard({
        title: title.trim(),
        body,
        card_type: cardType,
        skill_point_id: skillPointId,
      });
      showToast({ message: 'Memory card created', variant: 'success' });
      setTitle('');
      setBody('');
      const nextSkillPointId =
        filterSkillPointId && filterSkillPointId !== UNASSIGNED_FILTER ? filterSkillPointId : null;
      setSkillPointId(nextSkillPointId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create memory card';
      showToast({ message, variant: 'error' });
    }
  };

  const handleStartEdit = (
    cardId: string,
    cardTitle: string,
    cardBody: string,
    type: 'fact' | 'concept' | 'procedure' | 'claim',
    cardSkillPointId: string | null,
  ) => {
    setEditingId(cardId);
    setEditTitle(cardTitle);
    setEditBody(cardBody);
    setEditType(type);
    setEditSkillPointId(cardSkillPointId);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;
    try {
      await updateMemoryCard({
        id: editingId,
        payload: {
          title: editTitle.trim(),
          body: editBody,
          card_type: editType,
          skill_point_id: editSkillPointId,
        },
      });
      showToast({ message: 'Memory card updated', variant: 'success' });
      setEditingId(null);
      setEditSkillPointId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update memory card';
      showToast({ message, variant: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMemoryCard(id);
      showToast({ message: 'Memory card removed', variant: 'success' });
      if (editingId === id) {
        setEditingId(null);
        setEditSkillPointId(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete memory card';
      showToast({ message, variant: 'error' });
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Delete memory card', 'This card will be removed from workouts. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDelete(id),
      },
    ]);
  };

  const emptyMessage =
    filterSkillPointId === UNASSIGNED_FILTER
      ? 'No unassigned cards yet.'
      : filterSkillPointId
      ? 'No cards for this skill point yet.'
      : 'No cards yet. Import sources or create manually.';

  return (
    <View style={styles.list}>
      <SkillPointFilter
        skillPoints={skillPoints}
        selectedId={filterSkillPointId}
        onSelect={setFilterSkillPointId}
      />
      {isError ? (
        <View style={styles.empty}>
          <Text>Failed to load memory cards.</Text>
        </View>
      ) : null}
      {!isError && !cardsToDisplay.length ? (
        <View style={styles.empty}>
          <Text>{emptyMessage}</Text>
        </View>
      ) : null}
      {cardsToDisplay.map((item) => {
        const isEditing = editingId === item.id;
        const skillPointLabel = item.skill_point_id
          ? skillPointNameMap.get(item.skill_point_id) ?? 'Unknown skill point'
          : 'Unassigned';

        if (isEditing) {
          return (
            <View
              key={item.id}
              style={[
                styles.card,
                {
                  borderColor: theme.colors.accent,
                  backgroundColor: theme.colors.surfaceAlt,
                },
              ]}
            >
              <Text variant="subtitle">Edit Memory Card</Text>
              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                style={[styles.inlineInput, { borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
                placeholderTextColor={theme.colors.textMuted}
              />
              <TextInput
                value={editBody}
                onChangeText={setEditBody}
                style={[styles.inlineTextArea, { borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
                placeholderTextColor={theme.colors.textMuted}
                multiline
                numberOfLines={4}
              />
              <SkillPointSelector
                skillPoints={skillPoints}
                selectedId={editSkillPointId}
                onSelect={setEditSkillPointId}
                disabled={updating}
              />
              <View style={styles.typeRow}>
                {CARD_TYPES.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setEditType(type)}
                    disabled={updating}
                    style={[
                      styles.chip,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: editType === type ? theme.colors.accent : theme.colors.surface,
                        opacity: updating ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{ color: editType === type ? theme.colors.background : theme.colors.textSecondary }}
                    >
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: theme.colors.border }]}
                  onPress={() => {
                    setEditingId(null);
                    setEditSkillPointId(null);
                  }}
                  disabled={updating || deleting}
                >
                  <Text variant="caption">Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: theme.colors.danger }]}
                  onPress={() => confirmDelete(item.id)}
                  disabled={deleting}
                >
                  <Text variant="caption" style={{ color: theme.colors.background }}>
                    Delete
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: theme.colors.accent }]}
                  onPress={handleSaveEdit}
                  disabled={updating || !editTitle.trim()}
                >
                  <Text variant="caption" style={{ color: theme.colors.background }}>
                    {updating ? 'Saving…' : 'Save'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        }

        return (
          <View
            key={item.id}
            style={[
              styles.card,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <Text variant="subtitle">{item.title}</Text>
            <View style={styles.metaRow}>
              <Text variant="caption">Type: {item.card_type}</Text>
              <Text variant="caption">Skill point: {skillPointLabel}</Text>
            </View>
            <Text variant="body">{item.body}</Text>
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.colors.surfaceAlt }]}
              onPress={() =>
                handleStartEdit(item.id, item.title, item.body, item.card_type, item.skill_point_id ?? null)
              }
            >
              <Text variant="caption">Edit</Text>
            </Pressable>
          </View>
        );
      })}

      <MemoryCardForm
        title={title}
        body={body}
        cardType={cardType}
        skillPoints={skillPoints}
        selectedSkillPointId={skillPointId}
        onSkillPointChange={setSkillPointId}
        onTitleChange={setTitle}
        onBodyChange={setBody}
        onTypeChange={setCardType}
        onSubmit={handleCreate}
        submitting={creating}
      />
    </View>
  );
};

type MemoryCardFormProps = {
  title: string;
  body: string;
  cardType: 'fact' | 'concept' | 'procedure' | 'claim';
  skillPoints: SkillPoint[];
  selectedSkillPointId: string | null;
  onSkillPointChange: (value: string | null) => void;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onTypeChange: (value: 'fact' | 'concept' | 'procedure' | 'claim') => void;
  onSubmit: () => void;
  submitting: boolean;
};

type SkillPointFilterProps = {
  skillPoints: SkillPoint[];
  selectedId: SkillPointFilterValue;
  onSelect: (value: SkillPointFilterValue) => void;
};

type SkillPointSelectorProps = {
  skillPoints: SkillPoint[];
  selectedId: string | null;
  onSelect: (value: string | null) => void;
  disabled?: boolean;
};

const stylesForm = StyleSheet.create({
  container: {
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 120,
  },
  selector: {
    gap: 8,
  },
  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  submit: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submitText: {
    fontWeight: '600',
  },
});

const SkillPointFilter = ({ skillPoints, selectedId, onSelect }: SkillPointFilterProps) => {
  const { theme } = useTheme();

  const buildChipStyle = (active: boolean) => [
    stylesForm.chip,
    {
      borderColor: theme.colors.border,
      backgroundColor: active ? theme.colors.accent : theme.colors.surfaceAlt,
    },
  ];

  const getLabelColor = (active: boolean) =>
    active ? theme.colors.background : theme.colors.textSecondary;

  return (
    <View style={stylesForm.selector}>
      <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
        Filter by skill point
      </Text>
      <View style={stylesForm.selectorRow}>
        <Pressable onPress={() => onSelect(null)} style={buildChipStyle(selectedId === null)}>
          <Text variant="caption" style={{ color: getLabelColor(selectedId === null) }}>
            All cards
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onSelect(UNASSIGNED_FILTER)}
          style={buildChipStyle(selectedId === UNASSIGNED_FILTER)}
        >
          <Text
            variant="caption"
            style={{ color: getLabelColor(selectedId === UNASSIGNED_FILTER) }}
          >
            Unassigned
          </Text>
        </Pressable>
        {skillPoints.map((skill) => {
          const isActive = skill.id === selectedId;
          return (
            <Pressable
              key={skill.id}
              onPress={() => onSelect(skill.id)}
              style={buildChipStyle(isActive)}
            >
              <Text variant="caption" style={{ color: getLabelColor(isActive) }}>
                {skill.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!skillPoints.length ? (
        <Text variant="caption" style={{ color: theme.colors.textMuted }}>
          No skill points yet. New cards will stay unassigned.
        </Text>
      ) : null}
    </View>
  );
};

const SkillPointSelector = ({ skillPoints, selectedId, onSelect, disabled }: SkillPointSelectorProps) => {
  const { theme } = useTheme();

  const buildChipStyle = (active: boolean) => [
    stylesForm.chip,
    {
      borderColor: theme.colors.border,
      backgroundColor: active ? theme.colors.accent : theme.colors.surfaceAlt,
      opacity: disabled ? 0.6 : 1,
    },
  ];

  return (
    <View style={stylesForm.selector}>
      <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
        Skill point link
      </Text>
      <View style={stylesForm.selectorRow}>
        <Pressable
          onPress={() => !disabled && onSelect(null)}
          disabled={disabled}
          style={buildChipStyle(selectedId === null)}
        >
          <Text
            variant="caption"
            style={{ color: selectedId === null ? theme.colors.background : theme.colors.textSecondary }}
          >
            Unassigned
          </Text>
        </Pressable>
        {skillPoints.map((skill) => {
          const isActive = skill.id === selectedId;
          return (
            <Pressable
              key={skill.id}
              onPress={() => !disabled && onSelect(skill.id)}
              disabled={disabled}
              style={buildChipStyle(isActive)}
            >
              <Text
                variant="caption"
                style={{ color: isActive ? theme.colors.background : theme.colors.textSecondary }}
              >
                {skill.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!skillPoints.length ? (
        <Text variant="caption" style={{ color: theme.colors.textMuted }}>
          No skill points yet. Cards will stay unassigned.
        </Text>
      ) : null}
    </View>
  );
};

const MemoryCardForm = ({
  title,
  body,
  cardType,
  skillPoints,
  selectedSkillPointId,
  onSkillPointChange,
  onTitleChange,
  onBodyChange,
  onTypeChange,
  onSubmit,
  submitting,
}: MemoryCardFormProps) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        stylesForm.container,
        { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
      ]}
    >
      <Text variant="subtitle">Add Memory Card</Text>
      <SkillPointSelector
        skillPoints={skillPoints}
        selectedId={selectedSkillPointId}
        onSelect={onSkillPointChange}
        disabled={submitting}
      />
      <TextInput
        value={title}
        placeholder="Title"
        onChangeText={onTitleChange}
        style={[stylesForm.input, { borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
        placeholderTextColor={theme.colors.textMuted}
        editable={!submitting}
      />
      <TextInput
        value={body}
        placeholder="Body"
        onChangeText={onBodyChange}
        style={[stylesForm.textArea, { borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
        placeholderTextColor={theme.colors.textMuted}
        multiline
        numberOfLines={4}
        editable={!submitting}
      />
      <View style={stylesForm.typeRow}>
        {CARD_TYPES.map((type) => (
          <Pressable
            key={type}
            onPress={() => !submitting && onTypeChange(type)}
            disabled={submitting}
            style={[
              stylesForm.chip,
              {
                borderColor: theme.colors.border,
                backgroundColor: cardType === type ? theme.colors.accent : theme.colors.surfaceAlt,
                opacity: submitting ? 0.6 : 1,
              },
            ]}
          >
            <Text
              variant="caption"
              style={{ color: cardType === type ? theme.colors.background : theme.colors.textSecondary }}
            >
              {type}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={onSubmit}
        disabled={submitting || !title.trim()}
        style={[
          stylesForm.submit,
          { backgroundColor: submitting ? theme.colors.textMuted : theme.colors.accent },
        ]}
      >
        <Text
          variant="subtitle"
          style={[stylesForm.submitText, { color: theme.colors.background }]}
        >
          {submitting ? 'Saving…' : 'Add card'}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  empty: {
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  inlineInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineTextArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 120,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
