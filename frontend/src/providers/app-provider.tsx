import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider } from './theme-provider';
import { ToastProvider } from './toast-provider';
import { QueryLifecycleProvider } from './query-lifecycle-provider';
import { ShareIntentProvider } from './share-intent-provider';

export const AppProvider = ({ children }: PropsWithChildren) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <QueryLifecycleProvider>
          <ShareIntentProvider>
            <ThemeProvider>
              <ToastProvider>{children}</ToastProvider>
            </ThemeProvider>
          </ShareIntentProvider>
        </QueryLifecycleProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
};
