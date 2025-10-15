import { StyleSheet, View } from 'react-native';

import { Text } from '@/ui/components/Text';
import { useTheme } from '@/providers';

export type Metric = {
  label: string;
  value: string;
};

type Props = {
  metrics: Metric[];
};

export const CardMetricList = ({ metrics }: Props) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {metrics.map((metric) => (
        <View
          key={metric.label}
          style={[
            styles.metric,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text variant="caption" style={{ color: theme.colors.textMuted }}>
            {metric.label}
          </Text>
          <Text variant="subtitle">{metric.value}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metric: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 120,
    gap: 4,
  },
});
