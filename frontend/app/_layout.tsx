import { Stack } from 'expo-router';

import { AppProvider } from '@/providers';

export default function RootLayout() {
  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ presentation: 'modal' }} />
        <Stack.Screen name="cards/[id]" />
        <Stack.Screen name="import" />
        <Stack.Screen name="settings" />
      </Stack>
    </AppProvider>
  );
}
