import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTheme, useToast } from '@/providers';
import {
  useCreateDirection,
  useDeleteDirection,
  useDirections,
  useUpdateDirection,
} from '../hooks';
import { Text } from '@/ui/components/Text';
import type { DirectionStage } from '@api';

const STAGES: DirectionStage[] = ['explore', 'shape', 'attack', 'stabilize'];

type Props = {
  onSelect: (directionId: string | undefined) => void;
  selectedId?: string;
};

export const DirectionList = ({ onSelect, selectedId }: Props) => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { data, isLoading, isError } = useDirections();
  const { mutateAsync: createDirection, isPending: creating } = useCreateDirection();
  const { mutateAsync: updateDirection, isPending: updating } = useUpdateDirection();
  const { mutateAsync: deleteDirection, isPending: deleting } = useDeleteDirection();

  const [name, setName] = useState('');
  const [stage, setStage] = useState<DirectionStage>('explore');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editStage, setEditStage] = useState<DirectionStage>('explore');
  const [quarterlyGoal, setQuarterlyGoal] = useState('');
  const [editGoal, setEditGoal] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createDirection({
        name: name.trim(),
        stage,
        quarterly_goal: quarterlyGoal.trim() ? quarterlyGoal.trim() : null,
      });
      showToast({ message: 'Direction created', variant: 'success' });
      setName('');
      setQuarterlyGoal('');
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Failed to create direction',
        variant: 'error',
      });
    }
  };

  const handleStartEdit = (
    directionId: string,
    directionName: string,
    directionStage: DirectionStage,
    goal: string | null,
  ) => {
    setEditingId(directionId);
    setEditName(directionName);
    setEditStage(directionStage);
    setEditGoal(goal ?? '');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateDirection({
        id: editingId,
        payload: {
          name: editName.trim(),
          stage: editStage,
          quarterly_goal: editGoal.trim() ? editGoal.trim() : null,
        },
      });
      showToast({ message: 'Direction updated', variant: 'success' });
      setEditingId(null);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Failed to update direction',
        variant: 'error',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDirection(id);
      showToast({ message: 'Direction deleted', variant: 'success' });
      if (editingId === id) {
        setEditingId(null);
      }
      if (selectedId === id) {
        onSelect(undefined);
      }
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Failed to delete direction',
        variant: 'error',
      });
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Delete direction', 'This will remove its skill points and cards. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDelete(id),
      },
    ]);
  };

  if (isLoading) {
    return <ActivityIndicator />;
  }

  if (isError || !data?.length) {
    return (
      <View style={styles.emptyState}>
        <Text>No directions yet. Create one to get started.</Text>
        <DirectionForm
          name={name}
          onNameChange={setName}
          stage={stage}
          onStageChange={setStage}
          quarterlyGoal={quarterlyGoal}
          onQuarterlyGoalChange={setQuarterlyGoal}
          onSubmit={handleCreate}
          submitting={creating}
        />
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {data.map((item) => {
        const isSelected = item.id === selectedId;
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
              <Text variant="subtitle">Edit direction</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                style={[styles.inlineInput, { borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
                placeholderTextColor={theme.colors.textMuted}
              />
              <View style={styles.stageRow}>
                {STAGES.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setEditStage(option)}
                    style={[
                      styles.stageChip,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: editStage === option ? theme.colors.accent : theme.colors.surface,
                      },
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{ color: editStage === option ? theme.colors.background : theme.colors.textSecondary }}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={editGoal}
                onChangeText={setEditGoal}
                placeholder="Quarterly goal"
                style={[styles.inlineInput, { borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
                placeholderTextColor={theme.colors.textMuted}
              />
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
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={[
              styles.item,
              {
                borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                backgroundColor: isSelected ? theme.colors.surfaceAlt : theme.colors.surface,
              },
            ]}
          >
            <Text variant="subtitle">{item.name}</Text>
            <Text variant="caption">Stage: {item.stage}</Text>
            {item.quarterly_goal ? (
              <Text variant="caption">Goal: {item.quarterly_goal}</Text>
            ) : null}
            <Pressable
              style={[styles.editButton, { backgroundColor: theme.colors.surfaceAlt }]}
              onPress={() => handleStartEdit(item.id, item.name, item.stage, item.quarterly_goal)}
            >
              <Text variant="caption">Edit</Text>
            </Pressable>
            <Pressable
              style={[styles.editButton, { backgroundColor: theme.colors.danger }]}
              onPress={() => confirmDelete(item.id)}
            >
              <Text variant="caption" style={{ color: theme.colors.background }}>
                Delete
              </Text>
            </Pressable>
          </Pressable>
        );
      })}

      <DirectionForm
        name={name}
        onNameChange={setName}
        stage={stage}
        onStageChange={setStage}
        quarterlyGoal={quarterlyGoal}
        onQuarterlyGoalChange={setQuarterlyGoal}
        onSubmit={handleCreate}
        submitting={creating}
      />
    </View>
  );
};

type DirectionFormProps = {
  name: string;
  onNameChange: (value: string) => void;
  stage: DirectionStage;
  onStageChange: (value: DirectionStage) => void;
  quarterlyGoal: string;
  onQuarterlyGoalChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
};

const DirectionForm = ({
  name,
  onNameChange,
  stage,
  onStageChange,
  quarterlyGoal,
  onQuarterlyGoalChange,
  onSubmit,
  submitting,
}: DirectionFormProps) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.formContainer,
        { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
      ]}
    >
      <Text variant="subtitle">New Direction</Text>
      <TextInput
        value={name}
        placeholder="Direction name"
        onChangeText={onNameChange}
        style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
        placeholderTextColor={theme.colors.textMuted}
        editable={!submitting}
      />
      <View style={styles.stageRow}>
        {STAGES.map((option) => (
          <Pressable
            key={option}
            onPress={() => onStageChange(option)}
            style={[
              styles.stageChip,
              {
                backgroundColor:
                  stage === option ? theme.colors.accent : theme.colors.surfaceAlt,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              variant="caption"
              style={{ color: stage === option ? theme.colors.background : theme.colors.textSecondary }}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={quarterlyGoal}
        placeholder="Quarterly goal (optional)"
        onChangeText={onQuarterlyGoalChange}
        style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
        placeholderTextColor={theme.colors.textMuted}
        editable={!submitting}
      />
      <Pressable
        onPress={onSubmit}
        disabled={submitting || !name.trim()}
        style={[
          styles.submit,
          {
            backgroundColor: submitting ? theme.colors.textMuted : theme.colors.accent,
          },
        ]}
      >
        <Text variant="subtitle" style={[styles.submitText, { color: theme.colors.background }]}>
          {submitting ? 'Creating…' : 'Create direction'}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  item: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  formContainer: {
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
  inlineInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stageChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  submit: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submitText: {
    fontWeight: '600',
  },
  emptyState: {
    gap: 16,
  },
  editButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
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
