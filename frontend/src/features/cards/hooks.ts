import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createCardApplication,
  createEvidence,
  deleteCard,
  getCard,
  listCardApplications,
  listEvidence,
  removeEvidence,
  updateCard,
  type CardApplication,
  type Evidence,
  type MemoryCard,
  type NewCardApplicationInput,
  type NewEvidenceInput,
  type UpdateCardPayload,
} from '@api';

const CARD_QUERY_KEY = (id: string) => ['card', id];
const CARD_EVIDENCE_KEY = (id: string) => ['card-evidence', id];
const CARD_APPLICATIONS_KEY = (id: string) => ['card-applications', id];

export const useCard = (id?: string) =>
  useQuery<MemoryCard>({
    queryKey: CARD_QUERY_KEY(id ?? ''),
    queryFn: () => getCard(id ?? ''),
    enabled: Boolean(id),
    staleTime: 1000 * 30,
  });

export const useUpdateCard = (id?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCardPayload) => updateCard(id ?? '', payload),
    onSuccess: (card) => {
      if (!id) return;
      queryClient.setQueryData<MemoryCard>(CARD_QUERY_KEY(id), card);
    },
  });
};

export const useDeleteCard = (id?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteCard(id ?? ''),
    onSuccess: () => {
      if (!id) return;
      queryClient.removeQueries({ queryKey: CARD_QUERY_KEY(id) });
      queryClient.removeQueries({ queryKey: CARD_EVIDENCE_KEY(id) });
    },
  });
};

export const useCardEvidence = (id?: string) =>
  useQuery<Evidence[]>({
    queryKey: CARD_EVIDENCE_KEY(id ?? ''),
    queryFn: () => listEvidence(id ?? ''),
    enabled: Boolean(id),
    staleTime: 1000 * 15,
  });

export const useCreateEvidence = (id?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewEvidenceInput) => createEvidence(id ?? '', payload),
    onSuccess: (created) => {
      if (!id) return;
      queryClient.setQueryData<Evidence[]>(CARD_EVIDENCE_KEY(id), (current) =>
        current ? [created, ...current] : [created],
      );
    },
  });
};

export const useDeleteEvidence = (cardId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (evidenceId: string) => removeEvidence(evidenceId),
    onSuccess: (_, evidenceId) => {
      if (!cardId) return;
      queryClient.setQueryData<Evidence[]>(CARD_EVIDENCE_KEY(cardId), (current) =>
        current?.filter((item) => item.id !== evidenceId) ?? [],
      );
    },
  });
};

export const useCardApplications = (id?: string) =>
  useQuery<CardApplication[]>({
    queryKey: CARD_APPLICATIONS_KEY(id ?? ''),
    queryFn: () => listCardApplications(id ?? ''),
    enabled: Boolean(id),
    staleTime: 1000 * 15,
  });

export const useCreateCardApplication = (id?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewCardApplicationInput) =>
      createCardApplication(id ?? '', payload),
    onSuccess: (created) => {
      if (!id) return;
      queryClient.setQueryData<CardApplication[]>(CARD_APPLICATIONS_KEY(id), (current) =>
        current ? [created, ...current] : [created],
      );
    },
  });
};

export const useCardMetrics = (card?: MemoryCard) =>
  useMemo(
    () => ({
      stability: card?.stability?.toFixed(2) ?? '0.00',
      relevance: card?.relevance?.toFixed(2) ?? '0.00',
      novelty: card?.novelty?.toFixed(2) ?? '0.00',
      priority: card?.priority?.toFixed(2) ?? '0.00',
    }),
    [card?.stability, card?.relevance, card?.novelty, card?.priority],
  );
