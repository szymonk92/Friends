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

export type NoteEntry = { index: number; date: string | null; body: string };

const DATED = /^([A-Z][a-z]{2} \d{1,2}, \d{4}) — ([\s\S]*)$/;

/** Splits the notes string into entries (blank-line separated); `index` is the storage position. */
export function parseNotes(notes: string | null | undefined): NoteEntry[] {
  const raw = notes?.trim();
  if (!raw) return [];
  return raw.split(/\n{2,}/).map((text, index) => {
    const m = DATED.exec(text);
    return m ? { index, date: m[1], body: m[2] } : { index, date: null, body: text };
  });
}

/** Rebuilds one entry's text, keeping its date. Blank lines would split it into two notes, so they collapse. */
export const entryText = (date: string | null, body: string) => {
  const clean = body.trim().replace(/\n{2,}/g, '\n');
  return date ? `${date} — ${clean}` : clean;
};

/** Replaces (text given) or removes (text null/blank) the entry at `index`; returns null when none are left. */
export function replaceNote(
  notes: string | null | undefined,
  index: number,
  text: string | null
): string | null {
  const parts = notes?.trim() ? notes.trim().split(/\n{2,}/) : [];
  if (text?.trim()) parts[index] = text.trim();
  else parts.splice(index, 1);
  return parts.length ? parts.join('\n\n') : null;
}
