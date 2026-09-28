import { appendNote } from '../notes';

describe('appendNote', () => {
  it('starts the notes with a dated entry when there are none', () => {
    expect(appendNote(null, 'Loves ice cream', 'Sep 26, 2026')).toBe(
      'Sep 26, 2026 — Loves ice cream'
    );
    expect(appendNote('   ', 'Loves ice cream', 'Sep 26, 2026')).toBe(
      'Sep 26, 2026 — Loves ice cream'
    );
  });

  it('appends after existing notes, separated by a blank line', () => {
    expect(appendNote('Met at university.', 'New job at Google', 'Sep 26, 2026')).toBe(
      'Met at university.\n\nSep 26, 2026 — New job at Google'
    );
  });

  it('trims the new note and the existing notes', () => {
    expect(appendNote('Old note\n\n', '  multi\nline  ', 'Jan 1, 2026')).toBe(
      'Old note\n\nJan 1, 2026 — multi\nline'
    );
  });

  it('leaves the notes unchanged when the new note is blank', () => {
    expect(appendNote('Existing', '   ', 'Jan 1, 2026')).toBe('Existing');
    expect(appendNote(null, '', 'Jan 1, 2026')).toBeNull();
    expect(appendNote(undefined, '\n', 'Jan 1, 2026')).toBeNull();
  });
});
