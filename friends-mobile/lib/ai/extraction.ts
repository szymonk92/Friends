import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { createExtractionPrompt, type ExtractionContext } from './prompts';
import {
  personTypeEnum,
  relationTypeEnum,
  intensityEnum,
  relationStatusEnum,
} from '../validation/schemas';
import { ExtractionRateLimiter, type RateLimitStatus } from './rate-limiter';

/**
 * AI Extraction Service
 * Implements lightweight context strategy from AI_EXTRACTION_STRATEGY.md
 *
 * SECURITY FEATURES:
 * - Zod schema validation for all AI responses
 * - Rate limiting to prevent API abuse
 * - Structured error handling
 */

// Re-export rate limiter for external use
export { ExtractionRateLimiter, type RateLimitStatus };

// Singleton rate limiter instance
const rateLimiter = new ExtractionRateLimiter();

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(): RateLimitStatus {
  return rateLimiter.getStatus();
}

/**
 * Reset rate limiter (for testing or admin purposes)
 */
export function resetRateLimiter(): void {
  rateLimiter.reset();
}

// Flexible schema for parsing AI responses that may not perfectly match our strict schema
const flexibleExtractedPersonSchema = z.object({
  id: z.string(),
  name: z.string(),
  isNew: z.boolean(),
  potentialDuplicateOf: z.string().nullable().optional(),
  personType: personTypeEnum.catch('placeholder'),
  confidence: z.number().min(0).max(1),
});

const flexibleExtractedRelationSchema = z.object({
  subjectId: z.string(),
  subjectName: z.string(),
  relationType: z.string(), // Accept any string, validate later
  objectLabel: z.string(),
  objectType: z.string().optional(),
  intensity: intensityEnum.optional(),
  confidence: z.number().min(0).max(1),
  category: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  status: relationStatusEnum.optional(),
  source: z.string().default('ai_extraction'),
});

const flexibleExtractionResultSchema = z.object({
  people: z.array(flexibleExtractedPersonSchema).default([]),
  relations: z.array(flexibleExtractedRelationSchema).default([]),
  conflicts: z
    .array(
      z.object({
        type: z.string(),
        description: z.string(),
        existingRelationId: z.string().optional(),
        newRelation: flexibleExtractedRelationSchema.optional(),
      })
    )
    .default([]),
});

interface ExtractedPerson {
  id: string;
  name: string;
  isNew: boolean;
  potentialDuplicateOf: string | null;
  personType: 'primary' | 'mentioned' | 'placeholder';
  confidence: number;
}

interface ExtractedRelation {
  subjectId: string;
  subjectName: string;
  relationType: string;
  objectLabel: string;
  objectType?: string;
  intensity?: 'weak' | 'medium' | 'strong' | 'very_strong';
  confidence: number;
  category?: string;
  metadata?: Record<string, any>;
  status?: 'current' | 'past' | 'future' | 'aspiration';
  source: string;
}

interface ExtractionConflict {
  type: string;
  description: string;
  existingRelationId?: string;
  newRelation?: ExtractedRelation;
}

export interface ExtractionResult {
  people: ExtractedPerson[];
  relations: ExtractedRelation[];
  conflicts: ExtractionConflict[];
  rawResponse?: string;
  tokensUsed?: number;
  processingTime?: number;
  rateLimitStatus?: RateLimitStatus;
}

export class ExtractionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'RATE_LIMITED'
      | 'VALIDATION_ERROR'
      | 'API_ERROR'
      | 'PARSE_ERROR'
      | 'UNKNOWN',
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ExtractionError';
  }
}

/**
 * Validate and sanitize extraction result from AI
 * Filters out invalid relations and normalizes data
 */
function validateExtractionResult(parsed: unknown): {
  people: ExtractedPerson[];
  relations: ExtractedRelation[];
  conflicts: ExtractionConflict[];
  validationWarnings: string[];
} {
  const warnings: string[] = [];

  // Parse with flexible schema first
  const result = flexibleExtractionResultSchema.safeParse(parsed);

  if (!result.success) {
    throw new ExtractionError(
      `Invalid extraction result structure: ${result.error.message}`,
      'VALIDATION_ERROR',
      result.error.issues
    );
  }

  const data = result.data;

  // Validate and filter relations with valid relation types
  const validRelationTypes = relationTypeEnum.options;
  const validatedRelations = data.relations.filter((rel) => {
    if (!validRelationTypes.includes(rel.relationType as (typeof validRelationTypes)[number])) {
      warnings.push(`Filtered out relation with unknown type: ${rel.relationType}`);
      return false;
    }
    return true;
  });

  // Normalize people data with explicit typing
  const validatedPeople: ExtractedPerson[] = data.people.map((person) => ({
    id: person.id,
    name: person.name,
    isNew: person.isNew,
    potentialDuplicateOf: person.potentialDuplicateOf ?? null,
    personType: person.personType,
    confidence: person.confidence,
  }));

  // Filter conflicts with valid newRelation if present
  const validatedConflicts: ExtractionConflict[] = data.conflicts.map((conflict) => ({
    type: conflict.type ?? 'unknown',
    description: conflict.description ?? '',
    existingRelationId: conflict.existingRelationId,
    newRelation: conflict.newRelation as ExtractedRelation | undefined,
  }));

  return {
    people: validatedPeople,
    relations: validatedRelations as ExtractedRelation[],
    conflicts: validatedConflicts,
    validationWarnings: warnings,
  };
}

/**
 * Extract relations from a story using Claude 3.5 Sonnet
 *
 * SECURITY:
 * - Rate limited to prevent API abuse (10 requests/minute, 100/hour, 500/day)
 * - All AI responses are validated with Zod schemas
 * - Invalid data is filtered out with warnings
 *
 * @throws {ExtractionError} with specific error codes for different failure modes
 */
export async function extractRelationsFromStory(
  storyText: string,
  existingPeople: Array<{ id: string; name: string }>,
  apiKey: string,
  existingRelations?: Array<{
    relationType: string;
    objectLabel: string;
    subjectId: string;
    subjectName: string;
  }>,
  options?: {
    skipRateLimiting?: boolean; // For testing only
  }
): Promise<ExtractionResult> {
  const startTime = Date.now();

  // Check rate limit (unless explicitly skipped for testing)
  if (!options?.skipRateLimiting) {
    const rateLimitCheck = rateLimiter.checkLimit();
    if (!rateLimitCheck.allowed) {
      throw new ExtractionError(
        `Rate limit exceeded. ${rateLimitCheck.retryAfterSeconds ? `Retry after ${rateLimitCheck.retryAfterSeconds} seconds.` : ''} ` +
          `Limits: ${rateLimitCheck.remainingMinute}/min, ${rateLimitCheck.remainingHour}/hour, ${rateLimitCheck.remainingDay}/day`,
        'RATE_LIMITED',
        rateLimitCheck
      );
    }
  }

  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey,
  });

  // Create extraction context (lightweight - only names, not full profiles)
  const context: ExtractionContext = {
    existingPeople,
    existingRelations,
    storyText,
  };

  // Generate prompt
  const prompt = createExtractionPrompt(context);

  try {
    // Record the extraction attempt
    rateLimiter.recordRequest();

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.3, // Low temperature for consistent structured output
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text content
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new ExtractionError('Unexpected response type from Claude API', 'API_ERROR');
    }

    const rawResponse = content.text;

    // Parse JSON response
    // Claude might wrap JSON in markdown code blocks
    const jsonMatch = rawResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || [
      null,
      rawResponse,
    ];
    const jsonText = jsonMatch[1] || rawResponse;

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText.trim());
    } catch (parseError) {
      throw new ExtractionError(
        `Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`,
        'PARSE_ERROR',
        { rawResponse: rawResponse.substring(0, 500) }
      );
    }

    // Validate with Zod schema
    const validated = validateExtractionResult(parsed);

    const processingTime = Date.now() - startTime;

    return {
      people: validated.people,
      relations: validated.relations,
      conflicts: validated.conflicts,
      rawResponse,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      processingTime,
      rateLimitStatus: rateLimiter.getStatus(),
    };
  } catch (error) {
    // Re-throw ExtractionError as-is
    if (error instanceof ExtractionError) {
      throw error;
    }

    // Wrap other errors
    throw new ExtractionError(
      `Failed to extract relations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UNKNOWN',
      error
    );
  }
}

/**
 * Auto-accept rules based on confidence thresholds
 * From AI_EXTRACTION_STRATEGY.md
 */
export function shouldAutoAccept(relation: ExtractedRelation): boolean {
  const { relationType, confidence } = relation;

  // Safe relations (low risk)
  const safeRelations = ['LIKES', 'DISLIKES', 'KNOWS', 'ASSOCIATED_WITH', 'EXPERIENCED'];
  if (safeRelations.includes(relationType) && confidence >= 0.85) {
    return true;
  }

  // Sensitive relations (higher risk)
  const sensitiveRelations = ['FEARS', 'STRUGGLES_WITH', 'UNCOMFORTABLE_WITH', 'SENSITIVE_TO'];
  if (sensitiveRelations.includes(relationType) && confidence >= 0.9) {
    return true;
  }

  // Person-to-person relations (very high threshold)
  const personRelations = ['CARES_FOR', 'DEPENDS_ON'];
  if (personRelations.includes(relationType) && confidence >= 0.95) {
    return true;
  }

  // Beliefs always require review
  if (relationType === 'BELIEVES') {
    return false;
  }

  return false;
}

/**
 * Calculate duplicate confidence score
 * From AI_EXTRACTION_STRATEGY.md - 4-signal approach
 */
export function calculateDuplicateConfidence(
  newName: string,
  existingPerson: { id: string; name: string; nickname?: string | null }
): number {
  let confidence = 0;

  // Signal 1: Exact name match (case-insensitive)
  if (existingPerson.name.toLowerCase() === newName.toLowerCase()) {
    confidence += 0.5;
  }

  // Signal 2: Nickname match
  if (existingPerson.nickname?.toLowerCase() === newName.toLowerCase()) {
    confidence += 0.4;
  }

  // Signal 3: Substring match
  if (
    existingPerson.name.toLowerCase().includes(newName.toLowerCase()) ||
    newName.toLowerCase().includes(existingPerson.name.toLowerCase())
  ) {
    confidence += 0.3;
  }

  // Signal 4: First name match
  const newFirstName = newName.split(' ')[0].toLowerCase();
  const existingFirstName = existingPerson.name.split(' ')[0].toLowerCase();
  if (newFirstName === existingFirstName) {
    confidence += 0.2;
  }

  return Math.min(confidence, 1.0);
}

/**
 * Estimate extraction cost
 */
export function estimateExtractionCost(
  storyLength: number,
  existingPeopleCount: number
): { estimatedTokens: number; estimatedCost: number } {
  // Rough estimates from AI_EXTRACTION_STRATEGY.md
  const basePromptTokens = 500;
  const storyTokens = Math.ceil(storyLength / 4); // ~4 chars per token
  const peopleListTokens = existingPeopleCount * 10; // ~10 tokens per person name
  const outputTokens = 1000; // Average output

  const estimatedTokens = basePromptTokens + storyTokens + peopleListTokens + outputTokens;

  // Claude 3.5 Sonnet pricing (as of Nov 2024)
  const inputCostPer1M = 3.0; // $3 per 1M input tokens
  const outputCostPer1M = 15.0; // $15 per 1M output tokens

  const inputCost =
    ((basePromptTokens + storyTokens + peopleListTokens) / 1_000_000) * inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * outputCostPer1M;

  return {
    estimatedTokens,
    estimatedCost: inputCost + outputCost,
  };
}
