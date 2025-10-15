import { useMutation } from '@tanstack/react-query';

import type {
  GenerateCardDraftsParams,
  GeneratedCardDraft,
} from '@api';
import { generateCardDrafts } from '@api';

export const useGenerateCardDrafts = () =>
  useMutation<GeneratedCardDraft[], Error, GenerateCardDraftsParams>({
    mutationFn: (payload) => generateCardDrafts(payload),
  });

export type { GeneratedCardDraft, GenerateCardDraftsParams } from '@api';
