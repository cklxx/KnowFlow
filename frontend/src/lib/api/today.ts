import { apiFetch } from './client';
import type {
  TodayWorkoutPlan,
  WorkoutCompletionSummary,
  WorkoutResultKind,
} from './types';

export const fetchTodayWorkout = async (): Promise<TodayWorkoutPlan | null> => {
  const response = await apiFetch<{ workout: TodayWorkoutPlan | null }>(
    '/api/today',
  );
  return response.workout ?? null;
};

export const completeWorkout = (
  workoutId: string,
  results: { item_id: string; result: WorkoutResultKind }[],
) =>
  apiFetch<{ summary: WorkoutCompletionSummary }>(`/api/workouts/${workoutId}/done`, {
    method: 'POST',
    body: JSON.stringify({ results }),
  });
