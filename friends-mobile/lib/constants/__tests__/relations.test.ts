import { describe, it, expect } from '@jest/globals';
import { findDirectContradiction } from '../relations';

describe('findDirectContradiction', () => {
  const existing = (relationType: string, objectLabel: string, status = 'current') => [
    { relationType, objectLabel, status },
  ];

  it('blocks LIKES when DISLIKES already current', () => {
    expect(findDirectContradiction('LIKES', 'matcha', existing('DISLIKES', 'matcha'))).not.toBeNull();
  });

  it('ignores case + whitespace on the object label', () => {
    expect(findDirectContradiction('DISLIKES', '  Matcha ', existing('LIKES', 'matcha'))).not.toBeNull();
  });

  it('allows the same object when the old relation is past', () => {
    expect(findDirectContradiction('DISLIKES', 'sushi', existing('LIKES', 'sushi', 'past'))).toBeNull();
  });

  it('returns null for non-preference types (IS, HAS, …)', () => {
    expect(findDirectContradiction('IS', 'vegan', existing('IS', 'meat-eater'))).toBeNull();
  });

  it('returns null when nothing conflicts', () => {
    expect(findDirectContradiction('LIKES', 'hiking', existing('DISLIKES', 'crowds'))).toBeNull();
  });
});