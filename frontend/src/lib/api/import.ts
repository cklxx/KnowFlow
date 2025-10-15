import { apiFetch } from './client';
import type { ImportPreview, ImportPreviewParams, ImportSourceKind } from './types';

const normalizeSource = (
  source: NonNullable<ImportPreviewParams['sources']>[number],
): Record<string, unknown> => ({
  title: source.title,
  content: source.content,
  url: source.url,
  tags: source.tags,
  kind: source.kind ?? ('text' as ImportSourceKind),
});

export const previewImport = async (
  payload: ImportPreviewParams,
): Promise<ImportPreview> => {
  const body: Record<string, unknown> = {
    direction_name: payload.directionName,
    language: payload.language,
    desired_cards_per_cluster: payload.desiredCardsPerCluster,
    sources: payload.sources?.map((source) => normalizeSource(source)) ?? [],
  };

  return apiFetch<ImportPreview>('/api/import/preview', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};
