import { flexibleDateText, parseFlexibleDate } from '../dates';

const now = new Date(2026, 9, 9); // 2026-10-09

describe('flexibleDateText', () => {
  it('drops month/day for year precision', () => {
    expect(flexibleDateText(1990, 6, 15, 'year', now)).toBe('1990');
  });
  it('pads month and defaults it to the current month', () => {
    expect(flexibleDateText(1990, 3, null, 'month', now)).toBe('1990-03');
    expect(flexibleDateText(1990, null, null, 'month', now)).toBe('1990-10');
  });
  it('defaults day to today in the current month, else the 1st', () => {
    expect(flexibleDateText(2026, 10, null, 'day', now)).toBe('2026-10-09');
    expect(flexibleDateText(2025, 10, null, 'day', now)).toBe('2025-10-01');
  });
  it('clamps day to month length, incl. leap years', () => {
    expect(flexibleDateText(2024, 2, 31, 'day', now)).toBe('2024-02-29');
    expect(flexibleDateText(2023, 2, 31, 'day', now)).toBe('2023-02-28');
  });
  it('always round-trips through parseFlexibleDate', () => {
    for (const p of ['day', 'month', 'year'] as const) {
      expect(parseFlexibleDate(flexibleDateText(2024, 2, 30, p, now))).not.toBeNull();
    }
  });
});
