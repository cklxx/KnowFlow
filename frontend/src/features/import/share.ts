import { create } from 'zustand';

import type { ImportSourceKind } from '@api';

type ShareSource = {
  kind?: ImportSourceKind;
  title?: string;
  url?: string;
  content?: string;
  tags?: string[];
};

export type ShareImportIntent = {
  directionId?: string;
  directionName?: string;
  language?: string;
  desiredCardsPerCluster?: number;
  sources: ShareSource[];
  autoPreview?: boolean;
  receivedAt: string;
};

type ShareImportState = {
  intent: ShareImportIntent | null;
  setIntent: (intent: ShareImportIntent) => void;
  clear: () => void;
};

const useShareImportStore = create<ShareImportState>((set) => ({
  intent: null,
  setIntent: (intent) => set({ intent }),
  clear: () => set({ intent: null }),
}));

export const emitShareImportIntent = (
  intent: Omit<ShareImportIntent, 'receivedAt'>,
): void => {
  const receivedAt = new Date().toISOString();
  useShareImportStore.getState().setIntent({ ...intent, receivedAt });
};

export const useShareImportIntent = () => {
  const intent = useShareImportStore((state) => state.intent);
  const clear = useShareImportStore((state) => state.clear);
  return { intent, clear };
};
