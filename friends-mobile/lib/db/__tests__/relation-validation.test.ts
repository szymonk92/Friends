import { describe, it, expect } from '@jest/globals';

describe('Relation Validation', () => {
  describe('Relation Types', () => {
    it('should accept valid relationship relation types', () => {
      const validTypes = [
        'friend',
        'family',
        'colleague',
        'acquaintance',
        'partner',
        'mentor',
        'mentee',
      ];

      validTypes.forEach((type) => {
        expect(isValidRelationType(type)).toBe(true);
      });
    });

    it('should accept valid preference relation types', () => {
      const validTypes = ['likes', 'dislikes', 'loves', 'hates', 'wants', 'needs'];

      validTypes.forEach((type) => {
        expect(isValidRelationType(type)).toBe(true);
      });
    });

    it('should accept valid knowledge relation types', () => {
      const validTypes = ['knows', 'worksAt', 'livesIn', 'studiedAt'];

      validTypes.forEach((type) => {
        expect(isValidRelationType(type)).toBe(true);
      });
    });

    it('should reject invalid relation types', () => {
      const invalidTypes = ['invalid', 'unknown', '', null, undefined, 123];

      invalidTypes.forEach((type) => {
        expect(isValidRelationType(type as any)).toBe(false);
      });
    });
  });

  describe('Confidence Score Validation', () => {
    it('should accept valid confidence scores', () => {
      const validScores = [0.0, 0.5, 0.75, 0.9, 1.0];

      validScores.forEach((score) => {
        expect(isValidConfidence(score)).toBe(true);
      });
    });

    it('should reject confidence scores below 0', () => {
      const invalidScores = [-0.1, -1.0, -100];

      invalidScores.forEach((score) => {
        expect(isValidConfidence(score)).toBe(false);
      });
    });

    it('should reject confidence scores above 1', () => {
      const invalidScores = [1.1, 2.0, 100];

      invalidScores.forEach((score) => {
        expect(isValidConfidence(score)).toBe(false);
      });
    });

    it('should reject non-numeric confidence scores', () => {
      const invalidScores = ['0.5', null, undefined, NaN, Infinity];

      invalidScores.forEach((score) => {
        expect(isValidConfidence(score as any)).toBe(false);
      });
    });
  });

  describe('Required Fields Validation', () => {
    it('should require subjectId', () => {
      const invalidRelations = [
        { relationType: 'friend', objectLabel: 'John' },
        { subjectId: '', relationType: 'friend', objectLabel: 'John' },
        { subjectId: null, relationType: 'friend', objectLabel: 'John' },
      ];

      invalidRelations.forEach((relation) => {
        expect(hasRequiredFields(relation as any)).toBe(false);
      });
    });

    it('should require relationType', () => {
      const invalidRelations = [
        { subjectId: 'person-1', objectLabel: 'John' },
        { subjectId: 'person-1', relationType: '', objectLabel: 'John' },
        { subjectId: 'person-1', relationType: null, objectLabel: 'John' },
      ];

      invalidRelations.forEach((relation) => {
        expect(hasRequiredFields(relation as any)).toBe(false);
      });
    });

    it('should require objectLabel', () => {
      const invalidRelations = [
        { subjectId: 'person-1', relationType: 'friend' },
        { subjectId: 'person-1', relationType: 'friend', objectLabel: '' },
        { subjectId: 'person-1', relationType: 'friend', objectLabel: null },
      ];

      invalidRelations.forEach((relation) => {
        expect(hasRequiredFields(relation as any)).toBe(false);
      });
    });

    it('should accept valid relation with all required fields', () => {
      const validRelation = {
        subjectId: 'person-1',
        relationType: 'friend',
        objectLabel: 'John Doe',
      };

      expect(hasRequiredFields(validRelation)).toBe(true);
    });

    it('should accept valid relation with optional fields', () => {
      const validRelation = {
        subjectId: 'person-1',
        relationType: 'likes',
        objectLabel: 'Pizza',
        category: 'food',
        confidence: 0.9,
        status: 'current',
      };

      expect(hasRequiredFields(validRelation)).toBe(true);
    });
  });

  describe('Category Validation', () => {
    it('should accept valid preference categories', () => {
      const validCategories = ['food', 'music', 'movies', 'sports', 'hobbies', 'books', 'travel'];

      validCategories.forEach((category) => {
        expect(isValidCategory(category)).toBe(true);
      });
    });

    it('should allow null or undefined category for non-preference relations', () => {
      expect(isValidCategory(null)).toBe(true);
      expect(isValidCategory(undefined)).toBe(true);
      expect(isValidRelation({ relationType: 'friend', category: null })).toBe(true);
    });
  });

  describe('Status Validation', () => {
    it('should accept valid status values', () => {
      const validStatuses = ['current', 'past', 'future', 'aspiration'];

      validStatuses.forEach((status) => {
        expect(isValidStatus(status)).toBe(true);
      });
    });

    it('should reject invalid status values', () => {
      const invalidStatuses = ['active', 'inactive', '', null, 123];

      invalidStatuses.forEach((status) => {
        expect(isValidStatus(status as any)).toBe(false);
      });
    });
  });

  describe('Complete Relation Validation', () => {
    it('should validate a complete valid relation', () => {
      const validRelation = {
        subjectId: 'person-1',
        relationType: 'friend',
        objectLabel: 'John Doe',
        confidence: 0.95,
        status: 'current',
        source: 'manual',
      };

      const validation = validateRelation(validRelation);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should return errors for invalid relation', () => {
      const invalidRelation = {
        subjectId: '',
        relationType: 'invalid-type',
        objectLabel: '',
        confidence: 1.5,
        status: 'unknown',
      };

      const validation = validateRelation(invalidRelation as any);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});

// Validation helper functions
function isValidRelationType(type: string): boolean {
  const validTypes = [
    // Relationships
    'friend',
    'family',
    'colleague',
    'acquaintance',
    'partner',
    'mentor',
    'mentee',
    // Preferences
    'likes',
    'dislikes',
    'loves',
    'hates',
    'wants',
    'needs',
    // Knowledge
    'knows',
    'worksAt',
    'livesIn',
    'studiedAt',
  ];
  return typeof type === 'string' && validTypes.includes(type);
}

function isValidConfidence(score: number): boolean {
  return typeof score === 'number' && !isNaN(score) && isFinite(score) && score >= 0 && score <= 1;
}

function hasRequiredFields(relation: any): boolean {
  return !!(
    relation &&
    relation.subjectId &&
    typeof relation.subjectId === 'string' &&
    relation.subjectId.trim().length > 0 &&
    relation.relationType &&
    typeof relation.relationType === 'string' &&
    relation.relationType.trim().length > 0 &&
    relation.objectLabel &&
    typeof relation.objectLabel === 'string' &&
    relation.objectLabel.trim().length > 0
  );
}

function isValidCategory(category: string | null | undefined): boolean {
  if (category === null || category === undefined) return true;

  const validCategories = ['food', 'music', 'movies', 'sports', 'hobbies', 'books', 'travel'];
  return typeof category === 'string' && validCategories.includes(category);
}

function isValidStatus(status: string): boolean {
  const validStatuses = ['current', 'past', 'future', 'aspiration'];
  return typeof status === 'string' && validStatuses.includes(status);
}

function isValidRelation(relation: any): boolean {
  // For non-preference relations, category should be null/undefined
  if (
    relation.relationType &&
    !['likes', 'dislikes', 'loves', 'hates', 'wants', 'needs'].includes(relation.relationType)
  ) {
    return relation.category === null || relation.category === undefined;
  }
  return true;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

function validateRelation(relation: any): ValidationResult {
  const errors: string[] = [];

  if (!hasRequiredFields(relation)) {
    errors.push('Missing required fields: subjectId, relationType, or objectLabel');
  }

  if (relation.relationType && !isValidRelationType(relation.relationType)) {
    errors.push(`Invalid relation type: ${relation.relationType}`);
  }

  if (relation.confidence !== undefined && !isValidConfidence(relation.confidence)) {
    errors.push(`Invalid confidence score: ${relation.confidence}. Must be between 0 and 1`);
  }

  if (relation.status && !isValidStatus(relation.status)) {
    errors.push(`Invalid status: ${relation.status}`);
  }

  if (relation.category && !isValidCategory(relation.category)) {
    errors.push(`Invalid category: ${relation.category}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
