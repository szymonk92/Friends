/**
 * Conflict Detection Tests
 *
 * Comprehensive test suite for edge cases and conflict scenarios
 */

import { describe, it, expect } from '@jest/globals';
import { detectConflicts, validateRelation } from '../conflict-detection';
import {
  foodContainsIngredient,
  isFoodCompatibleWithRestriction,
  findConflictingFoods,
} from '../food-knowledge';

describe('Food Knowledge Base', () => {
  describe('Ingredient Detection', () => {
    it('should detect that fries contain potatoes', () => {
      expect(foodContainsIngredient('fries', 'potato')).toBe(true);
      expect(foodContainsIngredient('french fries', 'potato')).toBe(true);
      expect(foodContainsIngredient('potato chips', 'potato')).toBe(true);
    });

    it('should detect that ice cream contains dairy', () => {
      expect(foodContainsIngredient('ice cream', 'milk')).toBe(true);
      expect(foodContainsIngredient('ice cream', 'dairy')).toBe(true);
      expect(foodContainsIngredient('ice cream', 'cream')).toBe(true);
    });

    it('should detect that pizza contains cheese and wheat', () => {
      expect(foodContainsIngredient('pizza', 'cheese')).toBe(true);
      expect(foodContainsIngredient('pizza', 'wheat')).toBe(true);
    });

    it('should detect that bacon is pork', () => {
      expect(foodContainsIngredient('bacon', 'pork')).toBe(true);
    });

    it('should detect derivative relationships', () => {
      expect(foodContainsIngredient('mashed potatoes', 'potato')).toBe(true);
      expect(foodContainsIngredient('hash browns', 'potato')).toBe(true);
    });
  });

  describe('Dietary Restrictions', () => {
    it('should detect vegan incompatibilities', () => {
      const { compatible: cheese } = isFoodCompatibleWithRestriction('cheese', 'vegan');
      expect(cheese).toBe(false);

      const { compatible: eggs } = isFoodCompatibleWithRestriction('eggs', 'vegan');
      expect(eggs).toBe(false);

      const { compatible: bacon } = isFoodCompatibleWithRestriction('bacon', 'vegan');
      expect(bacon).toBe(false);
    });

    it('should detect vegetarian incompatibilities', () => {
      const { compatible: fish } = isFoodCompatibleWithRestriction('fish and chips', 'vegetarian');
      expect(fish).toBe(false);

      const { compatible: bacon } = isFoodCompatibleWithRestriction('bacon', 'vegetarian');
      expect(bacon).toBe(false);
    });

    it('should detect lactose intolerance conflicts', () => {
      const { compatible: milk } = isFoodCompatibleWithRestriction('ice cream', 'lactose intolerant');
      expect(milk).toBe(false);

      const { compatible: cheese } = isFoodCompatibleWithRestriction('cheese', 'lactose intolerant');
      expect(cheese).toBe(false);
    });

    it('should detect kosher violations', () => {
      const { compatible: pork } = isFoodCompatibleWithRestriction('bacon', 'kosher');
      expect(pork).toBe(false);
    });
  });

  describe('Bulk Conflict Finding', () => {
    it('should find all foods conflicting with potato allergy', () => {
      const foods = ['fries', 'pizza', 'ice cream', 'hash browns', 'salad'];
      const conflicts = findConflictingFoods('potato', foods);

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts.some(c => c.food === 'fries')).toBe(true);
      expect(conflicts.some(c => c.food === 'hash browns')).toBe(true);
    });

    it('should find all foods conflicting with vegan diet', () => {
      const foods = ['cheese', 'tofu', 'bacon', 'veggie burger', 'ice cream'];
      const conflicts = findConflictingFoods('vegan', foods);

      expect(conflicts.some(c => c.food === 'cheese')).toBe(true);
      expect(conflicts.some(c => c.food === 'bacon')).toBe(true);
      expect(conflicts.some(c => c.food === 'ice cream')).toBe(true);
      expect(conflicts.some(c => c.food === 'tofu')).toBe(false);
    });
  });
});

describe('Conflict Detection Engine', () => {
  describe('Direct Contradictions', () => {
    it('should detect LIKES vs DISLIKES contradiction', () => {
      const newRelation = {
        relationType: 'LIKES',
        objectLabel: 'ice cream',
      };

      const existingRelations = [
        {
          id: '1',
          relationType: 'DISLIKES',
          objectLabel: 'ice cream',
          status: 'current',
        },
      ];

      const conflicts = detectConflicts(newRelation, existingRelations as any);

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe('direct_contradiction');
      expect(conflicts[0].severity).toBe('critical');
    });
  });

  describe('Ingredient-Level Conflicts', () => {
    it('should detect potato allergy vs fries conflict', () => {
      const newRelation = {
        relationType: 'SENSITIVE_TO',
        objectLabel: 'potato',
      };

      const existingRelations = [
        {
          id: '1',
          relationType: 'LIKES',
          objectLabel: 'fries',
          status: 'current',
        },
      ];

      const conflicts = detectConflicts(newRelation, existingRelations as any);

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe('ingredient_conflict');
      expect(conflicts[0].description).toContain('fries');
      expect(conflicts[0].description).toContain('potato');
    });

    it('should detect dairy sensitivity vs ice cream conflict', () => {
      const newRelation = {
        relationType: 'LIKES',
        objectLabel: 'ice cream',
      };

      const existingRelations = [
        {
          id: '1',
          relationType: 'SENSITIVE_TO',
          objectLabel: 'dairy',
          status: 'current',
        },
      ];

      const conflicts = detectConflicts(newRelation, existingRelations as any);

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe('ingredient_conflict');
    });

    it('should detect peanut allergy vs peanut butter conflict', () => {
      const newRelation = {
        relationType: 'REGULARLY_DOES',
        objectLabel: 'eats peanut butter',
      };

      const existingRelations = [
        {
          id: '1',
          relationType: 'SENSITIVE_TO',
          objectLabel: 'peanuts',
          status: 'current',
        },
      ];

      const conflicts = detectConflicts(newRelation, existingRelations as any);

      expect(conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('Dietary Restriction Conflicts', () => {
    it('should detect vegan vs cheese conflict', () => {
      const newRelation = {
        relationType: 'IS',
        objectLabel: 'vegan',
      };

      const existingRelations = [
        {
          id: '1',
          relationType: 'LIKES',
          objectLabel: 'cheese',
          status: 'current',
        },
      ];

      const conflicts = detectConflicts(newRelation, existingRelations as any);

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe('logical_implication');
      expect(conflicts[0].description).toContain('vegan');
      expect(conflicts[0].description).toContain('cheese');
    });

    it('should detect vegetarian vs bacon conflict', () => {
      const newRelation = {
        relationType: 'LIKES',
        objectLabel: 'bacon',
      };

      const existingRelations = [
        {
          id: '1',
          relationType: 'IS',
          objectLabel: 'vegetarian',
          status: 'current',
        },
      ];

      const conflicts = detectConflicts(newRelation, existingRelations as any);

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe('logical_implication');
    });

    it('should detect lactose intolerant vs milk conflict', () => {
      const newRelation = {
        relationType: 'REGULARLY_DOES',
        objectLabel: 'drinks milk',
      };

      const existingRelations = [
        {
          id: '1',
          relationType: 'IS',
          objectLabel: 'lactose intolerant',
          status: 'current',
        },
      ];

      const conflicts = detectConflicts(newRelation, existingRelations as any);

      expect(conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('Complex Edge Cases', () => {
    it('should handle vegan who used to eat meat (temporal)', () => {
      const newRelation = {
        relationType: 'IS',
        objectLabel: 'vegan',
        status: 'current',
      };

      const existingRelations = [
        {
          id: '1',
          relationType: 'USED_TO_BE',
          objectLabel: 'meat-eater',
          status: 'past',
        },
      ];

      const conflicts = detectConflicts(newRelation, existingRelations as any);

      // This should NOT conflict - temporal difference
      expect(conflicts.length).toBe(0);
    });

    it('should detect multiple ingredient conflicts', () => {
      const newRelation = {
        relationType: 'LIKES',
        objectLabel: 'pizza',
      };

      const existingRelations = [
        {
          id: '1',
          relationType: 'SENSITIVE_TO',
          objectLabel: 'wheat',
          status: 'current',
        },
        {
          id: '2',
          relationType: 'SENSITIVE_TO',
          objectLabel: 'dairy',
          status: 'current',
        },
      ];

      const conflicts = detectConflicts(newRelation, existingRelations as any);

      // Pizza contains both wheat and dairy
      expect(conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('Validation Function', () => {
    it('should validate safe relations', () => {
      const newRelation = {
        relationType: 'LIKES',
        objectLabel: 'hiking',
      };

      const existingRelations = [
        {
          id: '1',
          relationType: 'LIKES',
          objectLabel: 'nature',
          status: 'current',
        },
      ] as any[];

      const result = validateRelation(newRelation, existingRelations);

      expect(result.valid).toBe(true);
      expect(result.conflicts.length).toBe(0);
    });

    it('should invalidate critical conflicts', () => {
      const newRelation = {
        relationType: 'LIKES',
        objectLabel: 'ice cream',
      };

      const existingRelations = [
        {
          id: '1',
          relationType: 'DISLIKES',
          objectLabel: 'ice cream',
          status: 'current',
        },
      ] as any[];

      const result = validateRelation(newRelation, existingRelations);

      expect(result.valid).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);
    });

    it('should flag relations requiring user review', () => {
      const newRelation = {
        relationType: 'LIKES',
        objectLabel: 'fries',
      };

      const existingRelations = [
        {
          id: '1',
          relationType: 'SENSITIVE_TO',
          objectLabel: 'potato',
          status: 'current',
        },
      ] as any[];

      const result = validateRelation(newRelation, existingRelations);

      expect(result.requiresUserReview).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});

describe('Real-World Scenarios', () => {
  it('Scenario: Person allergic to potatoes tries to like fries', () => {
    const newRelation = {
      relationType: 'LIKES',
      objectLabel: 'fries',
    };

    const existingRelations = [
      {
        id: '1',
        relationType: 'SENSITIVE_TO',
        objectLabel: 'potatoes',
        status: 'current',
      },
    ];

    const conflicts = detectConflicts(newRelation, existingRelations as any);

    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].description.toLowerCase()).toContain('potato');
    expect(conflicts[0].reasoning.toLowerCase()).toContain('contains');
  });

  it('Scenario: Vegan person regularly eats cheese', () => {
    const newRelation = {
      relationType: 'REGULARLY_DOES',
      objectLabel: 'eats cheese',
    };

    const existingRelations = [
      {
        id: '1',
        relationType: 'IS',
        objectLabel: 'vegan',
        status: 'current',
      },
    ];

    const conflicts = detectConflicts(newRelation, existingRelations as any);

    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].severity).toBe('high');
  });

  it('Scenario: Lactose intolerant person loves ice cream', () => {
    const newRelation = {
      relationType: 'LIKES',
      objectLabel: 'ice cream',
    };

    const existingRelations = [
      {
        id: '1',
        relationType: 'IS',
        objectLabel: 'lactose intolerant',
        status: 'current',
      },
    ];

    const conflicts = detectConflicts(newRelation, existingRelations as any);

    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].description.toLowerCase()).toContain('lactose');
  });
});
