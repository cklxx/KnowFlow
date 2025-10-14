import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/ui/components/Text';

export default function NotFound() {
  return (
    <View style={styles.container}>
      <Text variant="title">Screen not found</Text>
      <Text style={styles.copy}>Check the route name or head back to Today.</Text>
      <Link href="/(tabs)/today">
        <Text variant="subtitle">Go to Today</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  copy: {
    textAlign: 'center',
    marginBottom: 24,
  },
});
