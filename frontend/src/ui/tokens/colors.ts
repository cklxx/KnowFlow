export type Palette = typeof light;

export const light = {
  background: '#0F172A',
  backgroundAlt: '#111827',
  surface: '#1F2937',
  surfaceAlt: '#374151',
  border: '#334155',
  overlay: 'rgba(15, 23, 42, 0.6)',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5F5',
  textMuted: '#94A3B8',
  accent: '#38BDF8',
  accentMuted: '#0EA5E9',
  success: '#4ADE80',
  warning: '#FACC15',
  danger: '#F87171',
};

export const dark: Palette = {
  ...light,
  background: '#020617',
  surface: '#0F172A',
  surfaceAlt: '#1E293B',
  border: '#1E293B',
  textSecondary: '#E2E8F0',
  overlay: 'rgba(2, 6, 23, 0.6)',
};
