import { useColorScheme } from 'react-native';
import { dark, light } from './tokens/colors';
import { spacing } from './tokens/spacing';
import { typography } from './tokens/typography';

export type ThemeMode = 'light' | 'dark';

export type ThemeTokens = {
  mode: ThemeMode;
  colors: typeof light;
  spacing: typeof spacing;
  typography: typeof typography;
};

export const buildTheme = (mode: ThemeMode): ThemeTokens => ({
  mode,
  colors: mode === 'dark' ? dark : light,
  spacing,
  typography,
});

export const useSystemTheme = (): ThemeMode => {
  const scheme = useColorScheme();
  if (scheme === 'dark') {
    return 'dark';
  }
  return 'light';
};
