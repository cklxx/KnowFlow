import type { PropsWithChildren } from 'react';
import { StyleSheet, Text as RNText, type TextProps } from 'react-native';
import { useMemo } from 'react';

import { useTheme } from '@/providers';
import type { ThemeTokens } from '@/ui/theme';

type Variant = 'title' | 'subtitle' | 'body' | 'caption';

type Props = TextProps & {
  variant?: Variant;
};

export const Text = ({ children, style, variant = 'body', ...rest }: PropsWithChildren<Props>) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <RNText style={[styles[variant], style]} {...rest}>
      {children}
    </RNText>
  );
};

type StyleMap = Record<Variant, ReturnType<typeof StyleSheet.create>['body']>;

const createStyles = (theme: ThemeTokens): StyleMap =>
  StyleSheet.create({
    title: {
      fontFamily: theme.typography.fontFamily,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.headingLg,
      fontWeight: '600',
      marginBottom: theme.spacing.md,
    },
    subtitle: {
      fontFamily: theme.typography.fontFamily,
      color: theme.colors.textSecondary,
      fontSize: theme.typography.headingSm,
      fontWeight: '500',
      marginBottom: theme.spacing.sm,
    },
    body: {
      fontFamily: theme.typography.fontFamily,
      color: theme.colors.textSecondary,
      fontSize: theme.typography.body,
    },
    caption: {
      fontFamily: theme.typography.fontFamily,
      color: theme.colors.textMuted,
      fontSize: theme.typography.caption,
    },
  }) as StyleMap;
