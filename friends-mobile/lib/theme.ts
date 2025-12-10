import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import { THEME_PALETTES, type ThemeColor, type FontFamily } from '@/store/useSettings';

export const createTheme = (
  themeColor: ThemeColor,
  fontFamily: FontFamily = 'System',
  isDark: boolean = false
): MD3Theme => {
  const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;
  const palette = THEME_PALETTES[themeColor];

  const fontConfig = {
    fontFamily: fontFamily === 'System' ? undefined : fontFamily,
  };

  return {
    ...baseTheme,
    fonts: configureFonts({ config: fontConfig }),
    colors: {
      ...baseTheme.colors,
      primary: palette.primary,
      primaryContainer: `${palette.primary}20`,
      secondary: palette.secondary,
      secondaryContainer: `${palette.secondary}15`,
      tertiary: palette.tertiary,
      tertiaryContainer: `${palette.tertiary}10`,
      surface: isDark ? '#1c1b1f' : '#ffffff',
      surfaceVariant: isDark ? '#49454f' : '#e7e0ec',
      background: isDark ? '#1c1b1f' : '#fafafa',
      error: '#ba1a1a',
      warning: '#ba7000ff',
      errorContainer: '#ffdad6',
      onPrimary: '#ffffff',
      onPrimaryContainer: isDark ? '#ffffff' : '#21005d',
      onSecondary: '#ffffff',
      onSecondaryContainer: isDark ? '#ffffff' : '#1d192b',
      onTertiary: '#ffffff',
      onTertiaryContainer: isDark ? '#ffffff' : '#31111d',
      onSurface: isDark ? '#e6e1e5' : '#1c1b1f',
      onSurfaceVariant: isDark ? '#cac4d0' : '#49454f',
      onError: '#ffffff',
      onErrorContainer: '#410e0b',
      onBackground: isDark ? '#e6e1e5' : '#1c1b1f',
      outline: isDark ? '#938f99' : '#79747e',
      outlineVariant: isDark ? '#49454f' : '#cac4d0',
      inverseSurface: isDark ? '#e6e1e5' : '#313033',
      inverseOnSurface: isDark ? '#1c1b1f' : '#f4eff4',
      inversePrimary: palette.primary,
      shadow: '#000000',
      scrim: '#000000',
      backdrop: 'rgba(0, 0, 0, 0.4)',
      elevation: {
        level0: 'transparent',
        level1: isDark ? '#2d2d2d' : '#f5f5f5',
        level2: isDark ? '#3a3a3a' : '#eeeeee',
        level3: isDark ? '#464646' : '#e8e8e8',
        level4: isDark ? '#4d4d4d' : '#e3e3e3',
        level5: isDark ? '#545454' : '#dedede',
      },
      surfaceDisabled: 'rgba(28, 27, 31, 0.12)',
      onSurfaceDisabled: 'rgba(28, 27, 31, 0.38)',
      // Custom colors
      medium: '#ff9800',
    } as any, // Cast to any to allow custom properties
  };
};
