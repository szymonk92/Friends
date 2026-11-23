# 07 — Redesign remaining old-style screens

**Status:** in-progress
**Depends on:** 04, 05, 06
**Priority:** P2 · **Effort:** L

## Goal
Bring the last Material-looking screens to fz.

## Tasks
- [x] **BrainDumpSection** (Add + Edit person): Paper outlined Card → fz card, 3× Paper Chip → Pill, title in fzText (theme colours now fz via #05)
- **Settings**: AIConfiguration, AppearanceSettings, LanguageSelector (Card, List.Item, Menu, SegmentedButtons, opacity text) → `SettingsRow` component (also menu ×3)
- **review-extractions**: 5 Card, Chip, SegmentedButtons, 15 `Text variant`, opacity text
- **food-quiz**: QuizCard, QuizControls, QuizComplete, QuizProgress
- **person/[id] children**: PartnerBadge (`theme.colors.onSurface`), SocialLinksStrip (`IconButton` primary), PhotoBrowser (`IconButton`, hex)
- **(tabs)/index** Paper `Menu` (10 items) → ActionSheet/fz menu
- **menu**: 6 outlined Paper Buttons, `List.Item`
- **secrets/SecretsSetup**: 2 Paper Cards + warn colours

## Out of scope
dev, dev-logs, developer/playground (dev-only).

## Progress
- Paper Card/List/Menu/SegmentedButtons on the remaining screens already pick up fz colours from the theme fix in #05 (white surfaces, ink text, fz outlines).
- Remaining structural redesign (settings sub-components, review-extractions, food-quiz, menu, home ⋮ menu, person children) should be done screen-by-screen with device feedback.
