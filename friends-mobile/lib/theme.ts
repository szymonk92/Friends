import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import type { FontFamily } from '@/store/useSettings';
import { fz } from '@/lib/design/tokens';

export const createTheme = (
  fontFamily: FontFamily = 'System',
  isDark: boolean = false
): MD3Theme => {
  const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;

  const fontConfig = {
    fontFamily: fontFamily === 'System' ? fz.font : fontFamily,
  };

  return {
    ...baseTheme,
    fonts: configureFonts({ config: fontConfig }),
    colors: {
      ...baseTheme.colors,
      // FriendZ B&W design: Paper accents are ink on paper. Color is reintroduced later.
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
      error: fz.danger,
      warning: fz.warn,
      errorContainer: fz.dangerBg,
      onSurface: isDark ? '#e6e1e5' : fz.ink,
      onSurfaceVariant: isDark ? '#cac4d0' : fz.textBody,
      onError: '#ffffff',
      onErrorContainer: '#410e0b',
      onBackground: isDark ? '#e6e1e5' : fz.ink,
      outline: isDark ? '#938f99' : fz.outline,
      outlineVariant: isDark ? '#49454f' : fz.hairline,
      inverseSurface: isDark ? '#e6e1e5' : fz.ink,
      inverseOnSurface: isDark ? '#1c1b1f' : '#f4eff4',
      inversePrimary: fz.surface,
      shadow: '#000000',
      scrim: '#000000',
      backdrop: 'rgba(0, 0, 0, 0.4)',
      elevation: {
        level0: 'transparent',
        // Paper Dialog/Card/Menu surfaces: white fz cards instead of MD3 greys.
        level1: isDark ? '#2d2d2d' : fz.card,
        level2: isDark ? '#3a3a3a' : fz.card,
        level3: isDark ? '#464646' : fz.card,
        level4: isDark ? '#4d4d4d' : fz.card,
        level5: isDark ? '#545454' : fz.card,
      },
      surfaceDisabled: 'rgba(28, 27, 31, 0.12)',
      onSurfaceDisabled: 'rgba(28, 27, 31, 0.38)',
      // Custom colors
      medium: fz.warn,
    } as any, // Cast to any to allow custom properties
  };
};
