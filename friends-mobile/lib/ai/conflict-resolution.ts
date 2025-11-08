/**
 * Conflict Resolution Utilities
 *
 * Helper functions for resolving conflicts detected during extraction
 */

import type { Relation } from '../db/schema';
import type { DetectedConflict } from './conflict-detection';
import { detectConflicts } from './conflict-detection';

export interface ResolutionAction {
  action: 'reject' | 'replace' | 'mark_as_past' | 'add_with_warning' | 'require_user_review';
  description: string;
  affectedRelationIds: string[];
  warnings?: string[];
}

/**
 * Suggest resolution for a detected conflict
 */
export function suggestResolution(conflict: DetectedConflict): ResolutionAction {
  switch (conflict.suggestedResolution) {
    case 'reject_new':
      return {
        action: 'reject',
        description: `Rejecting new relation due to conflict: ${conflict.description}`,
        affectedRelationIds: conflict.existingRelation.id ? [conflict.existingRelation.id] : [],
        warnings: [conflict.reasoning],
      };

    case 'replace_old':
      return {
        action: 'replace',
        description: `Replacing old relation with new information`,
        affectedRelationIds: conflict.existingRelation.id ? [conflict.existingRelation.id] : [],
        warnings: [
          `Old: ${conflict.existingRelation.relationType} "${conflict.existingRelation.objectLabel}"`,
          `New: ${conflict.newRelation.relationType} "${conflict.newRelation.objectLabel}"`,
        ],
      };

    case 'mark_old_as_past':
      return {
        action: 'mark_as_past',
        description: `Marking old relation as past, adding new as current`,
        affectedRelationIds: conflict.existingRelation.id ? [conflict.existingRelation.id] : [],
        warnings: [`This person's situation has changed over time`],
      };

    case 'add_both_with_context':
      return {
        action: 'add_with_warning',
        description: `Adding both relations with context note`,
        affectedRelationIds: [],
        warnings: [conflict.description, conflict.reasoning],
      };

    case 'user_review_required':
    default:
      return {
        action: 'require_user_review',
        description: `Conflict requires user review: ${conflict.description}`,
        affectedRelationIds: conflict.existingRelation.id ? [conflict.existingRelation.id] : [],
        warnings: [conflict.reasoning],
      };
  }
}

/**
 * Batch process multiple conflicts and suggest resolutions
 */
export function processConflicts(conflicts: DetectedConflict[]): {
  criticalConflicts: DetectedConflict[];
  resolvableConflicts: DetectedConflict[];
  warnings: string[];
  suggestedActions: ResolutionAction[];
} {
  const criticalConflicts = conflicts.filter(c => c.severity === 'critical' && !c.autoResolvable);
  const resolvableConflicts = conflicts.filter(c => c.autoResolvable);

  const warnings: string[] = [];
  const suggestedActions: ResolutionAction[] = [];

  // Process resolvable conflicts
  for (const conflict of resolvableConflicts) {
    const action = suggestResolution(conflict);
    suggestedActions.push(action);
    warnings.push(...(action.warnings || []));
  }

  // Add warnings for critical conflicts
  for (const conflict of criticalConflicts) {
    warnings.push(`⚠️ CRITICAL: ${conflict.description}`);
    warnings.push(`   Reason: ${conflict.reasoning}`);
  }

  return {
    criticalConflicts,
    resolvableConflicts,
    warnings,
    suggestedActions,
  };
}

/**
 * Validate if a new relation can be added without conflicts
 */
export function canAddRelation(
  newRelation: { relationType: string; objectLabel: string; intensity?: string; status?: string },
  existingRelations: Relation[]
): {
  canAdd: boolean;
  conflicts: DetectedConflict[];
  warnings: string[];
  requiresUserReview: boolean;
} {
  const conflicts = detectConflicts(newRelation, existingRelations);

  const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
  const highConflicts = conflicts.filter(c => c.severity === 'high');

  const warnings: string[] = [];

  // Add warnings for high-severity conflicts
  for (const conflict of highConflicts) {
    warnings.push(conflict.description);
  }

  // Add warnings for medium/low conflicts
  for (const conflict of conflicts.filter(c => c.severity === 'medium' || c.severity === 'low')) {
    warnings.push(`Note: ${conflict.description}`);
  }

  return {
    canAdd: criticalConflicts.length === 0,
    conflicts,
    warnings,
    requiresUserReview: highConflicts.length > 0 || criticalConflicts.length > 0,
  };
}

/**
 * Get human-readable explanation for a conflict
 */
export function explainConflictToUser(conflict: DetectedConflict): string {
  const severity = conflict.severity.toUpperCase();
  let emoji = '⚠️';

  switch (conflict.severity) {
    case 'critical':
      emoji = '🚨';
      break;
    case 'high':
      emoji = '⚠️';
      break;
    case 'medium':
      emoji = '⚡';
      break;
    case 'low':
      emoji = 'ℹ️';
      break;
  }

  let explanation = `${emoji} **${severity} Conflict Detected**\n\n`;
  explanation += `**Issue:** ${conflict.description}\n\n`;
  explanation += `**Why this is a problem:**\n${conflict.reasoning}\n\n`;

  explanation += `**Existing information:**\n`;
  explanation += `- ${conflict.existingRelation.relationType}: "${conflict.existingRelation.objectLabel}"\n\n`;

  explanation += `**New information:**\n`;
  explanation += `- ${conflict.newRelation.relationType}: "${conflict.newRelation.objectLabel}"\n\n`;

  if (conflict.autoResolvable) {
    explanation += `✅ This can be automatically resolved.\n`;
  } else {
    explanation += `👤 **User input needed** to resolve this conflict.\n`;
  }

  return explanation;
}

/**
 * Filter out relations that would conflict with existing ones
 */
export function filterConflictingRelations(
  newRelations: Array<{ relationType: string; objectLabel: string; subjectId: string }>,
  existingRelations: Relation[]
): {
  safe: Array<{ relationType: string; objectLabel: string; subjectId: string }>;
  conflicts: Array<{
    relation: { relationType: string; objectLabel: string; subjectId: string };
    conflict: DetectedConflict;
  }>;
} {
  const safe: Array<{ relationType: string; objectLabel: string; subjectId: string }> = [];
  const conflicts: Array<{
    relation: { relationType: string; objectLabel: string; subjectId: string };
    conflict: DetectedConflict;
  }> = [];

  for (const newRelation of newRelations) {
    // Get existing relations for this subject
    const subjectRelations = existingRelations.filter(r => r.subjectId === newRelation.subjectId);

    const detectedConflicts = detectConflicts(newRelation, subjectRelations);

    // Check if there are any critical or high-severity conflicts
    const blocker = detectedConflicts.find(c => c.severity === 'critical' || c.severity === 'high');

    if (blocker) {
      conflicts.push({
        relation: newRelation,
        conflict: blocker,
      });
    } else {
      safe.push(newRelation);
    }
  }

  return { safe, conflicts };
}

/**
 * Merge conflict information from AI and local detection
 */
export function mergeConflictSources(
  aiConflicts: Array<{ type: string; description: string; reasoning?: string }>,
  localConflicts: DetectedConflict[]
): DetectedConflict[] {
  const merged: DetectedConflict[] = [...localConflicts];

  // Add AI-detected conflicts that aren't already in local conflicts
  for (const aiConflict of aiConflicts) {
    const alreadyDetected = localConflicts.some(
      lc => lc.description.toLowerCase().includes(aiConflict.description.toLowerCase())
    );

    if (!alreadyDetected) {
      // Convert AI conflict to DetectedConflict format
      merged.push({
        type: (aiConflict.type as any) || 'logical_implication',
        severity: 'high',
        description: aiConflict.description,
        reasoning: aiConflict.reasoning || 'Detected by AI analysis',
        existingRelation: { relationType: '', objectLabel: '' },
        newRelation: { relationType: '', objectLabel: '' },
        suggestedResolution: 'user_review_required',
        autoResolvable: false,
      });
    }
  }

  return merged;
}

/**
 * Create a user-friendly summary of all conflicts
 */
export function createConflictSummary(conflicts: DetectedConflict[]): string {
  if (conflicts.length === 0) {
    return '✅ No conflicts detected. All relations are consistent.';
  }

  const bySeverity = {
    critical: conflicts.filter(c => c.severity === 'critical'),
    high: conflicts.filter(c => c.severity === 'high'),
    medium: conflicts.filter(c => c.severity === 'medium'),
    low: conflicts.filter(c => c.severity === 'low'),
  };

  let summary = `## Conflict Detection Summary\n\n`;
  summary += `**Total conflicts found:** ${conflicts.length}\n\n`;

  if (bySeverity.critical.length > 0) {
    summary += `### 🚨 Critical (${bySeverity.critical.length})\n`;
    bySeverity.critical.forEach((c, i) => {
      summary += `${i + 1}. ${c.description}\n`;
    });
    summary += `\n`;
  }

  if (bySeverity.high.length > 0) {
    summary += `### ⚠️ High (${bySeverity.high.length})\n`;
    bySeverity.high.forEach((c, i) => {
      summary += `${i + 1}. ${c.description}\n`;
    });
    summary += `\n`;
  }

  if (bySeverity.medium.length > 0) {
    summary += `### ⚡ Medium (${bySeverity.medium.length})\n`;
    bySeverity.medium.forEach((c, i) => {
      summary += `${i + 1}. ${c.description}\n`;
    });
    summary += `\n`;
  }

  if (bySeverity.low.length > 0) {
    summary += `### ℹ️ Low (${bySeverity.low.length})\n`;
    bySeverity.low.forEach((c, i) => {
      summary += `${i + 1}. ${c.description}\n`;
    });
  }

  return summary;
}
