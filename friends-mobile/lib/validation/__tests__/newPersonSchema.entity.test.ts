import { describe, it, expect } from '@jest/globals';
import { newPersonSchema, entityTypeEnum } from '../schemas';

describe('newPersonSchema — entity fields', () => {
  it('defaults entityType to "person" when omitted', () => {
    const parsed = newPersonSchema.parse({ name: 'Jane Doe' });
    expect(parsed.entityType).toBe('person');
  });

  it('accepts entityType "pet" with a species', () => {
    const parsed = newPersonSchema.parse({ name: 'Rex', entityType: 'pet', species: 'Dog' });
    expect(parsed.entityType).toBe('pet');
    expect(parsed.species).toBe('Dog');
  });

  it('rejects an unknown entityType', () => {
    expect(() => newPersonSchema.parse({ name: 'Rex', entityType: 'robot' as never })).toThrow();
  });

  it('rejects a species longer than 40 characters', () => {
    expect(() =>
      newPersonSchema.parse({ name: 'Rex', entityType: 'pet', species: 'x'.repeat(41) })
    ).toThrow();
  });

  it('entityTypeEnum exposes exactly person and pet', () => {
    expect(entityTypeEnum.options).toEqual(['person', 'pet']);
  });
});
