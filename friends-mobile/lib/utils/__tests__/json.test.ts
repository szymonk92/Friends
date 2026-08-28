import { parseJsonArray, parseJsonObject } from '../json';

describe('parseJsonArray', () => {
  it('parses a JSON array', () => {
    expect(parseJsonArray('["a","b"]')).toEqual(['a', 'b']);
  });

  it('falls back to [] for null / empty / malformed / non-array', () => {
    expect(parseJsonArray(null)).toEqual([]);
    expect(parseJsonArray(undefined)).toEqual([]);
    expect(parseJsonArray('')).toEqual([]);
    expect(parseJsonArray('{not json')).toEqual([]);
    expect(parseJsonArray('{"a":1}')).toEqual([]);
  });
});

describe('parseJsonObject', () => {
  const fallback = { a: 1, b: 2 };

  it('merges parsed object over the fallback', () => {
    expect(parseJsonObject('{"b":9,"c":3}', fallback)).toEqual({ a: 1, b: 9, c: 3 });
  });

  it('returns the fallback for null / malformed / array / primitive', () => {
    expect(parseJsonObject(null, fallback)).toBe(fallback);
    expect(parseJsonObject('nope', fallback)).toBe(fallback);
    expect(parseJsonObject('[1,2]', fallback)).toBe(fallback);
    expect(parseJsonObject('42', fallback)).toBe(fallback);
  });
});
