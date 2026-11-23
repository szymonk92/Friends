# 09 — Dates shift one day in UTC+ (Poland): met date, exports, brain-dump diff

**Status:** done
**Depends on:** none
**Priority:** P1 · **Effort:** S

## Goal
Local-midnight dates are formatted with `toISOString().split('T')[0]` → previous day in UTC+. Met date loses a day on every open+save (`app/person/edit.tsx:52`); year-only 2020 shows 2019-12-31. Same in CSV export (`hooks/useDataExport.ts:369-370`), Obsidian export (`lib/export/obsidianTemplates.ts:45`), brain-dump diff (`lib/ai/brain-dump-diff.ts:110`) → false conflicts.

## Tasks
- Use `toDateText` / `toFlexibleText` from `lib/utils/dates.ts` everywhere
- Grep for remaining `toISOString().split` on local dates; add a test with a UTC+ date

## Out of scope
Changing storage format.
