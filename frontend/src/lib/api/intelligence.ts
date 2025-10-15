import { apiFetch } from './client';
import type { CardType, GeneratedCardDraft } from './types';

export type MaterialChunkInput = {
  title?: string | null;
  content: string;
  source?: string | null;
};

export type GenerateCardDraftsParams = {
  directionName?: string;
  taskContext?: string;
  materials: MaterialChunkInput[];
  preferredCardType?: CardType;
  desiredCount?: number;
  language?: string;
};

export const generateCardDrafts = async (
  params: GenerateCardDraftsParams,
): Promise<GeneratedCardDraft[]> => {
  const response = await apiFetch<{ drafts: GeneratedCardDraft[] }>(
    '/api/intelligence/card-drafts',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        direction_name: params.directionName,
        task_context: params.taskContext,
        materials: params.materials.map((material) => ({
          title: material.title ?? undefined,
          content: material.content,
          source: material.source ?? undefined,
        })),
        preferred_card_type: params.preferredCardType,
        desired_count: params.desiredCount,
        language: params.language,
      }),
    },
  );

  return response.drafts;
};
