import type { CardDraft, Direction, MemoryCard, SkillPoint, WorkoutCard } from '@api';
import { DirectionSidebar } from './components/DirectionSidebar';
import { DirectionDetailsPanel } from './components/DirectionDetailsPanel';
import { SkillPointsPanel } from './components/SkillPointsPanel';
import { CardsPanel } from './components/CardsPanel';
import { AiDraftStudio } from './components/AiDraftStudio';
import { ReviewPanel } from './components/ReviewPanel';
import { initialCardForm, initialDirectionForm, initialSkillForm } from './constants';

interface OverviewMetrics {
  directionCount: number;
  skillPointCount: number;
  cardCount: number;
}

interface TreeWorkspaceProps {
  overviewMetrics: OverviewMetrics;
  snapshotUpdatedAt: string | null;
  onRefreshSnapshot: () => void;
  isRefreshingSnapshot: boolean;
  directions: Direction[] | undefined;
  isLoadingDirections: boolean;
  selectedDirectionId: string | null;
  onSelectDirection: (directionId: string) => void;
  directionForm: typeof initialDirectionForm;
  onDirectionFormChange: (updates: Partial<typeof initialDirectionForm>) => void;
  createDirectionOpen: boolean;
  onToggleCreateDirection: (open: boolean) => void;
  onSubmitDirection: (event: React.FormEvent<HTMLFormElement>) => void;
  isCreatingDirection: boolean;
  directionEditorState: typeof initialDirectionForm;
  onDirectionEditorChange: (updates: Partial<typeof initialDirectionForm>) => void;
  hasDirectionChanges: boolean;
  onSaveDirection: () => void;
  onDeleteDirection: () => void;
  isSavingDirection: boolean;
  isDeletingDirection: boolean;
  skillPoints: SkillPoint[] | undefined;
  areSkillPointsLoading: boolean;
  selectedSkillPointId: 'all' | 'orphan' | string;
  onSelectedSkillPointChange: (value: 'all' | 'orphan' | string) => void;
  editingSkillId: string | null;
  onEditSkill: (skill: SkillPoint) => void;
  onCancelSkillEdit: () => void;
  skillDraft: typeof initialSkillForm;
  onSkillDraftChange: (updates: Partial<typeof initialSkillForm>) => void;
  onSaveSkill: () => void;
  onDeleteSkill: (skillId: string) => void;
  isSavingSkill: boolean;
  isDeletingSkill: boolean;
  skillForm: typeof initialSkillForm;
  onSkillFormChange: (updates: Partial<typeof initialSkillForm>) => void;
  onSubmitSkill: (event: React.FormEvent<HTMLFormElement>) => void;
  isCreatingSkill: boolean;
  cards: MemoryCard[];
  areCardsLoading: boolean;
  editingCardId: string | null;
  onEditCard: (card: MemoryCard) => void;
  onCancelCardEdit: () => void;
  cardDraft: typeof initialCardForm;
  onCardDraftChange: (updates: Partial<typeof initialCardForm>) => void;
  onSaveCard: () => void;
  onDeleteCard: (cardId: string) => void;
  isSavingCard: boolean;
  isDeletingCard: boolean;
  cardForm: typeof initialCardForm;
  onCardFormChange: (updates: Partial<typeof initialCardForm>) => void;
  onSubmitCard: (event: React.FormEvent<HTMLFormElement>) => void;
  isCreatingCard: boolean;
  aiNotes: string;
  onAiNotesChange: (value: string) => void;
  onGenerateDrafts: (event: React.FormEvent<HTMLFormElement>) => void;
  isGeneratingDrafts: boolean;
  generationStatus: string | null;
  generationError: string | null;
  cardDrafts: Array<CardDraft & { id: string; selected: boolean }>;
  onToggleDraftSelection: (id: string, selected: boolean) => void;
  onImportDrafts: () => void;
  isImportingDrafts: boolean;
  isReviewing: boolean;
  currentReviewCard: WorkoutCard | undefined;
  remainingReviews: number;
  onDrawReviewCards: () => void;
  onSubmitReviewQuality: (quality: number) => Promise<void>;
}

export const TreeWorkspace = ({
  overviewMetrics,
  snapshotUpdatedAt,
  onRefreshSnapshot,
  isRefreshingSnapshot,
  directions,
  isLoadingDirections,
  selectedDirectionId,
  onSelectDirection,
  directionForm,
  onDirectionFormChange,
  createDirectionOpen,
  onToggleCreateDirection,
  onSubmitDirection,
  isCreatingDirection,
  directionEditorState,
  onDirectionEditorChange,
  hasDirectionChanges,
  onSaveDirection,
  onDeleteDirection,
  isSavingDirection,
  isDeletingDirection,
  skillPoints,
  areSkillPointsLoading,
  selectedSkillPointId,
  onSelectedSkillPointChange,
  editingSkillId,
  onEditSkill,
  onCancelSkillEdit,
  skillDraft,
  onSkillDraftChange,
  onSaveSkill,
  onDeleteSkill,
  isSavingSkill,
  isDeletingSkill,
  skillForm,
  onSkillFormChange,
  onSubmitSkill,
  isCreatingSkill,
  cards,
  areCardsLoading,
  editingCardId,
  onEditCard,
  onCancelCardEdit,
  cardDraft,
  onCardDraftChange,
  onSaveCard,
  onDeleteCard,
  isSavingCard,
  isDeletingCard,
  cardForm,
  onCardFormChange,
  onSubmitCard,
  isCreatingCard,
  aiNotes,
  onAiNotesChange,
  onGenerateDrafts,
  isGeneratingDrafts,
  generationStatus,
  generationError,
  cardDrafts,
  onToggleDraftSelection,
  onImportDrafts,
  isImportingDrafts,
  isReviewing,
  currentReviewCard,
  remainingReviews,
  onDrawReviewCards,
  onSubmitReviewQuality,
}: TreeWorkspaceProps) => {
  const hasDirectionSelected = Boolean(selectedDirectionId);

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 py-6 sm:py-8 lg:py-10 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-white">KnowFlow Workspace</h1>
          <p className="text-secondary-600 dark:text-secondary-400 max-w-3xl">
            Maintain your learning directions, skill points, and memory cards in a single flow. Use the AI studio to generate
            draft cards, then validate your understanding with quick reviews.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-6">
            <DirectionSidebar
              overviewMetrics={overviewMetrics}
              snapshotUpdatedAt={snapshotUpdatedAt}
              onRefreshSnapshot={onRefreshSnapshot}
              isRefreshingSnapshot={isRefreshingSnapshot}
              directions={directions}
              isLoadingDirections={isLoadingDirections}
              selectedDirectionId={selectedDirectionId}
              onSelectDirection={onSelectDirection}
              directionForm={directionForm}
              onDirectionFormChange={onDirectionFormChange}
              createDirectionOpen={createDirectionOpen}
              onToggleCreateDirection={onToggleCreateDirection}
              onSubmitDirection={onSubmitDirection}
              isCreatingDirection={isCreatingDirection}
            />
            <ReviewPanel
              isReviewing={isReviewing}
              currentCard={currentReviewCard}
              remainingCount={remainingReviews}
              onDrawCards={onDrawReviewCards}
              onSubmitQuality={onSubmitReviewQuality}
            />
          </div>

          <div className="space-y-6">
            <DirectionDetailsPanel
              direction={directions?.find((direction) => direction.id === selectedDirectionId) ?? null}
              editorState={directionEditorState}
              onEditorChange={onDirectionEditorChange}
              hasChanges={hasDirectionChanges}
              onSave={onSaveDirection}
              onDelete={onDeleteDirection}
              isSaving={isSavingDirection}
              isDeleting={isDeletingDirection}
            />

            <SkillPointsPanel
              skills={skillPoints}
              isLoading={areSkillPointsLoading}
              selectedSkillPointId={selectedSkillPointId}
              onSelectedSkillPointChange={onSelectedSkillPointChange}
              editingSkillId={editingSkillId}
              onEditSkill={onEditSkill}
              onCancelEdit={onCancelSkillEdit}
              skillDraft={skillDraft}
              onSkillDraftChange={onSkillDraftChange}
              onSaveSkill={onSaveSkill}
              onDeleteSkill={onDeleteSkill}
              isSavingSkill={isSavingSkill}
              isDeletingSkill={isDeletingSkill}
              skillForm={skillForm}
              onSkillFormChange={onSkillFormChange}
              onSubmitSkill={onSubmitSkill}
              isCreatingSkill={isCreatingSkill}
              hasDirectionSelected={hasDirectionSelected}
            />

            <CardsPanel
              cards={cards}
              isLoading={areCardsLoading}
              selectedSkillPointId={selectedSkillPointId}
              onSelectedSkillPointChange={onSelectedSkillPointChange}
              skillPoints={skillPoints}
              editingCardId={editingCardId}
              onEditCard={onEditCard}
              onCancelEdit={onCancelCardEdit}
              cardDraft={cardDraft}
              onCardDraftChange={onCardDraftChange}
              onSaveCard={onSaveCard}
              onDeleteCard={onDeleteCard}
              isSavingCard={isSavingCard}
              isDeletingCard={isDeletingCard}
              cardForm={cardForm}
              onCardFormChange={onCardFormChange}
              onSubmitCard={onSubmitCard}
              isCreatingCard={isCreatingCard}
              hasDirectionSelected={hasDirectionSelected}
            />

            <AiDraftStudio
              hasDirectionSelected={hasDirectionSelected}
              notes={aiNotes}
              onNotesChange={onAiNotesChange}
              onGenerateDrafts={onGenerateDrafts}
              isGenerating={isGeneratingDrafts}
              statusMessage={generationStatus}
              errorMessage={generationError}
              cardDrafts={cardDrafts}
              onToggleDraft={onToggleDraftSelection}
              onImportDrafts={onImportDrafts}
              isImporting={isImportingDrafts}
            />
          </div>
        </section>
      </div>
    </div>
  );
};
