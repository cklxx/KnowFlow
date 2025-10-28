import type { CardType, MemoryCard, SkillPoint } from '@api';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { EmptyState } from '@components/EmptyState';
import { Input } from '@components/Input';
import { Loading } from '@components/Loading';
import { Textarea } from '@components/Textarea';
import { cardTypes, initialCardForm } from '../constants';
import { getCardTypeLabel } from '../utils';

interface CardsPanelProps {
  cards: MemoryCard[];
  isLoading: boolean;
  selectedSkillPointId: 'all' | 'orphan' | string;
  onSelectedSkillPointChange: (value: 'all' | 'orphan' | string) => void;
  skillPoints: SkillPoint[] | undefined;
  editingCardId: string | null;
  onEditCard: (card: MemoryCard) => void;
  onCancelEdit: () => void;
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
  hasDirectionSelected: boolean;
}

export const CardsPanel = ({
  cards,
  isLoading,
  selectedSkillPointId,
  onSelectedSkillPointChange,
  skillPoints,
  editingCardId,
  onEditCard,
  onCancelEdit,
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
  hasDirectionSelected,
}: CardsPanelProps) => {
  const filteredSkillPoints = skillPoints ?? [];

  const visibleCards = cards.filter((card) => {
    const title = card.title?.trim() ?? '';
    const body = card.body?.trim() ?? '';
    return title.length > 0 || body.length > 0;
  });

  return (
    <Card variant="bordered">
      <div className="p-4 sm:p-6 space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-secondary-900 dark:text-white">Cards</h3>
            <p className="text-sm text-secondary-600 dark:text-secondary-400">{visibleCards.length} cards in view</p>
          </div>
          {filteredSkillPoints.length > 0 && (
            <select
              className="rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 px-3 py-2"
              value={selectedSkillPointId}
              onChange={(event) => onSelectedSkillPointChange(event.target.value as typeof selectedSkillPointId)}
            >
              <option value="all">All skill points</option>
              <option value="orphan">Without skill point</option>
              {filteredSkillPoints.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          )}
        </header>

        {isLoading ? (
          <Loading text="Loading cards" />
        ) : visibleCards.length > 0 ? (
          <div className="space-y-4">
            {/* TODO: support multi-select for bulk actions like tagging or moving cards */}
            {visibleCards.map((card) => {
              const isEditing = editingCardId === card.id;
              const skillName = card.skill_point_id
                ? filteredSkillPoints.find((skill) => skill.id === card.skill_point_id)?.name ?? 'Unknown skill point'
                : 'No skill point';

              return (
                <div key={card.id} className="rounded-lg border border-secondary-200 dark:border-secondary-700 p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <Input
                        label="Title"
                        value={cardDraft.title}
                        onChange={(event) => onCardDraftChange({ title: event.target.value })}
                      />
                      <Textarea
                        label="Body"
                        value={cardDraft.body}
                        onChange={(event) => onCardDraftChange({ body: event.target.value })}
                        rows={3}
                      />
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Card type</label>
                          <select
                            className="w-full rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 px-3 py-2"
                            value={cardDraft.card_type}
                            onChange={(event) => onCardDraftChange({ card_type: event.target.value as CardType })}
                          >
                            {cardTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Skill point</label>
                          <select
                            className="w-full rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 px-3 py-2"
                            value={cardDraft.skill_point_id}
                            onChange={(event) => onCardDraftChange({ skill_point_id: event.target.value })}
                          >
                            <option value="none">Not assigned</option>
                            {filteredSkillPoints.map((skill) => (
                              <option key={skill.id} value={skill.id}>
                                {skill.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-between gap-2">
                        <Button size="sm" variant="primary" onClick={onSaveCard} loading={isSavingCard}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                          Cancel
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => onDeleteCard(card.id)} loading={isDeletingCard}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-secondary-500 dark:text-secondary-400">
                            {getCardTypeLabel(card.card_type)}
                          </p>
                          <h4 className="text-lg font-semibold text-secondary-900 dark:text-white">{card.title}</h4>
                        </div>
                        <span className="text-xs text-secondary-500 dark:text-secondary-400">{skillName}</span>
                      </div>
                      <p className="text-sm text-secondary-700 dark:text-secondary-200 whitespace-pre-wrap">{card.body}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="ghost" onClick={() => onEditCard(card)}>
                          Edit
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<span className="text-4xl">🃏</span>}
            title="No cards yet"
            description="Use the form below or import AI drafts to start building your deck."
          />
        )}

        {hasDirectionSelected && (
          <form
            onSubmit={onSubmitCard}
            className="space-y-3 pt-4 border-t border-secondary-200 dark:border-secondary-700"
          >
            <h4 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300 uppercase tracking-wide">
              Add card manually
            </h4>
            <Input
              label="Title"
              value={cardForm.title}
              onChange={(event) => onCardFormChange({ title: event.target.value })}
              required
            />
            <Textarea
              label="Body"
              value={cardForm.body}
              onChange={(event) => onCardFormChange({ body: event.target.value })}
              rows={4}
              required
            />
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Card type</label>
                <select
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 px-3 py-2"
                  value={cardForm.card_type}
                  onChange={(event) => onCardFormChange({ card_type: event.target.value as CardType })}
                >
                  {cardTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} — {type.helper}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Skill point</label>
                <select
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 px-3 py-2"
                  value={cardForm.skill_point_id}
                  onChange={(event) => onCardFormChange({ skill_point_id: event.target.value })}
                >
                  <option value="none">No skill point</option>
                  {filteredSkillPoints.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={isCreatingCard}>
                Create card
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
};
