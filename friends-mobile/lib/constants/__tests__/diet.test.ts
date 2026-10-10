import { describe, it, expect } from '@jest/globals';
import { activeDietKeys, dietChanges } from '../relations';

const rows = [
  { id: 'a', relationType: 'IS', objectLabel: ' Vegetarian ', status: 'current' },
  { id: 'b', relationType: 'AVOIDS', objectLabel: 'alcohol', status: null },
  { id: 'c', relationType: 'IS', objectLabel: 'vegan', status: 'past' },
];

describe('diet presets', () => {
  it('detects current matches case-insensitively, ignores past', () => {
    expect(activeDietKeys(rows)).toEqual(['vegetarian', 'noAlcohol']);
  });

  it('creates toggled-on and deletes only toggled-off rows', () => {
    const { toCreate, toDeleteIds } = dietChanges(
      ['vegetarian', 'noAlcohol'],
      ['noAlcohol', 'glutenFree'],
      rows
    );
    expect(toCreate.map((p) => p.key)).toEqual(['glutenFree']);
    expect(toDeleteIds).toEqual(['a']);
  });

  it('no toggles → no writes', () => {
    expect(dietChanges(['vegetarian'], ['vegetarian'], rows)).toEqual({ toCreate: [], toDeleteIds: [] });
  });
});
