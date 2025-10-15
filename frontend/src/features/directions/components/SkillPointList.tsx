import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  useCreateSkillPoint,
  useDeleteSkillPoint,
  useSkillPoints,
  useUpdateSkillPoint,
} from '../hooks';
import { Text } from '@/ui/components/Text';
import { useTheme, useToast } from '@/providers';
import type { SkillLevel } from '@api';

const LEVELS: SkillLevel[] = ['unknown', 'emerging', 'working', 'fluent'];

type Props = {
  directionId?: string;
};

export const SkillPointList = ({ directionId }: Props) => {
  const { theme } = useTheme();
  const { data, isLoading, isError } = useSkillPoints(directionId ?? '');
  const { mutateAsync: createSkillPoint, isPending: creating } = useCreateSkillPoint(directionId);
  const { mutateAsync: updateSkillPoint, isPending: updating } = useUpdateSkillPoint(directionId);
  const { mutateAsync: deleteSkillPoint, isPending: deleting } = useDeleteSkillPoint(directionId);
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editLevel, setEditLevel] = useState<SkillLevel>('unknown');

  if (!directionId) {
    return <Text variant="caption">Select a direction to view skill points.</Text>;
  }

  if (isLoading) {
    return <ActivityIndicator />;
  }

  const handleCreate = async () => {
    if (!directionId || !name.trim()) return;
    try {
      await createSkillPoint({ name: name.trim(), summary: summary || null });
      showToast({ message: 'Skill point added', variant: 'success' });
      setName('');
      setSummary('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add skill point';
      showToast({ message, variant: 'error' });
    }
  };

  const handleStartEdit = (pointId: string, pointName: string, pointSummary: string | null, pointLevel: SkillLevel) => {
    setEditingId(pointId);
    setEditName(pointName);
    setEditSummary(pointSummary ?? '');
    setEditLevel(pointLevel);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateSkillPoint({
        id: editingId,
        payload: {
          name: editName.trim(),
          summary: editSummary || null,
          level: editLevel,
        },
      });
      showToast({ message: 'Skill point updated', variant: 'success' });
      setEditingId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update skill point';
      showToast({ message, variant: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSkillPoint(id);
      showToast({ message: 'Skill point removed', variant: 'success' });
      if (editingId === id) {
        setEditingId(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete skill point';
      showToast({ message, variant: 'error' });
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Delete skill point', 'Its cards will be reassigned or removed. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDelete(id),
      },
    ]);
  };

  if (isError || !data?.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text>No skill points captured yet.</Text>
        <SkillPointForm
          name={name}
          summary={summary}
          onNameChange={setName}
          onSummaryChange={setSummary}
          onSubmit={handleCreate}
          submitting={creating}
        />
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {data.map((item) => {
        const isEditing = editingId === item.id;

        if (isEditing) {
          return (
            <View
              key={item.id}
              style={[
                styles.item,
                {
                  borderColor: theme.colors.accent,
                  backgroundColor: theme.colors.surfaceAlt,
                },
              ]}
            >
              <Text variant="subtitle">Edit Skill Point</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                style={[styles.inlineInput, { borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
                placeholderTextColor={theme.colors.textMuted}
              />
              <TextInput
                value={editSummary}
                onChangeText={setEditSummary}
                placeholder="Summary"
                style={[styles.inlineInput, { borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
                placeholderTextColor={theme.colors.textMuted}
              />
              <View style={styles.chipRow}>
                {LEVELS.map((level) => (
                  <Pressable
                    key={level}
                    onPress={() => setEditLevel(level)}
                    style={[
                      styles.chip,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: editLevel === level ? theme.colors.accent : theme.colors.surface,
                      },
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{ color: editLevel === level ? theme.colors.background : theme.colors.textSecondary }}
                    >
                      {level}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: theme.colors.border }]}
                  onPress={() => setEditingId(null)}
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
                  disabled={updating || !editName.trim()}
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
              styles.item,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <Text variant="subtitle">{item.name}</Text>
            {item.summary ? <Text variant="caption">{item.summary}</Text> : null}
            <Text variant="caption">Level: {item.level}</Text>
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.colors.surfaceAlt }]}
              onPress={() => handleStartEdit(item.id, item.name, item.summary, item.level)}
            >
              <Text variant="caption">Edit</Text>
            </Pressable>
          </View>
        );
      })}

      <SkillPointForm
        name={name}
        summary={summary}
        onNameChange={setName}
        onSummaryChange={setSummary}
        onSubmit={handleCreate}
        submitting={creating}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  emptyContainer: {
    gap: 16,
  },
  item: {
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
  chipRow: {
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

type SkillPointFormProps = {
  name: string;
  summary: string;
  onNameChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
};

const SkillPointForm = ({ name, summary, onNameChange, onSummaryChange, onSubmit, submitting }: SkillPointFormProps) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        stylesForm.container,
        { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
      ]}
    >
      <Text variant="subtitle">Add Skill Point</Text>
      <TextInput
        value={name}
        placeholder="Name"
        onChangeText={onNameChange}
        style={[stylesForm.input, { borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
        placeholderTextColor={theme.colors.textMuted}
        editable={!submitting}
      />
      <TextInput
        value={summary}
        placeholder="Summary (optional)"
        onChangeText={onSummaryChange}
        style={[stylesForm.input, { borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
        placeholderTextColor={theme.colors.textMuted}
        editable={!submitting}
      />
      <Pressable
        onPress={onSubmit}
        disabled={submitting || !name.trim()}
        style={[
          stylesForm.submit,
          { backgroundColor: submitting ? theme.colors.textMuted : theme.colors.accent },
        ]}
      >
        <Text variant="subtitle" style={[stylesForm.submitText, { color: theme.colors.background }]}>
          {submitting ? 'Saving…' : 'Add skill point'}
        </Text>
      </Pressable>
    </View>
  );
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
  submit: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submitText: {
    fontWeight: '600',
  },
});
