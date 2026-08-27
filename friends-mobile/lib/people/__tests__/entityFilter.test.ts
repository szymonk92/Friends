import { describe, it, expect } from '@jest/globals';
import { entityConstraintFor } from '../entityFilter';

describe('entityConstraintFor', () => {
  it('defaults to "person" when filter is undefined', () => {
    expect(entityConstraintFor(undefined)).toBe('person');
  });

  it('returns "person" for explicit "person"', () => {
    expect(entityConstraintFor('person')).toBe('person');
  });

  it('returns "pet" for "pet"', () => {
    expect(entityConstraintFor('pet')).toBe('pet');
  });

  it('returns null (no constraint) for "all"', () => {
    expect(entityConstraintFor('all')).toBeNull();
  });
});
