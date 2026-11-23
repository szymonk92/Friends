import { storyPeople, suggestConnections } from '../suggestions';

describe('suggestConnections', () => {
  const active = new Set(['ann', 'bob', 'cat', 'dan']);

  it('ranks co-mentioned pairs by shared stories and skips existing connections', () => {
    const stories = [['ann', 'bob', 'cat'], ['ann', 'bob'], ['bob', 'cat'], ['cat', 'ann', 'ann']];
    const out = suggestConnections(stories, [{ person1Id: 'cat', person2Id: 'bob' }], active);
    expect(out[0]).toEqual({ a: 'ann', b: 'bob', sharedStories: 2 });
    expect(out[1]).toEqual({ a: 'ann', b: 'cat', sharedStories: 2 });
    expect(out.find((s) => [s.a, s.b].includes('bob') && [s.a, s.b].includes('cat'))).toBeUndefined();
  });

  it('ignores deleted people and single-person stories', () => {
    expect(suggestConnections([['ann', 'ghost'], ['dan']], [], active)).toEqual([]);
  });
});

describe('storyPeople', () => {
  it('prefers peopleIds, falls back to known people in extractedData', () => {
    expect(storyPeople({ peopleIds: '["a","b"]', extractedData: null })).toEqual(['a', 'b']);
    const extracted = JSON.stringify({ people: [{ id: 'a', isNew: false }, { id: 'tmp1', isNew: true }] });
    expect(storyPeople({ peopleIds: null, extractedData: extracted })).toEqual(['a']);
  });
});
