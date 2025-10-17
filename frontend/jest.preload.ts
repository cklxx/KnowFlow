import type { ReactNode } from 'react';
import { NativeModules } from 'react-native';

jest.mock('react-native-gesture-handler', () => {
  const actual = jest.requireActual('react-native-gesture-handler');
  return {
    ...actual,
    GestureHandlerRootView: ({ children }: { children: ReactNode }) => children,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const SafeAreaProvider = ({ children }: { children: ReactNode }) => children;
  const SafeAreaView = ({ children }: { children: ReactNode }) => children;
  return {
    SafeAreaProvider,
    SafeAreaView,
    SafeAreaInsetsContext: { Provider: SafeAreaProvider, Consumer: () => null },
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

NativeModules.NativeUnimoduleProxy =
  NativeModules.NativeUnimoduleProxy ?? {
    modulesConstants: {},
    viewManagersNames: [],
    viewManagersMetadata: {},
  };

NativeModules.ExponentFileSystem = NativeModules.ExponentFileSystem ?? {};
