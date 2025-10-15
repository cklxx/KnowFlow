export type Palette = typeof light;

export const light = {
  background: '#F8FAFC',
  backgroundAlt: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',
  overlay: 'rgba(15, 23, 42, 0.08)',
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#94A3B8',
  accent: '#2563EB',
  accentMuted: '#1D4ED8',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
};

export const dark: Palette = {
  ...light,
  background: '#020617',
  backgroundAlt: '#0B1120',
  surface: '#0F172A',
  surfaceAlt: '#1E293B',
  border: '#1E293B',
  overlay: 'rgba(2, 6, 23, 0.7)',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5F5',
  textMuted: '#94A3B8',
};
