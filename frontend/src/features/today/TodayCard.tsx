import { useState } from 'react';
import { Card } from '@components/Card';
import { Button } from '@components/Button';
import type { WorkoutCard } from '../../types/api';

interface TodayCardProps {
  card: WorkoutCard;
  onReview: (quality: number) => void;
}

/**
 * Card component for today's workout
 */
export const TodayCard = ({ card, onReview }: TodayCardProps) => {
  const [showAnswer, setShowAnswer] = useState(false);

  const handleQualityClick = (quality: number) => {
    onReview(quality);
    setShowAnswer(false);
  };

  return (
    <Card variant="elevated" padding="lg" className="max-w-2xl mx-auto">
      <div className="space-y-6">
        {/* Question */}
        <div>
          <h3 className="text-sm font-medium text-secondary-600 dark:text-secondary-400 mb-2">
            Question
          </h3>
          <p className="text-lg text-secondary-900 dark:text-secondary-100 whitespace-pre-wrap">
            {card.question}
          </p>
        </div>

        {/* Answer (revealed) */}
        {showAnswer && (
          <div className="animate-slide-down">
            <div className="border-t border-secondary-200 dark:border-secondary-700 pt-6">
              <h3 className="text-sm font-medium text-secondary-600 dark:text-secondary-400 mb-2">
                Answer
              </h3>
              <p className="text-lg text-secondary-900 dark:text-secondary-100 whitespace-pre-wrap">
                {card.answer}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {!showAnswer ? (
            <Button fullWidth onClick={() => setShowAnswer(true)}>
              Show Answer
            </Button>
          ) : (
            <>
              <p className="text-sm text-center text-secondary-600 dark:text-secondary-400">
                How well did you remember?
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="danger" size="sm" onClick={() => handleQualityClick(0)}>
                  Forgot
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQualityClick(3)}>
                  Hard
                </Button>
                <Button variant="primary" size="sm" onClick={() => handleQualityClick(5)}>
                  Easy
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};
