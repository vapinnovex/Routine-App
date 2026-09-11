import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, type ColorSchemeName } from 'react-native';

import { darkColors, lightColors, type ColorTokens } from '@/constants/theme';
import { useUserStore } from '@/store/userStore';

interface ThemeContextValue {
  scheme: 'light' | 'dark';
  colors: ColorTokens;
}

const ThemeContext = createContext<ThemeContextValue>({
  scheme: 'light',
  colors: lightColors,
});

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const preference = useUserStore((state) => state.user?.preferences.theme ?? 'system');
  const [system, setSystem] = useState<ColorSchemeName>(Appearance.getColorScheme() ?? 'light');

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystem(colorScheme));
    return () => sub.remove();
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
    return {
      scheme,
      colors: scheme === 'dark' ? darkColors : lightColors,
    };
  }, [preference, system]);

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
