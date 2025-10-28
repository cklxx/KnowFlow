import type { WorkoutCard } from '@api';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { EmptyState } from '@components/EmptyState';
import { cardTypes } from '../constants';

interface ReviewPanelProps {
  isReviewing: boolean;
  currentCard: WorkoutCard | undefined;
  remainingCount: number;
  onDrawCards: () => void;
  onSubmitQuality: (quality: number) => Promise<void>;
}

const formatCardType = (value: WorkoutCard['card_type']) => {
  const option = cardTypes.find((item) => item.value === value);
  return option?.label ?? value;
};

export const ReviewPanel = ({
  isReviewing,
  currentCard,
  remainingCount,
  onDrawCards,
  onSubmitQuality,
}: ReviewPanelProps) => {
  return (
    <Card variant="bordered">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Quick review</h2>
          <Button size="sm" onClick={onDrawCards}>
            Draw cards
          </Button>
        </div>
        {!isReviewing ? (
          <p className="text-sm text-secondary-600 dark:text-secondary-400">
            Pull a short stack of due cards to validate what you&apos;ve learned.
          </p>
        ) : currentCard ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 p-3">
              <p className="text-xs font-semibold uppercase text-secondary-500 dark:text-secondary-400">
                {currentCard.direction_name} · {formatCardType(currentCard.card_type)}
              </p>
              <p className="mt-2 font-semibold text-secondary-900 dark:text-white">{currentCard.title}</p>
              <p className="mt-1 text-sm text-secondary-700 dark:text-secondary-200 whitespace-pre-wrap">{currentCard.body}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {/* TODO: align the review scale with the final spaced repetition configuration once backend publishes the mapping */}
              {[0, 2, 3, 4, 5].map((quality) => (
                <Button
                  key={quality}
                  size="sm"
                  variant={quality >= 4 ? 'primary' : quality >= 2 ? 'outline' : 'secondary'}
                  onClick={() => onSubmitQuality(quality)}
                >
                  {quality}
                </Button>
              ))}
            </div>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 text-right">
              {Math.max(remainingCount - 1, 0)} remaining
            </p>
          </div>
        ) : (
          <EmptyState
            icon={<span className="text-4xl">🎉</span>}
            title="No cards drawn"
            description="Hit draw cards to fetch due reviews from the scheduler."
          />
        )}
      </div>
    </Card>
  );
};
