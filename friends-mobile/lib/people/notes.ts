/**
 * Appends a dated entry to a person's free-text notes (the same `people.notes`
 * column the edit form, search and exports use):
 *
 *   "Loves Italian food.\n\nSep 26, 2026 — Started a new job"
 *
 * A blank note leaves the notes unchanged (null when there are none).
 */
export function appendNote(
  existing: string | null | undefined,
  note: string,
  dateLabel: string
): string | null {
  const current = existing?.trim() ?? '';
  const entry = note.trim();
  if (!entry) return current || null;
  const dated = `${dateLabel} — ${entry}`;
  return current ? `${current}\n\n${dated}` : dated;
}
