import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/providers';
import { Text } from './Text';

export type SegmentOption = {
  value: string;
  label: string;
  description?: string;
};

type Props = {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
};

export const SegmentedControl = ({ options, value, onChange }: Props) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              {
                backgroundColor: active ? theme.colors.surface : 'transparent',
                borderColor: active ? theme.colors.accent : 'transparent',
              },
            ]}
          >
            <Text
              variant="caption"
              style={{
                color: active ? theme.colors.accent : theme.colors.textSecondary,
                fontWeight: active ? '600' : '500',
              }}
            >
              {option.label}
            </Text>
            {option.description ? (
              <Text variant="caption" style={{ color: theme.colors.textMuted }}>
                {option.description}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 2,
  },
});
