import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/providers';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'outline';
}>;

export const Card = ({ children, style, variant = 'elevated' }: Props) => {
  const { theme } = useTheme();

  const baseStyle = [
    styles.card,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.overlay,
    },
  ];

  const outlineStyle =
    variant === 'outline'
      ? {
          shadowOpacity: 0,
          shadowRadius: 0,
          elevation: 0,
        }
      : null;

  return <View style={[...baseStyle, outlineStyle, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
});
