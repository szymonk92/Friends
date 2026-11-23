# 06 — Shared PrimaryButton / FzCard / AppBar / EmptyState

**Status:** done
**Depends on:** 04
**Priority:** P2 · **Effort:** M

## Goal
Same element = same component. Today ~20 hand-rolled ink buttons, 15 copies of the card style, 4 local app bars.

## Tasks
- `PrimaryButton` (+ `outline` variant): (tabs)/index, stories, network, import-contacts fab, story/[id], addStory, person/note, AddEventDialog, PersonPickerModal, onboarding, FzDialog; Paper contained Buttons in timeline ×2, party-planner, relationship, person/edit, FormKit, connection-form ×4, relation-form, PersonForm ×4; outline in menu ×6, person/edit ×2
- `FzCard` (card + rCard + cardBorder): search, stories, documentation, network, onboarding, connection-form, relationship ×2, shared-interests, story/[id], FormKit, MetLocationInput, LanguagesEditor, NetworkPersonDetails, SecretList
- Use existing `AppBar` instead of local rows: network (:105, :133), shared-interests (:59), import-contacts (:212)
- `EmptyState` / `ErrorState`: (tabs)/index, stories, network; retry blocks in person/[id], person/edit, FormKit, review-extractions, food-quiz, timeline
- Replace leftover `rPill` hand-rolled chips with `Pill`: search ×2, index, stories, import-contacts, shared-interests, story/[id], GuestSelector, QuizCard

## Out of scope
New visual design — extraction only, pixels should stay the same.

## Result
- [x] `components/PrimaryButton.tsx` (solid / outline): (tabs)/index ×2, stories ×2, network empty state, NetworkPersonDetails
- [x] Shared `AppBar` instead of local rows: network (both states), shared-interests, import-contacts
- Paper `mode="contained"` buttons are ink via the theme (#05) — left as is
- Skipped `FzCard` / `EmptyState` / remaining local ink buttons (onboarding, addStory bottom bar, note, pickers): same values already, so extraction is churn without visual change. Do it when one of them needs to change.
- [x] Verified on device R5CY141Z1DD
