import type { Direction, DirectionStage } from '@api';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { EmptyState } from '@components/EmptyState';
import { Input } from '@components/Input';
import { Textarea } from '@components/Textarea';
import { stageOptions } from '../constants';

interface DirectionEditorState {
  name: string;
  stage: DirectionStage;
  quarterly_goal: string;
}

interface DirectionDetailsPanelProps {
  direction: Direction | null;
  editorState: DirectionEditorState;
  onEditorChange: (updates: Partial<DirectionEditorState>) => void;
  hasChanges: boolean;
  onSave: () => void;
  onDelete: () => void;
  isSaving: boolean;
  isDeleting: boolean;
}

export const DirectionDetailsPanel = ({
  direction,
  editorState,
  onEditorChange,
  hasChanges,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: DirectionDetailsPanelProps) => {
  // TODO: add optimistic UI updates when the directions API supports partial patch responses
  if (!direction) {
    return (
      <Card variant="bordered">
        <div className="p-6">
          <EmptyState
            icon={<span className="text-5xl">🧭</span>}
            title="Choose a direction"
            description="Select a direction from the list to manage its skills and cards."
          />
        </div>
      </Card>
    );
  }

  return (
    <Card variant="bordered">
      <div className="p-6 space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-secondary-900 dark:text-white">{direction.name}</h2>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              {stageOptions.find((option) => option.value === direction.stage)?.label ?? direction.stage}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onSave} disabled={!hasChanges} loading={isSaving}>
              Save changes
            </Button>
            <Button variant="danger" size="sm" onClick={onDelete} loading={isDeleting}>
              Delete
            </Button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Direction name"
            value={editorState.name}
            onChange={(event) => onEditorChange({ name: event.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Stage</label>
            <select
              className="w-full rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 px-3 py-2"
              value={editorState.stage}
              onChange={(event) => onEditorChange({ stage: event.target.value as DirectionStage })}
            >
              {stageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Textarea
          label="Quarterly goal"
          value={editorState.quarterly_goal}
          onChange={(event) => onEditorChange({ quarterly_goal: event.target.value })}
          rows={3}
          helperText="Summarize what success looks like for this direction in the next quarter."
        />
      </div>
    </Card>
  );
};
