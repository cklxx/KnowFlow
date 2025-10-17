import 'react-native-gesture-handler';
import { Platform } from 'react-native';

const bootstrap = async () => {
  const enableMocks = process.env.EXPO_PUBLIC_USE_MOCKS === 'true';

  if (enableMocks && typeof window !== 'undefined') {
    const { worker } = await import('./src/mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }

  if (Platform.OS === 'web') {
    const React = await import('react');
    const ReactDOM = await import('react-dom/client');
    const { AppProvider } = await import('./src/providers');
    const TodayScreen = (await import('./app/(tabs)/today')).default;

    const rootEl = document.getElementById('root');
    if (rootEl) {
      const root = ReactDOM.createRoot(rootEl);
      root.render(
        React.createElement(AppProvider, null, React.createElement(TodayScreen, null)),
      );
    }
    return;
  }

  await import('expo-router/entry');
};

void bootstrap();
