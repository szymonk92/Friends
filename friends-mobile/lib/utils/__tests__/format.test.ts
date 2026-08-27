import { getInitials } from '../format';

describe('getInitials', () => {
  it('takes first letter of up to two words', () => {
    expect(getInitials('Darek Banasiak')).toBe('DB');
    expect(getInitials('Cher')).toBe('C');
    expect(getInitials('a b c d')).toBe('AB');
  });

  it('skips emoji tokens when a real letter exists (no mojibake)', () => {
    expect(getInitials('Cheetos 🥔')).toBe('C');
    expect(getInitials('🥔 Cheetos')).toBe('C');
  });

  it('never emits a broken surrogate half', () => {
    // A well-formed code point spreads to >= U+10000; a lone surrogate stays in U+D800..U+DFFF.
    const hasLoneSurrogate = (s: string) =>
      [...s].some((cp) => {
        const n = cp.codePointAt(0)!;
        return n >= 0xd800 && n <= 0xdfff;
      });
    for (const name of ['🥔', '🐱 🐶', 'José', '👩‍👩‍👧 Family']) {
      expect(hasLoneSurrogate(getInitials(name))).toBe(false);
    }
  });

  it('handles empty / whitespace input', () => {
    expect(getInitials('')).toBe('');
    expect(getInitials('   ')).toBe('');
  });
});
