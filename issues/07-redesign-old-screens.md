# 07 — Redesign remaining old-style screens

**Status:** todo
**Depends on:** 04, 05, 06
**Priority:** P2 · **Effort:** L

## Goal
Bring the last Material-looking screens to fz.

## Tasks
- **BrainDumpSection** (shown in Add person + Edit person): Paper Card/Chip/IconButton, 16 `theme.colors.*` — biggest holdout on real screens
- **Settings**: AIConfiguration, AppearanceSettings, LanguageSelector (Card, List.Item, Menu, SegmentedButtons, opacity text) → `SettingsRow` component (also menu ×3)
- **review-extractions**: 5 Card, Chip, SegmentedButtons, 15 `Text variant`, opacity text
- **food-quiz**: QuizCard, QuizControls, QuizComplete, QuizProgress
- **person/[id] children**: PartnerBadge (`theme.colors.onSurface`), SocialLinksStrip (`IconButton` primary), PhotoBrowser (`IconButton`, hex)
- **(tabs)/index** Paper `Menu` (10 items) → ActionSheet/fz menu
- **menu**: 6 outlined Paper Buttons, `List.Item`
- **secrets/SecretsSetup**: 2 Paper Cards + warn colours

## Out of scope
dev, dev-logs, developer/playground (dev-only).
