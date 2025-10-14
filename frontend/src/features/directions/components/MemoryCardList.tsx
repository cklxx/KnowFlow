import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import {
  useCreateMemoryCard,
  useDeleteMemoryCard,
  useMemoryCards,
  useUpdateMemoryCard,
} from '../hooks';
import { Text } from '@/ui/components/Text';
import { useTheme, useToast } from '@/providers';

const CARD_TYPES: Array<'fact' | 'concept' | 'procedure' | 'claim'> = [
  'fact',
  'concept',
  'procedure',
  'claim',
];

type Props = {
  directionId?: string;
};

export const MemoryCardList = ({ directionId }: Props) => {
  const { theme } = useTheme();
  const { data, isLoading, isError } = useMemoryCards(directionId ?? '');
  const { mutateAsync: createMemoryCard, isPending: creating } = useCreateMemoryCard(directionId);
  const { mutateAsync: updateMemoryCard, isPending: updating } = useUpdateMemoryCard(directionId);
  const { mutateAsync: deleteMemoryCard, isPending: deleting } = useDeleteMemoryCard(directionId);
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [cardType, setCardType] = useState<'fact' | 'concept' | 'procedure' | 'claim'>('fact');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editType, setEditType] = useState<'fact' | 'concept' | 'procedure' | 'claim'>('fact');

  if (!directionId) {
    return <Text variant="caption">Pick a direction to review cards.</Text>;
  }

  if (isLoading) {
    return <ActivityIndicator />;
  }

  const handleCreate = async () => {
    if (!directionId || !title.trim()) return;
    try {
      await createMemoryCard({ title: title.trim(), body, card_type: cardType });
      showToast({ message: 'Memory card created', variant: 'success' });
      setTitle('');
      setBody('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create memory card';
      showToast({ message, variant: 'error' });
    }
  };

  const handleStartEdit = (cardId: string, cardTitle: string, cardBody: string, type: 'fact' | 'concept' | 'procedure' | 'claim') => {
    setEditingId(cardId);
    setEditTitle(cardTitle);
    setEditBody(cardBody);
    setEditType(type);
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
        },
      });
      showToast({ message: 'Memory card updated', variant: 'success' });
      setEditingId(null);
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

  if (isError || !data?.length) {
    return (
      <View style={styles.empty}>
        <Text>No cards yet. Import sources or create manually.</Text>
        <MemoryCardForm
          title={title}
          body={body}
          cardType={cardType}
          onTitleChange={setTitle}
          onBodyChange={setBody}
          onTypeChange={setCardType}
          onSubmit={handleCreate}
          submitting={creating}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListFooterComponent={() => (
        <MemoryCardForm
          title={title}
          body={body}
          cardType={cardType}
          onTitleChange={setTitle}
          onBodyChange={setBody}
          onTypeChange={setCardType}
          onSubmit={handleCreate}
          submitting={creating}
        />
      )}
      renderItem={({ item }) => {
        const isEditing = editingId === item.id;

        if (isEditing) {
          return (
            <View
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
              <View style={styles.typeRow}>
                {CARD_TYPES.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setEditType(type)}
                    style={[
                      styles.chip,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: editType === type ? theme.colors.accent : theme.colors.surface,
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
            style={[
              styles.card,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <Text variant="subtitle">{item.title}</Text>
            <Text variant="caption">Type: {item.card_type}</Text>
            <Text variant="body">{item.body}</Text>
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.colors.surfaceAlt }]}
              onPress={() => handleStartEdit(item.id, item.title, item.body, item.card_type)}
            >
              <Text variant="caption">Edit</Text>
            </Pressable>
          </View>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  empty: {
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  separator: {
    height: 12,
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

type MemoryCardFormProps = {
  title: string;
  body: string;
  cardType: 'fact' | 'concept' | 'procedure' | 'claim';
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onTypeChange: (value: 'fact' | 'concept' | 'procedure' | 'claim') => void;
  onSubmit: () => void;
  submitting: boolean;
};

const MemoryCardForm = ({ title, body, cardType, onTitleChange, onBodyChange, onTypeChange, onSubmit, submitting }: MemoryCardFormProps) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        stylesForm.container,
        { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
      ]}
    >
      <Text variant="subtitle">Add Memory Card</Text>
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
            onPress={() => onTypeChange(type)}
            style={[
              stylesForm.chip,
              {
                borderColor: theme.colors.border,
                backgroundColor: cardType === type ? theme.colors.accent : theme.colors.surfaceAlt,
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
        <Text variant="subtitle" style={[stylesForm.submitText, { color: theme.colors.background }]}>
          {submitting ? 'Saving…' : 'Add card'}
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
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 120,
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
  submit: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submitText: {
    fontWeight: '600',
  },
});
