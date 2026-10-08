import { appendNote, parseNotes, entryText, replaceNote } from '../notes';

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

describe('parseNotes / replaceNote', () => {
  const notes = 'Old plain note\n\nSep 26, 2026 — Started a job\nin Berlin\n\nOct 1, 2026 — Moved';

  it('parses dated and undated entries with storage indexes', () => {
    expect(parseNotes(notes)).toEqual([
      { index: 0, date: null, body: 'Old plain note' },
      { index: 1, date: 'Sep 26, 2026', body: 'Started a job\nin Berlin' },
      { index: 2, date: 'Oct 1, 2026', body: 'Moved' },
    ]);
    expect(parseNotes(null)).toEqual([]);
  });

  it('edits one entry and keeps the others', () => {
    const text = entryText('Sep 26, 2026', 'New\n\n\ntext ');
    expect(text).toBe('Sep 26, 2026 — New\ntext');
    expect(replaceNote(notes, 1, text)).toBe(
      'Old plain note\n\nSep 26, 2026 — New\ntext\n\nOct 1, 2026 — Moved'
    );
  });

  it('deletes one entry, and returns null when the last is gone', () => {
    expect(replaceNote(notes, 0, null)).toBe('Sep 26, 2026 — Started a job\nin Berlin\n\nOct 1, 2026 — Moved');
    expect(replaceNote('only', 0, null)).toBeNull();
  });
});
