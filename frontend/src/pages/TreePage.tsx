import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cardsApi,
  directionsApi,
  intelligenceApi,
  skillPointsApi,
  todayApi,
  treeApi,
  type CardDraft,
  type CardType,
  type Direction,
  type MemoryCard,
  type SkillLevel,
  type SkillPoint,
  type TreeDirectionBranch,
  type WorkoutCard,
} from '@api';
import { TreeWorkspace } from '@features/tree/TreeWorkspace';
import { initialCardForm, initialDirectionForm, initialSkillForm } from '@features/tree/constants';

const computeOverviewMetrics = (branches: TreeDirectionBranch[] | undefined) => {
  if (!branches) {
    return { directionCount: 0, skillPointCount: 0, cardCount: 0 };
  }

  return branches.reduce(
    (acc, branch) => {
      acc.directionCount += 1;
      acc.skillPointCount += branch.metrics.skill_point_count;
      acc.cardCount += branch.metrics.card_count + branch.orphan_cards.length;
      return acc;
    },
    { directionCount: 0, skillPointCount: 0, cardCount: 0 },
  );
};

export const TreePage = () => {
  const queryClient = useQueryClient();
  const [selectedDirectionId, setSelectedDirectionId] = useState<string | null>(null);
  const [selectedSkillPointId, setSelectedSkillPointId] = useState<'all' | 'orphan' | string>('all');

  const [createDirectionOpen, setCreateDirectionOpen] = useState(false);
  const [directionForm, setDirectionForm] = useState(initialDirectionForm);
  const [directionEditor, setDirectionEditor] = useState(initialDirectionForm);
  const [directionEditorDirty, setDirectionEditorDirty] = useState(false);

  const [skillForm, setSkillForm] = useState(initialSkillForm);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [skillDraft, setSkillDraft] = useState(initialSkillForm);

  const [cardForm, setCardForm] = useState(initialCardForm);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardDraft, setCardDraft] = useState(initialCardForm);

  const [aiNotes, setAiNotes] = useState('');
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [cardDrafts, setCardDrafts] = useState<Array<CardDraft & { id: string; selected: boolean }>>([]);

  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewCards, setReviewCards] = useState<WorkoutCard[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);

  const directionsQuery = useQuery({
    queryKey: ['directions'],
    queryFn: directionsApi.getAll,
  });

  useEffect(() => {
    const directions = directionsQuery.data;
    if (!directions || directions.length === 0) {
      setSelectedDirectionId(null);
      return;
    }

    if (!selectedDirectionId) {
      setSelectedDirectionId(directions[0]!.id);
      setSelectedSkillPointId('all');
    } else if (!directions.some((direction) => direction.id === selectedDirectionId)) {
      setSelectedDirectionId(directions[0]!.id);
      setSelectedSkillPointId('all');
    }
  }, [directionsQuery.data, selectedDirectionId]);

  const treeSnapshotQuery = useQuery({
    queryKey: ['tree', 'snapshot'],
    queryFn: treeApi.getSnapshot,
    staleTime: 1000 * 30,
  });

  const overviewMetrics = useMemo(
    () => computeOverviewMetrics(treeSnapshotQuery.data?.directions),
    [treeSnapshotQuery.data?.directions],
  );

  const skillPointsQuery = useQuery({
    queryKey: ['skillPoints', selectedDirectionId],
    queryFn: () => skillPointsApi.listByDirection(selectedDirectionId!),
    enabled: Boolean(selectedDirectionId),
  });

  const cardsQuery = useQuery({
    queryKey: ['cards', selectedDirectionId],
    queryFn: () => cardsApi.listByDirection(selectedDirectionId!),
    enabled: Boolean(selectedDirectionId),
  });

  const createDirectionMutation = useMutation({
    mutationFn: directionsApi.create,
    onMutate: () => {
      setCreateDirectionOpen(true);
    },
    onSuccess: (direction) => {
      queryClient.invalidateQueries({ queryKey: ['directions'] });
      queryClient.invalidateQueries({ queryKey: ['tree', 'snapshot'] });
      setDirectionForm(initialDirectionForm);
      setCreateDirectionOpen(false);
      setSelectedDirectionId(direction.id);
      setSelectedSkillPointId('all');
    },
  });

  const updateDirectionMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Direction> }) =>
      directionsApi.update(id, {
        name: updates.name,
        stage: updates.stage,
        quarterly_goal: updates.quarterly_goal,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directions'] });
      queryClient.invalidateQueries({ queryKey: ['tree', 'snapshot'] });
      setDirectionEditorDirty(false);
    },
  });

  const deleteDirectionMutation = useMutation({
    mutationFn: (id: string) => directionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directions'] });
      queryClient.invalidateQueries({ queryKey: ['tree', 'snapshot'] });
      setSelectedDirectionId(null);
      setSelectedSkillPointId('all');
    },
  });

  const createSkillMutation = useMutation({
    mutationFn: (payload: { directionId: string; data: { name: string; summary: string | null; level: SkillLevel } }) =>
      skillPointsApi.create(payload.directionId, {
        direction_id: payload.directionId,
        name: payload.data.name,
        summary: payload.data.summary,
        level: payload.data.level,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skillPoints', selectedDirectionId] });
      queryClient.invalidateQueries({ queryKey: ['tree', 'snapshot'] });
      setSkillForm(initialSkillForm);
    },
  });

  const updateSkillMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; summary: string | null; level: SkillLevel } }) =>
      skillPointsApi.update(id, {
        name: data.name,
        summary: data.summary,
        level: data.level,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skillPoints', selectedDirectionId] });
      queryClient.invalidateQueries({ queryKey: ['tree', 'snapshot'] });
      setEditingSkillId(null);
    },
  });

  const deleteSkillMutation = useMutation({
    mutationFn: (skillId: string) => skillPointsApi.delete(skillId),
    onSuccess: (_, skillId) => {
      queryClient.invalidateQueries({ queryKey: ['skillPoints', selectedDirectionId] });
      queryClient.invalidateQueries({ queryKey: ['tree', 'snapshot'] });
      if (selectedSkillPointId === skillId) {
        setSelectedSkillPointId('all');
      }
    },
  });

  const createCardMutation = useMutation({
    mutationFn: (payload: {
      direction_id: string;
      title: string;
      body: string;
      card_type: CardType;
      skill_point_id: string | null;
    }) =>
      cardsApi.create({
        direction_id: payload.direction_id,
        title: payload.title,
        body: payload.body,
        card_type: payload.card_type,
        skill_point_id: payload.skill_point_id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', selectedDirectionId] });
      queryClient.invalidateQueries({ queryKey: ['tree', 'snapshot'] });
      setCardForm(initialCardForm);
    },
  });

  const updateCardMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { title: string; body: string; card_type: CardType; skill_point_id: string | null } }) =>
      cardsApi.update(id, {
        title: updates.title,
        body: updates.body,
        card_type: updates.card_type,
        skill_point_id: updates.skill_point_id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', selectedDirectionId] });
      queryClient.invalidateQueries({ queryKey: ['tree', 'snapshot'] });
      setEditingCardId(null);
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: (cardId: string) => cardsApi.delete(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', selectedDirectionId] });
      queryClient.invalidateQueries({ queryKey: ['tree', 'snapshot'] });
    },
  });

  const generateDraftsMutation = useMutation({
    mutationFn: ({ directionId, notes }: { directionId: string; notes: string }) =>
      intelligenceApi.generateCards(directionId, notes),
    onSuccess: (response) => {
      const trimmedMessage = response.message?.trim();
      setGenerationError(null);
      setGenerationStatus(
        trimmedMessage && trimmedMessage.length > 0
          ? trimmedMessage
          : 'Generated draft cards based on your notes.',
      );
      setCardDrafts(
        (response.card_drafts ?? [])
          .filter((draft) => {
            const title = draft.title?.trim() ?? '';
            const body = draft.body?.trim() ?? '';
            return title.length > 0 || body.length > 0;
          })
          .map((draft, index) => ({
            ...draft,
            id: `draft-${Date.now()}-${index}`,
            selected: true,
          })),
      );
    },
    onError: () => {
      setGenerationStatus(null);
      setGenerationError('无法生成学习卡片，请稍后重试。');
    },
  });

  const importDraftsMutation = useMutation({
    mutationFn: async (drafts: CardDraft[]) => {
      if (!selectedDirectionId) return;
      await Promise.all(
        drafts.map((draft) =>
          cardsApi.create({
            direction_id: selectedDirectionId,
            title: draft.title,
            body: draft.body,
            card_type: draft.card_type ?? 'concept',
          }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', selectedDirectionId] });
      queryClient.invalidateQueries({ queryKey: ['tree', 'snapshot'] });
      setCardDrafts([]);
      setGenerationError(null);
      setGenerationStatus('Drafts imported into your direction workspace.');
    },
  });

  const reviewMutation = useMutation({
    mutationFn: todayApi.submitReview,
    onSuccess: () => {
      setReviewIndex((prev) => prev + 1);
    },
  });

  const directionForEditor = directionsQuery.data?.find((direction) => direction.id === selectedDirectionId) ?? null;

  useEffect(() => {
    if (!directionForEditor) return;
    setDirectionEditor({
      name: directionForEditor.name,
      stage: directionForEditor.stage,
      quarterly_goal: directionForEditor.quarterly_goal ?? '',
    });
    setDirectionEditorDirty(false);
  }, [directionForEditor]);

  const handleSelectDirection = (directionId: string) => {
    setSelectedDirectionId(directionId);
    setSelectedSkillPointId('all');
    setEditingCardId(null);
    setEditingSkillId(null);
  };

  const handleDirectionSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!directionForm.name.trim()) return;

    await createDirectionMutation.mutateAsync({
      name: directionForm.name.trim(),
      stage: directionForm.stage,
      quarterly_goal: directionForm.quarterly_goal?.trim() || null,
    });
  };

  const handleDirectionSave = async () => {
    if (!selectedDirectionId || !directionEditorDirty) return;
    await updateDirectionMutation.mutateAsync({
      id: selectedDirectionId,
      updates: {
        name: directionEditor.name.trim(),
        stage: directionEditor.stage,
        quarterly_goal: directionEditor.quarterly_goal.trim() || null,
      },
    });
  };

  const handleSkillSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDirectionId || !skillForm.name.trim()) return;

    await createSkillMutation.mutateAsync({
      directionId: selectedDirectionId,
      data: {
        name: skillForm.name.trim(),
        summary: skillForm.summary.trim() ? skillForm.summary.trim() : null,
        level: skillForm.level,
      },
    });
  };

  const handleSkillEdit = (skill: SkillPoint) => {
    setEditingSkillId(skill.id);
    setSkillDraft({
      name: skill.name,
      summary: skill.summary ?? '',
      level: skill.level,
    });
  };

  const handleSkillSave = async () => {
    if (!editingSkillId) return;
    await updateSkillMutation.mutateAsync({
      id: editingSkillId,
      data: {
        name: skillDraft.name.trim(),
        summary: skillDraft.summary.trim() ? skillDraft.summary.trim() : null,
        level: skillDraft.level,
      },
    });
  };

  const handleCardSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDirectionId || !cardForm.title.trim() || !cardForm.body.trim()) return;

    await createCardMutation.mutateAsync({
      direction_id: selectedDirectionId,
      title: cardForm.title.trim(),
      body: cardForm.body.trim(),
      card_type: cardForm.card_type,
      skill_point_id: cardForm.skill_point_id && cardForm.skill_point_id !== 'none' ? cardForm.skill_point_id : null,
    });
  };

  const handleCardEdit = (card: MemoryCard) => {
    setEditingCardId(card.id);
    setCardDraft({
      title: card.title,
      body: card.body,
      card_type: card.card_type,
      skill_point_id: card.skill_point_id ?? 'none',
    });
  };

  const handleCardSave = async () => {
    if (!editingCardId) return;
    if (!cardDraft.title.trim() && !cardDraft.body.trim()) return;
    await updateCardMutation.mutateAsync({
      id: editingCardId,
      updates: {
        title: cardDraft.title.trim(),
        body: cardDraft.body.trim(),
        card_type: cardDraft.card_type,
        skill_point_id: cardDraft.skill_point_id === 'none' ? null : cardDraft.skill_point_id,
      },
    });
  };

  const handleGenerateDrafts = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDirectionId) return;
    const trimmed = aiNotes.trim();
    if (!trimmed) return;

    setGenerationStatus(null);
    setGenerationError(null);

    await generateDraftsMutation.mutateAsync({ directionId: selectedDirectionId, notes: trimmed });
  };

  const handleImportDrafts = async () => {
    const selected = cardDrafts.filter((draft) => draft.selected);
    if (selected.length === 0 || !selectedDirectionId) return;
    await importDraftsMutation.mutateAsync(selected);
  };

  const startReview = async () => {
    const result = await todayApi.getWorkout();
    setReviewCards(result.cards);
    setReviewIndex(0);
    setIsReviewing(true);
  };

  const currentReviewCard = reviewCards[reviewIndex];
  const remainingReviews = Math.max(reviewCards.length - reviewIndex, 0);

  const filteredCards = useMemo(() => {
    if (!cardsQuery.data) return [] as MemoryCard[];
    const contentfulCards = cardsQuery.data.filter((card) => {
      const title = card.title?.trim() ?? '';
      const body = card.body?.trim() ?? '';
      return title.length > 0 || body.length > 0;
    });

    if (selectedSkillPointId === 'all') {
      return contentfulCards;
    }
    if (selectedSkillPointId === 'orphan') {
      return contentfulCards.filter((card) => !card.skill_point_id);
    }
    return contentfulCards.filter((card) => card.skill_point_id === selectedSkillPointId);
  }, [cardsQuery.data, selectedSkillPointId]);

  return (
    <TreeWorkspace
      overviewMetrics={overviewMetrics}
      snapshotUpdatedAt={treeSnapshotQuery.data?.generated_at ?? null}
      onRefreshSnapshot={() => treeSnapshotQuery.refetch()}
      isRefreshingSnapshot={treeSnapshotQuery.isFetching}
      directions={directionsQuery.data}
      isLoadingDirections={directionsQuery.isLoading}
      selectedDirectionId={selectedDirectionId}
      onSelectDirection={handleSelectDirection}
      directionForm={directionForm}
      onDirectionFormChange={(updates) => setDirectionForm((prev) => ({ ...prev, ...updates }))}
      createDirectionOpen={createDirectionOpen}
      onToggleCreateDirection={(open) => {
        setCreateDirectionOpen(open);
        if (!open) {
          setDirectionForm(initialDirectionForm);
        }
      }}
      onSubmitDirection={handleDirectionSubmit}
      isCreatingDirection={createDirectionMutation.isPending}
      directionEditorState={directionEditor}
      onDirectionEditorChange={(updates) => {
        setDirectionEditor((prev) => ({ ...prev, ...updates }));
        setDirectionEditorDirty(true);
      }}
      hasDirectionChanges={directionEditorDirty}
      onSaveDirection={handleDirectionSave}
      onDeleteDirection={() => {
        if (!directionForEditor) return;
        if (window.confirm('Delete this direction and all related items?')) {
          deleteDirectionMutation.mutate(directionForEditor.id);
        }
      }}
      isSavingDirection={updateDirectionMutation.isPending}
      isDeletingDirection={deleteDirectionMutation.isPending}
      skillPoints={skillPointsQuery.data}
      areSkillPointsLoading={skillPointsQuery.isLoading}
      selectedSkillPointId={selectedSkillPointId}
      onSelectedSkillPointChange={(value) => setSelectedSkillPointId(value)}
      editingSkillId={editingSkillId}
      onEditSkill={handleSkillEdit}
      onCancelSkillEdit={() => {
        setEditingSkillId(null);
        setSkillDraft(initialSkillForm);
      }}
      skillDraft={skillDraft}
      onSkillDraftChange={(updates) => setSkillDraft((prev) => ({ ...prev, ...updates }))}
      onSaveSkill={handleSkillSave}
      onDeleteSkill={(skillId) => {
        if (window.confirm('Delete this skill point?')) {
          deleteSkillMutation.mutate(skillId);
        }
      }}
      isSavingSkill={updateSkillMutation.isPending}
      isDeletingSkill={deleteSkillMutation.isPending}
      skillForm={skillForm}
      onSkillFormChange={(updates) => setSkillForm((prev) => ({ ...prev, ...updates }))}
      onSubmitSkill={handleSkillSubmit}
      isCreatingSkill={createSkillMutation.isPending}
      cards={filteredCards}
      areCardsLoading={cardsQuery.isLoading}
      editingCardId={editingCardId}
      onEditCard={handleCardEdit}
      onCancelCardEdit={() => {
        setEditingCardId(null);
        setCardDraft(initialCardForm);
      }}
      cardDraft={cardDraft}
      onCardDraftChange={(updates) => setCardDraft((prev) => ({ ...prev, ...updates }))}
      onSaveCard={handleCardSave}
      onDeleteCard={(cardId) => {
        if (window.confirm('Delete this card?')) {
          deleteCardMutation.mutate(cardId);
        }
      }}
      isSavingCard={updateCardMutation.isPending}
      isDeletingCard={deleteCardMutation.isPending}
      cardForm={cardForm}
      onCardFormChange={(updates) => setCardForm((prev) => ({ ...prev, ...updates }))}
      onSubmitCard={handleCardSubmit}
      isCreatingCard={createCardMutation.isPending}
      aiNotes={aiNotes}
      onAiNotesChange={setAiNotes}
      onGenerateDrafts={handleGenerateDrafts}
      isGeneratingDrafts={generateDraftsMutation.isPending}
      generationStatus={generationStatus}
      generationError={generationError}
      cardDrafts={cardDrafts}
      onToggleDraftSelection={(id, selected) =>
        setCardDrafts((prev) => prev.map((draft) => (draft.id === id ? { ...draft, selected } : draft)))
      }
      onImportDrafts={handleImportDrafts}
      isImportingDrafts={importDraftsMutation.isPending}
      isReviewing={isReviewing}
      currentReviewCard={currentReviewCard}
      remainingReviews={remainingReviews}
      onDrawReviewCards={startReview}
      onSubmitReviewQuality={async (quality) => {
        if (!currentReviewCard) return;
        await reviewMutation.mutateAsync({
          card_id: currentReviewCard.id,
          quality,
        });
        if (reviewIndex + 1 >= reviewCards.length) {
          setIsReviewing(false);
          setReviewCards([]);
          setReviewIndex(0);
        }
      }}
    />
  );
};
