import type { SkillLevel, SkillPoint } from '@api';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { EmptyState } from '@components/EmptyState';
import { Input } from '@components/Input';
import { Loading } from '@components/Loading';
import { Textarea } from '@components/Textarea';
import { initialSkillForm, skillLevels } from '../constants';
import { getSkillLevelLabel } from '../utils';

interface SkillPointsPanelProps {
  skills: SkillPoint[] | undefined;
  isLoading: boolean;
  selectedSkillPointId: 'all' | 'orphan' | string;
  onSelectedSkillPointChange: (value: 'all' | 'orphan' | string) => void;
  editingSkillId: string | null;
  onEditSkill: (skill: SkillPoint) => void;
  onCancelEdit: () => void;
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
  hasDirectionSelected: boolean;
}

export const SkillPointsPanel = ({
  skills,
  isLoading,
  selectedSkillPointId,
  onSelectedSkillPointChange,
  editingSkillId,
  onEditSkill,
  onCancelEdit,
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
  hasDirectionSelected,
}: SkillPointsPanelProps) => {
  return (
    <Card variant="bordered">
      <div className="p-6 space-y-5">
        <header className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-secondary-900 dark:text-white">Skill points</h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={selectedSkillPointId === 'all' ? 'primary' : 'ghost'}
              onClick={() => onSelectedSkillPointChange('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={selectedSkillPointId === 'orphan' ? 'primary' : 'ghost'}
              onClick={() => onSelectedSkillPointChange('orphan')}
            >
              Unassigned cards
            </Button>
          </div>
        </header>

        {isLoading ? (
          <Loading text="Loading skill points" />
        ) : skills && skills.length > 0 ? (
          <div className="space-y-3">
            {skills.map((skill) => {
              const isEditing = editingSkillId === skill.id;
              return (
                <div
                  key={skill.id}
                  className={`rounded-lg border ${
                    selectedSkillPointId === skill.id
                      ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/40'
                      : 'border-secondary-200 dark:border-secondary-700'
                  } p-4 space-y-3`}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <Input
                        label="Name"
                        value={skillDraft.name}
                        onChange={(event) => onSkillDraftChange({ name: event.target.value })}
                      />
                      <Textarea
                        label="Summary"
                        value={skillDraft.summary}
                        onChange={(event) => onSkillDraftChange({ summary: event.target.value })}
                        rows={2}
                      />
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Level</label>
                        <select
                          className="w-full rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 px-3 py-2"
                          value={skillDraft.level}
                          onChange={(event) =>
                            onSkillDraftChange({ level: event.target.value as SkillLevel })
                          }
                        >
                          {skillLevels.map((level) => (
                            <option key={level.value} value={level.value}>
                              {level.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex justify-between">
                        <Button size="sm" variant="primary" onClick={onSaveSkill} loading={isSavingSkill}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                          Cancel
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => onDeleteSkill(skill.id)} loading={isDeletingSkill}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-lg font-semibold text-secondary-900 dark:text-white">{skill.name}</h4>
                          {skill.summary ? (
                            <p className="text-sm text-secondary-600 dark:text-secondary-300 whitespace-pre-wrap">{skill.summary}</p>
                          ) : (
                            <p className="text-sm italic text-secondary-500 dark:text-secondary-400">No summary yet</p>
                          )}
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400">
                          {getSkillLevelLabel(skill.level)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => onEditSkill(skill)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onSelectedSkillPointChange(skill.id)}>
                          Focus cards
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
            icon={<span className="text-4xl">🛠️</span>}
            title="Define skills for this direction"
            description="Capture the abilities you want to grow so you can attach cards to them."
          />
        )}

        {hasDirectionSelected && (
          <form
            onSubmit={onSubmitSkill}
            className="space-y-3 pt-4 border-t border-secondary-200 dark:border-secondary-700"
          >
            {/* TODO: surface validation errors from the API (e.g., duplicate names) inline instead of relying on alerts */}
            <h4 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300 uppercase tracking-wide">
              Add skill point
            </h4>
            <Input
              label="Name"
              value={skillForm.name}
              onChange={(event) => onSkillFormChange({ name: event.target.value })}
              required
            />
            <Textarea
              label="Summary"
              value={skillForm.summary}
              onChange={(event) => onSkillFormChange({ summary: event.target.value })}
              rows={2}
            />
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Level</label>
              <select
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 px-3 py-2"
                value={skillForm.level}
                onChange={(event) => onSkillFormChange({ level: event.target.value as SkillLevel })}
              >
                {skillLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={isCreatingSkill}>
                Add skill point
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
};
