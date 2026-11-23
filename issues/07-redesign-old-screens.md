# 07 — Redesign remaining old-style screens

**Status:** done
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

## Progress (all code done; device check pending)
- [x] BrainDumpSection
- [x] Settings: Appearance / Language → Pill groups; AIConfiguration → one data-driven provider section (FormSection + PrimaryButton + FormInput)
- [x] menu screen + ExportImport: PrimaryButton outline, plain About rows (no List.Item)
- [x] Home ⋮ menu: Paper `Menu` → `ActionSheet`
- [x] review-extractions: FormSection cards, Pill chips, PillGroup intensity, PrimaryButton
- [x] food-quiz: QuizCard/Complete/Progress/Controls, PrimaryButton, Pill, own progress bar
- [x] person children: PartnerBadge, SocialLinksStrip (fz colours). PhotoBrowser left as is: dark photo overlay, white/green on black is intentional
- [x] SecretsSetup: FormSection + PrimaryButton (password dialog stays Paper Dialog, themed by #05)
- [ ] Verify on device: Settings, Menu, Home ⋮ sheet, Review extractions (also the edit dialog), Food quiz (swipe still works), Secrets setup
