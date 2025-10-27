import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark';
  updateActualTheme: () => void;
}

/**
 * Theme store for managing dark/light mode
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      actualTheme: 'light',

      setTheme: (theme) => {
        set({ theme });
        get().updateActualTheme();
      },

      updateActualTheme: () => {
        const { theme } = get();
        let actualTheme: 'light' | 'dark' = 'light';

        if (theme === 'system') {
          actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
        } else {
          actualTheme = theme;
        }

        set({ actualTheme });

        // Update document class
        if (actualTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
    }),
    {
      name: 'knowflow-theme',
      onRehydrateStorage: () => (state) => {
        // Update theme when hydrated from storage
        state?.updateActualTheme();
      },
    }
  )
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const state = useThemeStore.getState();
    if (state.theme === 'system') {
      state.updateActualTheme();
    }
  });
}
