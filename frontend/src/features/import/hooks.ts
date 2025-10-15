import { useMutation } from '@tanstack/react-query';

import type { ImportPreview, ImportPreviewParams } from '@api';
import { previewImport } from '@api';

export const useImportPreview = () =>
  useMutation<ImportPreview, Error, ImportPreviewParams>({
    mutationFn: (payload) => previewImport(payload),
  });

export type { ImportPreview, ImportPreviewParams } from '@api';
