import type { CardDraft } from '@api';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { EmptyState } from '@components/EmptyState';
import { Textarea } from '@components/Textarea';
import { getCardTypeLabel } from '../utils';

interface AiDraftStudioProps {
  hasDirectionSelected: boolean;
  notes: string;
  onNotesChange: (value: string) => void;
  onGenerateDrafts: (event: React.FormEvent<HTMLFormElement>) => void;
  isGenerating: boolean;
  statusMessage: string | null;
  errorMessage: string | null;
  cardDrafts: Array<CardDraft & { id: string; selected: boolean }>;
  onToggleDraft: (id: string, selected: boolean) => void;
  onImportDrafts: () => void;
  isImporting: boolean;
}

export const AiDraftStudio = ({
  hasDirectionSelected,
  notes,
  onNotesChange,
  onGenerateDrafts,
  isGenerating,
  statusMessage,
  errorMessage,
  cardDrafts,
  onToggleDraft,
  onImportDrafts,
  isImporting,
}: AiDraftStudioProps) => {
  if (!hasDirectionSelected) {
    return (
      <Card variant="bordered">
        <div className="p-4 sm:p-6">
          <EmptyState
            icon={<span className="text-4xl">🤖</span>}
            title="Select a direction to generate content"
            description="Choose a learning direction before asking the AI to organize or draft new cards."
          />
        </div>
      </Card>
    );
  }

  return (
    <Card variant="bordered">
      <div className="p-4 sm:p-6 space-y-5">
        <header className="space-y-2">
          <h3 className="text-xl font-semibold text-secondary-900 dark:text-white">AI draft studio</h3>
          <p className="text-sm text-secondary-600 dark:text-secondary-400 max-w-2xl">
            Paste notes or quick thoughts and the AI will turn them into structured study cards for this direction.
          </p>
        </header>

        <div className="space-y-6 lg:grid lg:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
          <form onSubmit={onGenerateDrafts} className="space-y-4">
            <Textarea
              label="Notes for the AI"
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Share raw notes, meeting takeaways, or topics you want cards for."
              rows={4}
              fullWidth
              helperText="The AI will organize the text into bite-sized learning cards."
            />
            <div className="space-y-2">
              {statusMessage && (
                <p className="text-xs text-primary-700 dark:text-primary-200">{statusMessage}</p>
              )}
              {errorMessage && (
                <p className="text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-xs text-secondary-500 dark:text-secondary-400">
                  Drafts save directly into the selected direction after import.
                </span>
                <Button type="submit" disabled={isGenerating || !notes.trim()} loading={isGenerating}>
                  Generate drafts
                </Button>
              </div>
            </div>
          </form>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-lg font-semibold text-secondary-900 dark:text-white">Drafts</h4>
              <Button
                size="sm"
                onClick={onImportDrafts}
                disabled={cardDrafts.every((draft) => !draft.selected) || isImporting}
                loading={isImporting}
              >
                Import selected
              </Button>
            </div>
            {cardDrafts.length === 0 ? (
              <EmptyState
                icon={<span className="text-4xl">📝</span>}
                title="No drafts yet"
                description="Generate drafts from your notes to review them here."
              />
            ) : (
              <div className="space-y-3 lg:max-h-[360px] lg:overflow-y-auto">
                {cardDrafts.map((draft) => (
                  <label
                    key={draft.id}
                    className={`block rounded-lg border p-3 cursor-pointer transition-colors ${
                      draft.selected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-secondary-200 dark:border-secondary-700'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={draft.selected}
                        onChange={(event) => onToggleDraft(draft.id, event.target.checked)}
                      />
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-secondary-500 dark:text-secondary-400">
                          {draft.card_type ? getCardTypeLabel(draft.card_type) : 'Draft'}
                        </p>
                        <p className="font-semibold text-secondary-900 dark:text-white">{draft.title}</p>
                        <p className="text-sm text-secondary-700 dark:text-secondary-200 whitespace-pre-wrap">{draft.body}</p>
                        {draft.evidence_content && (
                          <p className="text-xs text-secondary-500 dark:text-secondary-400 whitespace-pre-wrap">
                            Evidence: {draft.evidence_content}
                          </p>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
