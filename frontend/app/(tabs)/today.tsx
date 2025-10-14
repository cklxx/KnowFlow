import { Screen } from '@/ui/components/Screen';
import { Text } from '@/ui/components/Text';
import { TodaysStack } from '@/features/today';
import { View, StyleSheet } from 'react-native';

export default function TodayScreen() {
  return (
    <Screen>
      <Text variant="title">Today</Text>
      <View style={styles.content}>
        <TodaysStack />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
});
