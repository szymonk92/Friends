/**
 * Conflict Detection Engine
 *
 * Detects logical conflicts between relations using deep reasoning
 * Examples:
 * - "allergic to potatoes" vs "likes fries" → CONFLICT (fries contain potatoes)
 * - "vegan" vs "likes cheese" → CONFLICT (cheese is dairy)
 * - "vegetarian" vs "likes fish" → CONFLICT (fish is meat for vegetarians)
 */

import {
  foodContainsIngredient,
  isFoodCompatibleWithRestriction,
  DIETARY_RESTRICTIONS,
  normalizeFoodName,
} from './food-knowledge';
import type { Relation } from '../db/schema';

export interface DetectedConflict {
  type:
    | 'direct_contradiction'
    | 'logical_implication'
    | 'ingredient_conflict'
    | 'temporal_conflict';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  existingRelation: Relation | { relationType: string; objectLabel: string; id?: string };
  newRelation: {
    relationType: string;
    objectLabel: string;
  };
  reasoning: string;
  suggestedResolution:
    | 'reject_new'
    | 'replace_old'
    | 'mark_old_as_past'
    | 'add_both_with_context'
    | 'user_review_required';
  autoResolvable: boolean;
}

/**
 * Main conflict detection function
 * Analyzes a new relation against existing relations for a person
 */
export function detectConflicts(
  newRelation: {
    relationType: string;
    objectLabel: string;
    intensity?: string;
    status?: string;
  },
  existingRelations: Array<
    Relation | { relationType: string; objectLabel: string; status?: string | null; id?: string }
  >
): DetectedConflict[] {
  const conflicts: DetectedConflict[] = [];

  for (const existingRelation of existingRelations) {
    // Normalize status to handle null
    const normalizedExisting = {
      ...existingRelation,
      status: existingRelation.status ?? undefined,
    };

    // Skip past/archived relations unless they're being updated
    if (normalizedExisting.status === 'past' && newRelation.status !== 'current') {
      continue;
    }

    // 1. Direct contradictions (LIKES vs DISLIKES)
    const directConflict = detectDirectContradiction(newRelation, normalizedExisting);
    if (directConflict) {
      conflicts.push(directConflict);
    }

    // 2. Ingredient-level conflicts (allergy vs food containing that ingredient)
    const ingredientConflict = detectIngredientConflict(newRelation, normalizedExisting);
    if (ingredientConflict) {
      conflicts.push(ingredientConflict);
    }

    // 3. Dietary restriction implications
    const dietaryConflict = detectDietaryConflict(newRelation, normalizedExisting);
    if (dietaryConflict) {
      conflicts.push(dietaryConflict);
    }

    // 4. Logical implications
    const logicalConflict = detectLogicalConflict(newRelation, normalizedExisting);
    if (logicalConflict) {
      conflicts.push(logicalConflict);
    }

    // 5. Temporal conflicts (can't be two places at once, etc.)
    const temporalConflict = detectTemporalConflict(newRelation, normalizedExisting);
    if (temporalConflict) {
      conflicts.push(temporalConflict);
    }
  }

  return conflicts;
}

/**
 * Detect direct contradictions
 * Example: "LIKES ice cream" vs "DISLIKES ice cream"
 */
function detectDirectContradiction(
  newRelation: { relationType: string; objectLabel: string; status?: string },
  existingRelation: { relationType: string; objectLabel: string; status?: string; id?: string }
): DetectedConflict | null {
  const opposites: Record<string, string[]> = {
    LIKES: ['DISLIKES', 'UNCOMFORTABLE_WITH'],
    DISLIKES: ['LIKES'],
    COMFORTABLE_WITH: ['UNCOMFORTABLE_WITH', 'SENSITIVE_TO'],
    WANTS_TO_ACHIEVE: ['STRUGGLES_WITH'],
  };

  const newType = newRelation.relationType;
  const existingType = existingRelation.relationType;

  // Check if they're opposites
  if (opposites[newType]?.includes(existingType) || opposites[existingType]?.includes(newType)) {
    // Check if they're about the same thing
    if (isSameObject(newRelation.objectLabel, existingRelation.objectLabel)) {
      return {
        type: 'direct_contradiction',
        severity: 'critical',
        description: `Cannot both ${newType.toLowerCase()} and ${existingType.toLowerCase()} "${newRelation.objectLabel}"`,
        existingRelation,
        newRelation,
        reasoning:
          'Direct logical contradiction - person cannot simultaneously like and dislike the same thing',
        suggestedResolution: 'user_review_required',
        autoResolvable: false,
      };
    }
  }

  return null;
}

/**
 * Extract food name from activity phrases like "eats pizza", "drinks milk"
 */
function extractFoodFromActivity(text: string): string {
  const activityWords = ['eats', 'eat', 'drinks', 'drink', 'drinking', 'eating', 'has', 'having'];
  const words = text.toLowerCase().trim().split(' ');

  // Remove activity words from the beginning
  for (const activity of activityWords) {
    if (words[0] === activity) {
      return words.slice(1).join(' ').trim();
    }
  }

  return text;
}

/**
 * Detect ingredient-level conflicts
 * Example: "SENSITIVE_TO potato" vs "LIKES fries" (fries contain potato)
 */
function detectIngredientConflict(
  newRelation: { relationType: string; objectLabel: string; status?: string },
  existingRelation: { relationType: string; objectLabel: string; status?: string; id?: string }
): DetectedConflict | null {
  // Restriction types that exclude ingredients
  const restrictionTypes = ['SENSITIVE_TO', 'UNCOMFORTABLE_WITH', 'ALLERGIC_TO'];
  // Preference types that involve foods
  const preferenceTypes = ['LIKES', 'DISLIKES', 'REGULARLY_DOES'];

  let restriction: string | null = null;
  let food: string | null = null;
  let foodRelation: any = null;
  let restrictionType: string = '';

  // Check if new relation is restriction, existing is food preference
  if (restrictionTypes.some((rt) => newRelation.relationType.includes(rt))) {
    restriction = newRelation.objectLabel;
    restrictionType = newRelation.relationType;

    if (preferenceTypes.includes(existingRelation.relationType)) {
      food = extractFoodFromActivity(existingRelation.objectLabel);
      foodRelation = existingRelation;
    }
  }
  // Check if existing is restriction, new is food preference
  else if (restrictionTypes.some((rt) => existingRelation.relationType.includes(rt))) {
    restriction = existingRelation.objectLabel;
    restrictionType = existingRelation.relationType;

    if (preferenceTypes.includes(newRelation.relationType)) {
      food = extractFoodFromActivity(newRelation.objectLabel);
      foodRelation = newRelation;
    }
  }

  // If we found a restriction-food pair, check for conflicts
  if (restriction && food) {
    if (foodContainsIngredient(food, restriction)) {
      const originalFood = foodRelation.objectLabel;

      // LIKES a food they're allergic to
      if (foodRelation.relationType === 'LIKES') {
        return {
          type: 'ingredient_conflict',
          severity: 'high',
          description: `Cannot like "${originalFood}" while being ${restrictionType.toLowerCase().replace('_', ' ')} "${restriction}" (${food} contains ${restriction})`,
          existingRelation,
          newRelation,
          reasoning: `Ingredient analysis shows that ${food} contains ${restriction}, which conflicts with the ${restrictionType}`,
          suggestedResolution: 'user_review_required',
          autoResolvable: false,
        };
      }
      // REGULARLY_DOES eating/drinking something they're allergic to
      else if (foodRelation.relationType === 'REGULARLY_DOES') {
        return {
          type: 'ingredient_conflict',
          severity: 'critical',
          description: `Cannot regularly ${originalFood.toLowerCase()} while being ${restrictionType.toLowerCase().replace('_', ' ')} "${restriction}" (${food} contains ${restriction})`,
          existingRelation,
          newRelation,
          reasoning: `Health concern: ${food} contains ${restriction}`,
          suggestedResolution: 'user_review_required',
          autoResolvable: false,
        };
      }
    }
  }

  return null;
}

/**
 * Detect dietary restriction conflicts
 * Example: "IS vegan" vs "LIKES cheese" (cheese is dairy)
 */
function detectDietaryConflict(
  newRelation: { relationType: string; objectLabel: string; status?: string },
  existingRelation: { relationType: string; objectLabel: string; status?: string; id?: string }
): DetectedConflict | null {
  let dietaryRestriction: string | null = null;
  let food: string | null = null;
  let foodRelation: any = null;

  // Check if new relation is a dietary restriction
  if (newRelation.relationType === 'IS' && isDietaryRestriction(newRelation.objectLabel)) {
    dietaryRestriction = newRelation.objectLabel;

    if (['LIKES', 'REGULARLY_DOES', 'PREFERS_OVER'].includes(existingRelation.relationType)) {
      food = extractFoodFromActivity(existingRelation.objectLabel);
      foodRelation = existingRelation;
    }
  }
  // Check if existing relation is a dietary restriction
  else if (
    existingRelation.relationType === 'IS' &&
    isDietaryRestriction(existingRelation.objectLabel)
  ) {
    dietaryRestriction = existingRelation.objectLabel;

    if (['LIKES', 'REGULARLY_DOES', 'PREFERS_OVER'].includes(newRelation.relationType)) {
      food = extractFoodFromActivity(newRelation.objectLabel);
      foodRelation = newRelation;
    }
  }

  if (dietaryRestriction && food) {
    const { compatible, reason } = isFoodCompatibleWithRestriction(food, dietaryRestriction);

    if (!compatible && reason) {
      const originalFood = foodRelation.objectLabel;
      return {
        type: 'logical_implication',
        severity: 'high',
        description: `Cannot ${originalFood.toLowerCase()} while being ${dietaryRestriction} (${reason})`,
        existingRelation,
        newRelation,
        reasoning: `Dietary restriction "${dietaryRestriction}" excludes ${reason}`,
        suggestedResolution: 'user_review_required',
        autoResolvable: false,
      };
    }
  }

  return null;
}

/**
 * Detect logical implication conflicts
 * Example: "IS vegetarian" implies cannot eat meat, so "LIKES steak" would conflict
 */
function detectLogicalConflict(
  newRelation: { relationType: string; objectLabel: string; status?: string },
  existingRelation: { relationType: string; objectLabel: string; status?: string; id?: string }
): DetectedConflict | null {
  // Identity conflicts (can't be two conflicting things)
  if (newRelation.relationType === 'IS' && existingRelation.relationType === 'IS') {
    const conflicts = getIdentityConflicts(newRelation.objectLabel, existingRelation.objectLabel);
    if (conflicts) {
      return {
        type: 'logical_implication',
        severity: 'medium',
        description: conflicts.description,
        existingRelation,
        newRelation,
        reasoning: conflicts.reasoning,
        suggestedResolution: 'user_review_required',
        autoResolvable: false,
      };
    }
  }

  // Belief conflicts
  if (newRelation.relationType === 'BELIEVES' && existingRelation.relationType === 'BELIEVES') {
    if (areOpposingBeliefs(newRelation.objectLabel, existingRelation.objectLabel)) {
      return {
        type: 'logical_implication',
        severity: 'medium',
        description: `Cannot believe both "${newRelation.objectLabel}" and "${existingRelation.objectLabel}"`,
        existingRelation,
        newRelation,
        reasoning: 'Mutually exclusive beliefs',
        suggestedResolution: 'user_review_required',
        autoResolvable: false,
      };
    }
  }

  return null;
}

/**
 * Detect temporal conflicts
 */
function detectTemporalConflict(
  newRelation: { relationType: string; objectLabel: string; status?: string },
  existingRelation: { relationType: string; objectLabel: string; status?: string; id?: string }
): DetectedConflict | null {
  // Check if someone used to be something but now is something else
  if (newRelation.relationType === 'USED_TO_BE' && existingRelation.relationType === 'IS') {
    if (isSameObject(newRelation.objectLabel, existingRelation.objectLabel)) {
      return {
        type: 'temporal_conflict',
        severity: 'low',
        description: `Cannot currently be "${existingRelation.objectLabel}" if they used to be it`,
        existingRelation,
        newRelation,
        reasoning: 'USED_TO_BE implies past state, conflicts with current IS',
        suggestedResolution: 'mark_old_as_past',
        autoResolvable: true,
      };
    }
  }

  return null;
}

/**
 * Helper: Check if two objects are the same (with normalization)
 */
function isSameObject(obj1: string, obj2: string): boolean {
  const normalize = (s: string) => s.toLowerCase().trim();
  return normalize(obj1) === normalize(obj2);
}

/**
 * Helper: Check if a string represents a dietary restriction
 */
function isDietaryRestriction(value: string): boolean {
  const normalized = normalizeFoodName(value);
  return normalized in DIETARY_RESTRICTIONS;
}

/**
 * Helper: Get identity conflicts
 */
function getIdentityConflicts(
  identity1: string,
  identity2: string
): { description: string; reasoning: string } | null {
  const conflictingIdentities: Record<string, string[]> = {
    vegan: ['vegetarian', 'pescatarian', 'meat-eater'],
    vegetarian: ['vegan', 'pescatarian', 'meat-eater'],
    atheist: ['christian', 'muslim', 'jewish', 'hindu', 'buddhist'],
    democrat: ['republican'],
    'cat person': ['dog person'],
  };

  const norm1 = normalizeFoodName(identity1);
  const norm2 = normalizeFoodName(identity2);

  for (const [identity, conflicts] of Object.entries(conflictingIdentities)) {
    if (norm1 === identity && conflicts.includes(norm2)) {
      return {
        description: `Cannot be both "${identity1}" and "${identity2}"`,
        reasoning: 'Mutually exclusive identities',
      };
    }
    if (norm2 === identity && conflicts.includes(norm1)) {
      return {
        description: `Cannot be both "${identity1}" and "${identity2}"`,
        reasoning: 'Mutually exclusive identities',
      };
    }
  }

  return null;
}

/**
 * Helper: Check if two beliefs are opposing
 */
function areOpposingBeliefs(belief1: string, belief2: string): boolean {
  // Simple heuristic - check for negation words
  const negations = ['not', "don't", 'never', 'against', 'anti'];

  const words1 = belief1.toLowerCase().split(' ');
  const words2 = belief2.toLowerCase().split(' ');

  // If one has negation and the other doesn't, they might be opposing
  const has1Negation = words1.some((w) => negations.includes(w));
  const has2Negation = words2.some((w) => negations.includes(w));

  if (has1Negation !== has2Negation) {
    // Check if they're about the same topic
    const topic1 = words1.filter((w) => !negations.includes(w)).join(' ');
    const topic2 = words2.filter((w) => !negations.includes(w)).join(' ');

    if (topic1.includes(topic2) || topic2.includes(topic1)) {
      return true;
    }
  }

  return false;
}

/**
 * Validate a new relation against existing ones
 * Returns { valid: boolean, conflicts: DetectedConflict[] }
 */
export function validateRelation(
  newRelation: { relationType: string; objectLabel: string; intensity?: string; status?: string },
  existingRelations: Relation[]
): {
  valid: boolean;
  conflicts: DetectedConflict[];
  warnings: string[];
  requiresUserReview: boolean;
} {
  const conflicts = detectConflicts(newRelation, existingRelations);

  // Critical conflicts make it invalid
  const criticalConflicts = conflicts.filter((c) => c.severity === 'critical');
  const highConflicts = conflicts.filter((c) => c.severity === 'high');

  const warnings: string[] = [];

  // High severity conflicts become warnings
  for (const conflict of highConflicts) {
    warnings.push(conflict.description);
  }

  return {
    valid: criticalConflicts.length === 0,
    conflicts,
    warnings,
    requiresUserReview: highConflicts.length > 0 || criticalConflicts.length > 0,
  };
}

/**
 * Get explanation for why a conflict exists
 */
export function explainConflict(conflict: DetectedConflict): string {
  let explanation = `**Conflict Detected:** ${conflict.description}\n\n`;
  explanation += `**Severity:** ${conflict.severity}\n`;
  explanation += `**Reasoning:** ${conflict.reasoning}\n\n`;
  explanation += `**Suggested Resolution:** ${formatResolution(conflict.suggestedResolution)}`;

  return explanation;
}

function formatResolution(resolution: string): string {
  const resolutions: Record<string, string> = {
    reject_new: 'Reject the new information',
    replace_old: 'Replace the old information with the new',
    mark_old_as_past: 'Mark the old information as past/no longer current',
    add_both_with_context: 'Keep both with additional context',
    user_review_required: 'Requires user review to resolve',
  };

  return resolutions[resolution] || resolution;
}

/**
 * Bulk check: Find all conflicts in a set of relations
 */
export function findAllConflicts(relations: Relation[]): DetectedConflict[] {
  const allConflicts: DetectedConflict[] = [];

  for (let i = 0; i < relations.length; i++) {
    for (let j = i + 1; j < relations.length; j++) {
      const conflicts = detectConflicts(
        {
          relationType: relations[j].relationType,
          objectLabel: relations[j].objectLabel,
          status: relations[j].status || 'current',
        },
        [relations[i]]
      );

      allConflicts.push(...conflicts);
    }
  }

  return allConflicts;
}
