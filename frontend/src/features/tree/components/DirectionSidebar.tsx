import type { DirectionStage, Direction } from '@api';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { EmptyState } from '@components/EmptyState';
import { Input } from '@components/Input';
import { Loading } from '@components/Loading';
import { Textarea } from '@components/Textarea';
import { initialDirectionForm, stageOptions } from '../constants';

interface OverviewMetrics {
  directionCount: number;
  skillPointCount: number;
  cardCount: number;
}

interface DirectionSidebarProps {
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
}

export const DirectionSidebar = ({
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
}: DirectionSidebarProps) => {
  const formattedUpdatedAt = snapshotUpdatedAt ? new Date(snapshotUpdatedAt).toLocaleString() : '—';

  return (
    <div className="space-y-6">
      <section>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <div className="p-4">
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Directions</p>
              <p className="mt-2 text-2xl font-semibold text-secondary-900 dark:text-white">
                {overviewMetrics.directionCount}
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Skill points</p>
              <p className="mt-2 text-2xl font-semibold text-secondary-900 dark:text-white">
                {overviewMetrics.skillPointCount}
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary-500 dark:text-secondary-400">Cards</p>
                  <p className="mt-2 text-2xl font-semibold text-secondary-900 dark:text-white">
                    {overviewMetrics.cardCount}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={onRefreshSnapshot} loading={isRefreshingSnapshot}>
                  Refresh
                </Button>
              </div>
              <p className="mt-3 text-xs text-secondary-500 dark:text-secondary-400">Snapshot updated {formattedUpdatedAt}</p>
            </div>
          </Card>
        </div>
      </section>

      <Card variant="bordered">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Directions</h2>
            <Button size="sm" onClick={() => onToggleCreateDirection(true)}>
              New
            </Button>
          </div>

          {isLoadingDirections ? (
            <div className="py-8">
              <Loading text="Loading directions" />
            </div>
          ) : directions && directions.length > 0 ? (
            <div className="space-y-2">
              {directions.map((direction) => (
                <button
                  key={direction.id}
                  type="button"
                  onClick={() => onSelectDirection(direction.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                    direction.id === selectedDirectionId
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-200'
                      : 'border-transparent bg-white dark:bg-secondary-800 text-secondary-700 dark:text-secondary-200 hover:border-secondary-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{direction.name}</span>
                    <span className="text-xs uppercase tracking-wide text-secondary-500 dark:text-secondary-400">
                      {stageOptions.find((option) => option.value === direction.stage)?.label ?? direction.stage}
                    </span>
                  </div>
                  {direction.quarterly_goal && (
                    <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">{direction.quarterly_goal}</p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<span className="text-5xl">🧭</span>}
              title="Start by creating a direction"
              description="Organize your learning goals so cards have clear context."
            />
          )}

          {createDirectionOpen && (
            <form
              onSubmit={onSubmitDirection}
              className="space-y-3 pt-4 border-t border-secondary-200 dark:border-secondary-700"
            >
              <Input
                label="Direction name"
                value={directionForm.name}
                onChange={(event) => onDirectionFormChange({ name: event.target.value })}
                fullWidth
                required
              />
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Stage</label>
                <select
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 px-3 py-2"
                  value={directionForm.stage}
                  onChange={(event) =>
                    onDirectionFormChange({ stage: event.target.value as DirectionStage })
                  }
                >
                  {stageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} — {option.description}
                    </option>
                  ))}
                </select>
              </div>
              <Textarea
                label="Quarterly goal"
                value={directionForm.quarterly_goal}
                onChange={(event) => onDirectionFormChange({ quarterly_goal: event.target.value })}
                rows={3}
                fullWidth
                helperText="Optional planning text to keep the direction focused"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => onToggleCreateDirection(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={isCreatingDirection}>
                  Create direction
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
};
