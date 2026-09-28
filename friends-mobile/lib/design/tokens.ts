// FriendZ design system — neutral / B&W "Circle" language.
// Source of truth: claude.ai/design "FriendZ App.dc.html".
// Color comes later; everything is ink-on-paper for now.

export const fz = {
  // Core palette
  ink: '#1B1815', // near-black, primary text + fills
  paper: '#FBFAF7', // app background
  surface: '#F1EDE5', // warm chip / icon-circle fill
  surfaceSoft: '#F4F1EA', // softer chip fill (list row, tag)
  card: '#FFFFFF', // card background
  cardBorder: '#ECE7DD', // card border
  hairline: '#E7E2D8', // timeline rule, dividers
  // Text scale (muted → strong)
  textMute: '#928C81', // subtitle
  textMute2: '#A29C90', // section meta
  textMute3: '#8A857C',
  textBody: '#6E685E', // body copy
  textLabel: '#1B1815', // uppercase labels (= ink)
  textStrong2: '#5C564C', // chip text on surface
  textDim: '#B7B1A6', // timestamps
  // Borders / outlines
  outline: '#DAD4C8', // outlined chip border
  outlineDim: '#CFC9BD',
  line: '#C2BBAF', // graph edges
  lineDim: '#DED8CC',
  // Radii
  rPill: 999,
  rCard: 18,
  rRow: 16,
  rButton: 16,
  rIcon: 13,
  rPhone: 37,
  // Spacing
  s: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 18,
    xxl: 22,
    edge: 22, // screen edge padding
  },
  // Typography — Space Grotesk variable font (loaded in app _layout)
  font: 'SpaceGrotesk',
} as const;

// Type presets. RN fontWeight maps onto the Space Grotesk variable axis.
export const fzText = {
  title: { fontFamily: fz.font, fontWeight: '600', fontSize: 22, letterSpacing: -0.4, color: fz.ink },
  titleLg: { fontFamily: fz.font, fontWeight: '600', fontSize: 25, letterSpacing: -0.5, color: fz.ink },
  screenTitle: { fontFamily: fz.font, fontWeight: '600', fontSize: 20, letterSpacing: -0.4, color: fz.ink },
  body: { fontFamily: fz.font, fontWeight: '400', fontSize: 13.5, color: fz.textBody, lineHeight: 20 },
  name: { fontFamily: fz.font, fontWeight: '600', fontSize: 16, color: fz.ink },
  sub: { fontFamily: fz.font, fontWeight: '400', fontSize: 13, color: fz.textMute },
  meta: { fontFamily: fz.font, fontWeight: '400', fontSize: 13, color: fz.textMute2 },
  time: { fontFamily: fz.font, fontWeight: '500', fontSize: 12, color: fz.textDim },
  label: { fontFamily: fz.font, fontWeight: '600', fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: fz.textLabel },
  chip: { fontFamily: fz.font, fontWeight: '500', fontSize: 13, color: fz.textStrong2 },
  chipOn: { fontFamily: fz.font, fontWeight: '500', fontSize: 13, color: '#FFFFFF' },
  chipSolid: { fontFamily: fz.font, fontWeight: '500', fontSize: 13, color: fz.ink },
  // Full-width action buttons (Save, Add note, ...) — design uses 15-15.5px 600.
  btn: { fontFamily: fz.font, fontWeight: '600', fontSize: 15, color: '#FFFFFF' },
  btnOutline: { fontFamily: fz.font, fontWeight: '600', fontSize: 15, color: fz.ink },
} as const;