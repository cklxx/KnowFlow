import { StyleSheet, View } from 'react-native';

import { Text } from '@/ui/components/Text';
import { useTodayDigest } from '../hooks';
import { useTheme } from '@/providers';

export const TodaysStack = () => {
  const { direction, cards } = useTodayDigest();
  const { theme } = useTheme();

  if (!direction) {
    return <Text>No directions yet. Start by defining your focus areas.</Text>;
  }

  return (
    <View style={styles.container}>
      <Text variant="subtitle">Focus: {direction.name}</Text>
      {cards.length === 0 ? (
        <Text>No cards scheduled for review. Import content or create a card.</Text>
      ) : (
        cards.map((card) => (
          <View
            key={card.id}
            style={[
              styles.card,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
            ]}
          >
            <Text variant="subtitle">{card.title}</Text>
            <Text variant="caption">{card.card_type}</Text>
            <Text>{card.body}</Text>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
});
