import { Tabs } from 'expo-router';

import { useTheme } from '@/providers';

const PRIMARY_TABS = [
  { name: 'today', title: 'Today' },
  { name: 'tree', title: 'Tree' },
  { name: 'vault', title: 'Vault' },
  { name: 'search', title: 'Search' },
  { name: 'more', title: 'More' },
] as const;

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontSize: theme.typography.caption,
          fontFamily: theme.typography.fontFamily,
        },
      }}
    >
      {PRIMARY_TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
    </Tabs>
  );
}
