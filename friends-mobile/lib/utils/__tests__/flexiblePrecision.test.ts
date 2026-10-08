import { flexiblePrecision, parseFlexibleDate, toFlexibleText } from '../dates';

describe('flexible date precision', () => {
  it('detects precision from the typed text', () => {
    expect(flexiblePrecision('')).toBeNull();
    expect(flexiblePrecision('1990')).toBe('year');
    expect(flexiblePrecision('1990-06')).toBe('month');
    expect(flexiblePrecision('1990-06-15')).toBe('day');
  });

  it('round-trips partial dates without inventing the 1st', () => {
    for (const text of ['1990', '1990-06', '1990-06-15']) {
      const d = parseFlexibleDate(text)!;
      expect(toFlexibleText(d, flexiblePrecision(text))).toBe(text);
    }
  });

  it('treats null precision (legacy rows) as an exact day', () => {
    expect(toFlexibleText(new Date(1990, 5, 15), null)).toBe('1990-06-15');
  });
});
