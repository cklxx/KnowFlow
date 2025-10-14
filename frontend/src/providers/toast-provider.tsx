import type { PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Text } from '@/ui/components/Text';
import { useTheme } from '@/providers/theme-provider';

type ToastVariant = 'success' | 'error' | 'info';

export type ToastOptions = {
  message: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  showToast: (options: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_DURATION = 3000;

export const ToastProvider = ({ children }: PropsWithChildren) => {
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const opacity = useMemo(() => new Animated.Value(0), []);
  const { theme } = useTheme();
  const queueRef = useRef<ToastOptions[]>([]);
  const isShowingRef = useRef(false);

  const showNext = useCallback(() => {
    if (isShowingRef.current) {
      return;
    }

    const next = queueRef.current.shift();
    if (next) {
      isShowingRef.current = true;
      setToast({ ...next, id: Date.now() });
    } else {
      setToast(null);
    }
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    queueRef.current.push(options);
    showNext();
  }, [showNext]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    Animated.timing(opacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();

    const timeout = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          isShowingRef.current = false;
          setToast(null);
          showNext();
        }
      });
    }, TOAST_DURATION);

    return () => clearTimeout(timeout);
  }, [toast, opacity, showNext]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const background = toast?.variant === 'error'
    ? theme.colors.danger
    : toast?.variant === 'success'
      ? theme.colors.success
      : theme.colors.surfaceAlt;
  const textColor = toast?.variant ? theme.colors.background : theme.colors.textSecondary;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={styles.container}>
          <Animated.View style={[styles.toast, { opacity, backgroundColor: background }]}
          >
            <Text variant="body" style={{ color: textColor }}>
              {toast.message}
            </Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 32,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  toast: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
