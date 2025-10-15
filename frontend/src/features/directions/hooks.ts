import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createDirection,
  createMemoryCard,
  createSkillPoint,
  deleteDirection,
  deleteMemoryCard,
  deleteSkillPoint,
  fetchDirections,
  fetchMemoryCards,
  fetchSkillPoints,
  updateDirection,
  updateMemoryCard,
  updateSkillPoint,
  type CreateDirectionPayload,
  type CreateMemoryCardPayload,
  type CreateSkillPointPayload,
  type Direction,
  type MemoryCard,
  type SkillPoint,
  type UpdateDirectionPayload,
  type UpdateMemoryCardPayload,
  type UpdateSkillPointPayload,
} from '@api';
import { TREE_SNAPSHOT_QUERY_KEY } from '@/features/tree';

const DIRECTIONS_KEY = ['directions'];

export const useDirections = () =>
  useQuery<Direction[]>({
    queryKey: DIRECTIONS_KEY,
    queryFn: fetchDirections,
  });

export const useCreateDirection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDirectionPayload) => createDirection(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: DIRECTIONS_KEY });
      const previous = queryClient.getQueryData<Direction[]>(DIRECTIONS_KEY) ?? [];
      const optimisticItem: Direction = {
        id: `temp-${Date.now()}`,
        name: payload.name,
        stage: payload.stage,
        quarterly_goal: payload.quarterly_goal ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      queryClient.setQueryData(DIRECTIONS_KEY, [optimisticItem, ...previous]);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(DIRECTIONS_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DIRECTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: TREE_SNAPSHOT_QUERY_KEY });
    },
  });
};

export const useSkillPoints = (directionId: string | undefined) =>
  useQuery<SkillPoint[]>({
    queryKey: ['skill-points', directionId],
    enabled: Boolean(directionId),
    queryFn: () => {
      if (!directionId) {
        return Promise.resolve([]);
      }
      return fetchSkillPoints(directionId);
    },
  });

export const useMemoryCards = (directionId: string | undefined) =>
  useQuery<MemoryCard[]>({
    queryKey: ['memory-cards', directionId],
    enabled: Boolean(directionId),
    queryFn: () => {
      if (!directionId) {
        return Promise.resolve([]);
      }
      return fetchMemoryCards(directionId);
    },
  });

export const useCreateSkillPoint = (directionId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSkillPointPayload) => {
      if (!directionId) {
        return Promise.reject(new Error('Missing direction id'));
      }
      return createSkillPoint(directionId, payload);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-points', directionId] });
      queryClient.invalidateQueries({ queryKey: TREE_SNAPSHOT_QUERY_KEY });
    },
  });
};

export const useUpdateSkillPoint = (directionId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSkillPointPayload }) =>
      updateSkillPoint(id, payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-points', directionId] });
      queryClient.invalidateQueries({ queryKey: TREE_SNAPSHOT_QUERY_KEY });
    },
  });
};

export const useCreateMemoryCard = (directionId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateMemoryCardPayload) => {
      if (!directionId) {
        return Promise.reject(new Error('Missing direction id'));
      }
      return createMemoryCard(directionId, payload);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['memory-cards', directionId] });
      queryClient.invalidateQueries({ queryKey: TREE_SNAPSHOT_QUERY_KEY });
    },
  });
};

export const useUpdateMemoryCard = (directionId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMemoryCardPayload }) =>
      updateMemoryCard(id, payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['memory-cards', directionId] });
      queryClient.invalidateQueries({ queryKey: TREE_SNAPSHOT_QUERY_KEY });
    },
  });
};

export const useDeleteSkillPoint = (directionId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSkillPoint(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-points', directionId] });
    },
  });
};

export const useDeleteMemoryCard = (directionId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMemoryCard(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['memory-cards', directionId] });
    },
  });
};

export const useUpdateDirection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDirectionPayload }) =>
      updateDirection(id, payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DIRECTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: TREE_SNAPSHOT_QUERY_KEY });
    },
  });
};

export const useDeleteDirection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDirection(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DIRECTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: TREE_SNAPSHOT_QUERY_KEY });
    },
  });
};
