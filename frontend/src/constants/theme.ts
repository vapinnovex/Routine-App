export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  full: 999,
} as const;

export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700' as const },
  heading: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const },
  subheading: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '600' as const },
} as const;

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceMuted: string;
  primary: string;
  primaryMuted: string;
  secondary: string;
  textPrimary: string;
  textSecondary: string;
  textInverse: string;
  success: string;
  warning: string;
  danger: string;
  border: string;
  overlay: string;
  streak: string;
  heatmap0: string;
  heatmap1: string;
  heatmap2: string;
  heatmap3: string;
  heatmap4: string;
}

export const lightColors: ColorTokens = {
  background: '#F4EFE8',
  surface: '#FFFBF6',
  surfaceMuted: '#EBE3D8',
  primary: '#E05A33',
  primaryMuted: '#F6D4C8',
  secondary: '#2F6F6A',
  textPrimary: '#1C1917',
  textSecondary: '#6B645C',
  textInverse: '#FFFBF6',
  success: '#2F7D57',
  warning: '#C47B17',
  danger: '#C2413B',
  border: '#E4DBD0',
  overlay: 'rgba(28, 25, 23, 0.45)',
  streak: '#E05A33',
  heatmap0: '#E8E0D6',
  heatmap1: '#F3C7B6',
  heatmap2: '#E89272',
  heatmap3: '#E05A33',
  heatmap4: '#9F3318',
};

export const darkColors: ColorTokens = {
  background: '#12110F',
  surface: '#1C1A17',
  surfaceMuted: '#2A2622',
  primary: '#F07A58',
  primaryMuted: '#4A2A22',
  secondary: '#7EC4BE',
  textPrimary: '#F5F0EA',
  textSecondary: '#A89F94',
  textInverse: '#1C1917',
  success: '#5BBF8A',
  warning: '#E0B05A',
  danger: '#E06A64',
  border: '#322E2A',
  overlay: 'rgba(0, 0, 0, 0.55)',
  streak: '#F07A58',
  heatmap0: '#2A2622',
  heatmap1: '#4A2A22',
  heatmap2: '#8A4A34',
  heatmap3: '#F07A58',
  heatmap4: '#FFB198',
};

export const timerImmersive = {
  activityBg: '#161311',
  breakBg: '#12171A',
  text: '#F7F1EA',
  muted: '#B7AFA6',
  accent: '#F07A58',
  breakAccent: '#7EC4BE',
};
