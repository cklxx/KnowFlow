import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  completeWorkout,
  fetchTodayWorkout,
  type TodayWorkoutPlan,
  type WorkoutCompletionSummary,
  type WorkoutResultKind,
} from '@api';

export type { TodayWorkoutPlan, WorkoutResultKind, WorkoutCompletionSummary } from '@api';

const TODAY_WORKOUT_KEY = ['today-workout'];

export const useTodayWorkout = () =>
  useQuery<TodayWorkoutPlan | null>({
    queryKey: TODAY_WORKOUT_KEY,
    queryFn: fetchTodayWorkout,
  });

export const useTodayItems = (workout: TodayWorkoutPlan | null) =>
  useMemo(
    () =>
      workout?.segments.flatMap((segment) =>
        segment.items.map((item) => ({
          segment,
          item,
        })),
      ) ?? [],
    [workout],
  );

export const useCompleteWorkout = () => {
  const queryClient = useQueryClient();

  return useMutation<
    WorkoutCompletionPayload,
    Error,
    { workoutId: string; results: { item_id: string; result: WorkoutResultKind }[] }
  >({
    mutationFn: ({ workoutId, results }) => completeWorkout(workoutId, results),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODAY_WORKOUT_KEY });
    },
  });
};

export type WorkoutResultMap = Record<string, WorkoutResultKind>;

export type WorkoutCompletionPayload = {
  summary: WorkoutCompletionSummary;
};
