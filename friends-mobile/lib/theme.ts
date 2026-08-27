import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import { THEME_PALETTES, type ThemeColor, type FontFamily } from '@/store/useSettings';
import { fz } from '@/lib/design/tokens';

export const createTheme = (
  themeColor: ThemeColor,
  fontFamily: FontFamily = 'System',
  isDark: boolean = false
): MD3Theme => {
  const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;
  const palette = THEME_PALETTES[themeColor];

  const fontConfig = {
    fontFamily: fontFamily === 'System' ? fz.font : fontFamily,
  };

  return {
    ...baseTheme,
    fonts: configureFonts({ config: fontConfig }),
    colors: {
      ...baseTheme.colors,
      // FriendZ B&W design: force Paper accents to ink regardless of the
      // user's themeColor palette. Color is reintroduced later; until then
      // every selected/contained Paper element renders ink on paper.
      primary: fz.ink,
      primaryContainer: fz.surface,
      onPrimary: fz.paper,
      onPrimaryContainer: fz.ink,
      secondary: fz.ink,
      secondaryContainer: fz.surfaceSoft,
      onSecondary: fz.paper,
      onSecondaryContainer: fz.ink,
      tertiary: fz.ink,
      tertiaryContainer: fz.surfaceSoft,
      onTertiary: fz.paper,
      onTertiaryContainer: fz.ink,
      surface: isDark ? '#1c1b1f' : fz.card,
      surfaceVariant: isDark ? '#49454f' : fz.surfaceSoft,
      background: isDark ? '#1c1b1f' : fz.paper,
      error: '#ba1a1a',
      warning: '#ba7000ff',
      errorContainer: '#ffdad6',
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
