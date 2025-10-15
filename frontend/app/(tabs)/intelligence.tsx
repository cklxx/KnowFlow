import { StyleSheet, View } from 'react-native';

import { IntelligenceChat } from '@/features/intelligence';
import { Screen } from '@/ui/components/Screen';

export default function IntelligenceScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <IntelligenceChat />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
