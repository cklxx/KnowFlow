import type { PropsWithChildren } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { focusManager, useQueryClient } from '@tanstack/react-query';

import {
  fetchSyncDelta,
  type Direction,
  type MemoryCard,
  type SkillPoint,
  type SyncResponse,
} from '@api';
import { DIRECTIONS_QUERY_KEY } from '@/features/directions';
import { TODAY_WORKOUT_QUERY_KEY } from '@/features/today';
import { TREE_SNAPSHOT_QUERY_KEY } from '@/features/tree';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

type MemoryCardQueryKey = [string, string, string];

type Identified = { id: string };
type Timestamped = { created_at: string };

const mergeRecords = <T extends Identified>(current: T[], updates: T[], removed: string[]): T[] => {
  const map = new Map(current.map((item) => [item.id, item] as const));
  updates.forEach((item) => {
    map.set(item.id, item);
  });
  removed.forEach((id) => {
    map.delete(id);
  });
  return Array.from(map.values());
};

const sortDescByCreated = <T extends Timestamped>(items: T[]): T[] =>
  [...items].sort((a, b) => b.created_at.localeCompare(a.created_at));

const sortAscByCreated = <T extends Timestamped>(items: T[]): T[] =>
  [...items].sort((a, b) => a.created_at.localeCompare(b.created_at));

const applyDirectionDelta = (client: ReturnType<typeof useQueryClient>, delta: SyncResponse['directions']) => {
  client.setQueryData<Direction[]>(DIRECTIONS_QUERY_KEY, (previous = []) =>
    sortDescByCreated(
      mergeRecords(previous, delta.updated, delta.deleted.map((entry) => entry.id)),
    ),
  );
};

const applySkillPointDelta = (client: ReturnType<typeof useQueryClient>, delta: SyncResponse['skill_points']) => {
  const updatesByDirection = new Map<string, SkillPoint[]>();
  delta.updated.forEach((point) => {
    const list = updatesByDirection.get(point.direction_id) ?? [];
    list.push(point);
    updatesByDirection.set(point.direction_id, list);
  });

  const deletedByDirection = new Map<string, string[]>();
  delta.deleted.forEach((entry) => {
    const list = deletedByDirection.get(entry.direction_id) ?? [];
    list.push(entry.id);
    deletedByDirection.set(entry.direction_id, list);
  });

  const directionIds = new Set([
    ...updatesByDirection.keys(),
    ...deletedByDirection.keys(),
  ]);

  directionIds.forEach((directionId) => {
    client.setQueryData<SkillPoint[]>(['skill-points', directionId], (previous = []) =>
      sortAscByCreated(
        mergeRecords(
          previous,
          updatesByDirection.get(directionId) ?? [],
          deletedByDirection.get(directionId) ?? [],
        ),
      ),
    );
  });
};

const applyMemoryCardDelta = (client: ReturnType<typeof useQueryClient>, delta: SyncResponse['memory_cards']) => {
  const updatesByDirection = new Map<string, MemoryCard[]>();
  delta.updated.forEach((card) => {
    const list = updatesByDirection.get(card.direction_id) ?? [];
    list.push(card);
    updatesByDirection.set(card.direction_id, list);
  });

  const deletedByDirection = new Map<string, { id: string; skill_point_id: string | null }[]>();
  delta.deleted.forEach((entry) => {
    const list = deletedByDirection.get(entry.direction_id) ?? [];
    list.push({ id: entry.id, skill_point_id: entry.skill_point_id ?? null });
    deletedByDirection.set(entry.direction_id, list);
  });

  const directionIds = new Set([
    ...updatesByDirection.keys(),
    ...deletedByDirection.keys(),
  ]);

  directionIds.forEach((directionId) => {
    const updates = updatesByDirection.get(directionId) ?? [];
    const deletions = deletedByDirection.get(directionId) ?? [];

    const removedIds = deletions.map((entry) => entry.id);
    const allKey: MemoryCardQueryKey = ['memory-cards', directionId, 'all'];

    const nextAll =
      client.setQueryData<MemoryCard[]>(allKey, (previous = []) =>
        sortDescByCreated(mergeRecords(previous, updates, removedIds)),
      ) ?? [];

    const relatedQueries = client.getQueriesData<MemoryCard[]>({
      queryKey: ['memory-cards', directionId],
    });

    relatedQueries.forEach(([queryKey]) => {
      const key = queryKey as MemoryCardQueryKey;
      const skillKey = key[2];
      if (skillKey === 'all') {
        return;
      }

      const filtered = nextAll.filter((card) => card.skill_point_id === skillKey);
      client.setQueryData(key, filtered);
    });
  });
};

const applySyncDelta = (client: ReturnType<typeof useQueryClient>, delta: SyncResponse) => {
  applyDirectionDelta(client, delta.directions);
  applySkillPointDelta(client, delta.skill_points);
  applyMemoryCardDelta(client, delta.memory_cards);
};

export const QueryLifecycleProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const queryClient = useQueryClient();
  const cursorRef = useRef<string | null>(null);
  const syncPromiseRef = useRef<Promise<void> | null>(null);
  const lastRefreshRef = useRef<number>(Date.now());
  const appStateRef = useRef<AppStateStatus>((AppState.currentState as AppStateStatus) ?? 'active');

  const runSync = useCallback(async () => {
    if (syncPromiseRef.current) {
      return syncPromiseRef.current;
    }

    const promise = (async () => {
      try {
        const delta = await fetchSyncDelta(cursorRef.current);
        applySyncDelta(queryClient, delta);
        cursorRef.current = delta.cursor;
      } catch (error) {
        console.warn('Background sync failed', error);
      } finally {
        syncPromiseRef.current = null;
      }
    })();

    syncPromiseRef.current = promise;
    return promise;
  }, [queryClient]);

  const triggerRefresh = useCallback(() => {
    lastRefreshRef.current = Date.now();
    queryClient.invalidateQueries({ queryKey: TREE_SNAPSHOT_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: TODAY_WORKOUT_QUERY_KEY });
    void runSync();
  }, [queryClient, runSync]);

  useEffect(() => {
    return focusManager.setEventListener((handleFocus) => {
      if (typeof AppState.addEventListener !== 'function') {
        handleFocus(true);
        return () => undefined;
      }

      const subscription = AppState.addEventListener('change', (nextState) => {
        appStateRef.current = nextState;
        const isActive = nextState === 'active';
        handleFocus(isActive);

        if (isActive) {
          const now = Date.now();
          const elapsed = now - lastRefreshRef.current;
          if (elapsed >= REFRESH_INTERVAL_MS) {
            triggerRefresh();
          } else {
            void runSync();
          }
        }
      });

      return () => {
        if (subscription && typeof subscription.remove === 'function') {
          subscription.remove();
        }
      };
    });
  }, [runSync, triggerRefresh]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (appStateRef.current !== 'active') {
        return;
      }
      const now = Date.now();
      if (now - lastRefreshRef.current >= REFRESH_INTERVAL_MS) {
        triggerRefresh();
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [triggerRefresh]);

  useEffect(() => {
    void runSync();
  }, [runSync]);

  return <>{children}</>;
};
