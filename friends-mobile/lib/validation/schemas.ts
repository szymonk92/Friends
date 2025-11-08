import { z } from 'zod';

/**
 * Validation schemas for the Friends app
 * Based on DATABASE_SCHEMA_FINAL.md and RELATION_METADATA_SCHEMAS.md
 */

// ============================================================================
// PERSON SCHEMAS
// ============================================================================

export const personTypeEnum = z.enum(['primary', 'mentioned', 'placeholder']);
export const dataCompletenessEnum = z.enum(['minimal', 'partial', 'complete']);
export const addedByEnum = z.enum(['user', 'ai_extraction', 'auto_created', 'import']);
export const importanceEnum = z.enum(['unknown', 'peripheral', 'important', 'very_important']);
export const personStatusEnum = z.enum(['active', 'archived', 'deceased', 'placeholder', 'merged']);
export const relationshipTypeEnum = z.enum([
  'friend',
  'family',
  'colleague',
  'acquaintance',
  'partner',
]);

export const newPersonSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  nickname: z.string().optional(),
  relationshipType: relationshipTypeEnum.optional(),
  metDate: z.date().optional(),
  personType: personTypeEnum.default('placeholder'),
  dataCompleteness: dataCompletenessEnum.default('minimal'),
  addedBy: addedByEnum.default('user'),
  notes: z.string().optional(),
});

export type NewPersonFormData = z.infer<typeof newPersonSchema>;

// ============================================================================
// RELATION SCHEMAS
// ============================================================================

export const relationTypeEnum = z.enum([
  'KNOWS',
  'LIKES',
  'DISLIKES',
  'ASSOCIATED_WITH',
  'EXPERIENCED',
  'HAS_SKILL',
  'OWNS',
  'HAS_IMPORTANT_DATE',
  'IS',
  'BELIEVES',
  'FEARS',
  'WANTS_TO_ACHIEVE',
  'STRUGGLES_WITH',
  'CARES_FOR',
  'DEPENDS_ON',
  'REGULARLY_DOES',
  'PREFERS_OVER',
  'USED_TO_BE',
  'SENSITIVE_TO',
  'UNCOMFORTABLE_WITH',
]);

export const intensityEnum = z.enum(['weak', 'medium', 'strong', 'very_strong']);
export const relationStatusEnum = z.enum(['current', 'past', 'future', 'aspiration']);
export const sourceEnum = z.enum([
  'manual',
  'ai_extraction',
  'question_mode',
  'voice_note',
  'import',
]);

export const newRelationSchema = z.object({
  subjectId: z.string().uuid('Invalid person ID'),
  relationType: relationTypeEnum,
  objectLabel: z.string().min(1, 'Object label is required'),
  objectType: z.string().optional(),
  intensity: intensityEnum.optional(),
  confidence: z.number().min(0).max(1).default(1.0),
  category: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  status: relationStatusEnum.default('current'),
  source: sourceEnum.default('manual'),
  validFrom: z.date().optional(),
  validTo: z.date().optional(),
});

export type NewRelationFormData = z.infer<typeof newRelationSchema>;

// ============================================================================
// STORY SCHEMAS
// ============================================================================

export const newStorySchema = z.object({
  title: z.string().optional(),
  content: z.string().min(10, 'Story must be at least 10 characters'),
  storyDate: z.date().optional(),
});

export type NewStoryFormData = z.infer<typeof newStorySchema>;

// ============================================================================
// AI EXTRACTION SCHEMAS
// ============================================================================

export const extractedPersonSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isNew: z.boolean(),
  potentialDuplicateOf: z.string().uuid().nullable(),
  personType: personTypeEnum,
  confidence: z.number().min(0).max(1),
});

export const extractedRelationSchema = z.object({
  subjectId: z.string().uuid(),
  subjectName: z.string(),
  relationType: relationTypeEnum,
  objectLabel: z.string(),
  objectType: z.string().optional(),
  intensity: intensityEnum.optional(),
  confidence: z.number().min(0).max(1),
  category: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  status: relationStatusEnum.optional(),
  source: sourceEnum,
});

export const extractionResultSchema = z.object({
  people: z.array(extractedPersonSchema),
  relations: z.array(extractedRelationSchema),
  conflicts: z.array(
    z.object({
      type: z.string(),
      description: z.string(),
      existingRelationId: z.string().uuid().optional(),
      newRelation: extractedRelationSchema,
    })
  ),
});

export type ExtractionResultData = z.infer<typeof extractionResultSchema>;

// ============================================================================
// METADATA SCHEMAS (Type-specific)
// ============================================================================

// LIKES/DISLIKES metadata
export const likesMetadataSchema = z.object({
  category: z.string().optional(), // "food", "activity", "music", etc.
  frequency: z.enum(['rarely', 'sometimes', 'often', 'always']).optional(),
  context: z.string().optional(), // "only for breakfast", "when tired"
  since: z.string().optional(), // "childhood", "2020"
});

// FEARS metadata
export const fearsMetadataSchema = z.object({
  severity: z.enum(['mild', 'moderate', 'severe', 'phobia']).optional(),
  triggers: z.array(z.string()).optional(),
  context: z.string().optional(),
  since: z.string().optional(),
});

// STRUGGLES_WITH metadata
export const strugglesMetadataSchema = z.object({
  severity: z.enum(['minor', 'moderate', 'major', 'severe']).optional(),
  duration: z.string().optional(), // "recent", "chronic", "years"
  support: z.string().optional(), // "seeing therapist", "medication"
  triggers: z.array(z.string()).optional(),
});

// CARES_FOR metadata
export const caresForMetadataSchema = z.object({
  care_type: z.string().optional(), // "elderly_parent", "child", "pet"
  level: z.enum(['occasional', 'part_time', 'full_time', 'primary_caregiver']).optional(),
  since: z.string().optional(),
  condition: z.string().optional(), // "dementia", "chronic_illness"
});

// IS metadata (identity)
export const isMetadataSchema = z.object({
  category: z.enum([
    'profession',
    'role',
    'trait',
    'identity',
    'health',
    'relationship_status',
  ]),
  since: z.string().optional(),
  context: z.string().optional(),
});

// BELIEVES metadata
export const believesMetadataSchema = z.object({
  category: z
    .enum(['political', 'religious', 'philosophical', 'ethical', 'scientific', 'lifestyle'])
    .optional(),
  strength: z.enum(['mild', 'moderate', 'strong', 'core_value']).optional(),
  open_to_discussion: z.boolean().optional(),
});
