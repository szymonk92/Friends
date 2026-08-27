import { z } from 'zod';
import { socialLinksSchema } from '@/lib/social/socialLinks';

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
export const entityTypeEnum = z.enum(['person', 'pet']);
export const personStatusEnum = z.enum(['active', 'archived', 'deceased', 'placeholder', 'merged']);
export const relationshipTypeEnum = z.enum([
  'friend',
  'family',
  'colleague',
  'acquaintance',
  'partner',
]);

export const phoneSchema = z
  .string()
  .trim()
  .max(32)
  .regex(/^[+\d][\d\s().-]{2,31}$/u, 'Invalid phone number');

export const emailSchema = z.string().trim().max(254).email('Invalid email');

export const languagesSchema = z.array(z.string().trim().min(1).max(40)).max(20);

export const newPersonSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be 100 characters or fewer'),
  nickname: z.string().trim().max(60, 'Nickname must be 60 characters or fewer').optional(),
  relationshipType: relationshipTypeEnum.optional(),
  metDate: z.date().optional(),
  metLocation: z.string().trim().max(120).optional().nullable(),
  socialLinks: socialLinksSchema.optional().nullable(),
  phone: phoneSchema.optional().nullable(),
  email: emailSchema.optional().nullable(),
  homeLocation: z.string().trim().max(120).optional().nullable(),
  languages: languagesSchema.optional().nullable(),
  personType: personTypeEnum.default('placeholder'),
  entityType: entityTypeEnum.default('person'),
  species: z.string().trim().max(40, 'Species must be 40 characters or fewer').optional().nullable(),
  dataCompleteness: dataCompletenessEnum.default('minimal'),
  addedBy: addedByEnum.default('user'),
  notes: z.string().trim().max(5000, 'Notes must be 5000 characters or fewer').optional(),
});

export type NewPersonFormData = z.infer<typeof newPersonSchema>;

// ============================================================================
// RELATION SCHEMAS
// ============================================================================

// 12 story-fact types + HAS_IMPORTANT_DATE (reserved for the dedicated
// birthday/anniversary feature — not part of the AI/manual vocabulary).
export const relationTypeEnum = z.enum([
  'DOES',
  'AVOIDS',
  'LIKES',
  'DISLIKES',
  'HAS',
  'LIVES_IN',
  'IS',
  'CAN',
  'DID',
  'STRUGGLES_WITH',
  'WANTS',
  'KNOWS',
  'HAS_IMPORTANT_DATE',
]);

export const intensityEnum = z.enum(['weak', 'medium', 'strong']);
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
  objectLabel: z.string().min(1, 'Object label is required').max(200, 'Object label must be 200 characters or fewer'),
  objectType: z.string().trim().max(60).optional(),
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
  title: z.string().trim().max(200, 'Title must be 200 characters or fewer').optional(),
  content: z.string().min(10, 'Story must be at least 10 characters').max(20000, 'Story must be 20000 characters or fewer'),
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

// STRUGGLES_WITH metadata
export const strugglesMetadataSchema = z.object({
  severity: z.enum(['minor', 'moderate', 'major', 'severe']).optional(),
  duration: z.string().optional(), // "recent", "chronic", "years"
  support: z.string().optional(), // "seeing therapist", "medication"
  triggers: z.array(z.string()).optional(),
});

// IS metadata (identity)
export const isMetadataSchema = z.object({
  category: z.enum(['profession', 'role', 'trait', 'identity', 'health', 'relationship_status']),
  since: z.string().optional(),
  context: z.string().optional(),
});
