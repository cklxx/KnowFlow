import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/providers';

import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type Props = PropsWithChildren<{
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: Props) => {
  const { theme } = useTheme();

  const isDisabled = disabled || loading;

  const backgroundColor = (() => {
    if (variant === 'primary') {
      return isDisabled ? `${theme.colors.accent}33` : theme.colors.accent;
    }
    if (variant === 'secondary') {
      return theme.colors.surface;
    }
    return 'transparent';
  })();

  const borderColor = (() => {
    if (variant === 'secondary') {
      return theme.colors.border;
    }
    if (variant === 'ghost') {
      return 'transparent';
    }
    return theme.colors.accent;
  })();

  const textColor = (() => {
    if (variant === 'primary') {
      return theme.colors.surface;
    }
    if (variant === 'secondary') {
      return theme.colors.textSecondary;
    }
    return theme.colors.accent;
  })();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor,
          opacity: pressed && !isDisabled ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator size="small" color={textColor} /> : null}
        <Text
          style={{
            color: textColor,
            fontWeight: '600',
          }}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
