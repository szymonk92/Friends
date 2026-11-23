# 02 — Graph: one-finger pan fights the page ScrollView

**Status:** todo
**Depends on:** 01
**Priority:** P2 · **Effort:** S

## Goal
The graph sits inside a vertical `ScrollView` (`app/network.tsx`). A one-finger drag on the graph is claimed by both the RNGH Pan and the ScrollView; on device this can either scroll the page or pan the graph unpredictably.

## Tasks
- Verify behaviour on device.
- If it conflicts: make the graph fill the screen (details as a bottom sheet) **or** set `scrollEnabled={false}` while a graph gesture is active, **or** require 2 fingers to pan.

## Out of scope
Rewriting gestures onto Reanimated worklets.

## Open questions
Full-screen graph + bottom sheet is the cleaner UX — preferred?
