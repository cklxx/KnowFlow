import { useMemo } from 'react';

import { useDirections, useMemoryCards } from '@/features/directions/hooks';

export const useTodayDigest = () => {
  const { data: directions } = useDirections();
  const primaryDirection = directions?.[0];
  const { data: cards } = useMemoryCards(primaryDirection?.id);

  return useMemo(
    () => ({
      direction: primaryDirection,
      cards: cards?.slice(0, 5) ?? [],
    }),
    [primaryDirection, cards],
  );
};
