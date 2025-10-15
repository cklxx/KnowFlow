import { ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/ui/components/Screen';
import { Text } from '@/ui/components/Text';
import { TodaysStack } from '@/features/today';

export default function TodayScreen() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="title">Today</Text>
        <View style={styles.content}>
          <TodaysStack />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: 16,
    paddingBottom: 24,
  },
  content: {
    gap: 16,
  },
});
