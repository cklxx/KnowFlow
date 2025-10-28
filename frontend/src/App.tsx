import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TreePage } from '@pages/TreePage';
import { useThemeStore } from './store';

// Create a client shared across the app
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

/**
 * Theme initializer keeps the system theme in sync with the Zustand store
 */
const ThemeInitializer = () => {
  const updateActualTheme = useThemeStore((state) => state.updateActualTheme);

  useEffect(() => {
    updateActualTheme();
  }, [updateActualTheme]);

  return null;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer />
      <TreePage />
    </QueryClientProvider>
  );
}

export default App;
