import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { todayApi } from '@api';
import { TodayCard } from '@features/today/TodayCard';
import { Loading } from '@components/Loading';
import { EmptyState } from '@components/EmptyState';
import { Button } from '@components/Button';
import { Link } from 'react-router-dom';

/**
 * Today's workout page
 */
export const TodayPage = () => {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch today's workout
  const { data: workout, isLoading } = useQuery({
    queryKey: ['today', 'workout'],
    queryFn: todayApi.getWorkout,
  });

  // Submit review mutation
  const reviewMutation = useMutation({
    mutationFn: todayApi.submitReview,
    onSuccess: () => {
      // Move to next card
      if (workout && currentIndex < workout.cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Refetch workout when all cards are done
        queryClient.invalidateQueries({ queryKey: ['today', 'workout'] });
        setCurrentIndex(0);
      }
    },
  });

  const handleReview = async (quality: number) => {
    if (!workout?.cards[currentIndex]) return;
    await reviewMutation.mutateAsync({
      card_id: workout.cards[currentIndex].id,
      quality,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Loading today's cards..." />
      </div>
    );
  }

  const currentCard = workout?.cards[currentIndex];
  const remainingCards = workout ? workout.cards.length - currentIndex : 0;

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
            Today&apos;s Review
          </h1>
          {workout && (
            <p className="text-secondary-600 dark:text-secondary-400">
              {remainingCards} card{remainingCards !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>

        {/* Card or Empty State */}
        {currentCard ? (
          <TodayCard card={currentCard} onReview={handleReview} />
        ) : (
          <EmptyState
            icon={<span className="text-6xl">🎉</span>}
            title="All done for today!"
            description="Great work! Check back tomorrow for more cards to review."
            action={
              <Link to="/vault">
                <Button>Browse Your Cards</Button>
              </Link>
            }
          />
        )}

        {/* Progress */}
        {workout && workout.cards.length > 0 && (
          <div className="mt-6 max-w-2xl mx-auto">
            <div className="bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentIndex) / workout.cards.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
