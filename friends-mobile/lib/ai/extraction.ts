import { createSystemPrompt } from './prompts';
import {
  createAISession,
  updateSessionContext,
  callAISession,
  parseExtractionResponse,
  type AIServiceConfig,
  type AISession,
  type AIDebugInfo,
} from './ai-service';

/**
 * AI Extraction Service
 * Implements lightweight context strategy from AI_EXTRACTION_STRATEGY.md
 * Supports multiple AI models: Anthropic Claude and Google Gemini
 */

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
  newRelation: ExtractedRelation;
}

export interface ExtractionResult {
  people: ExtractedPerson[];
  relations: ExtractedRelation[];
  conflicts: ExtractionConflict[];
  rawResponse?: string;
  tokensUsed?: number;
  processingTime?: number;
  debugInfo?: AIDebugInfo;
  ambiguousMatches?: Array<{
    nameInStory: string;
    possibleMatches: Array<{ id: string; name: string; reason: string }>;
  }>;
}

/**
 * Extract relations from a story using AI with session-based approach
 * This creates/maintains a session for more efficient context management
 */
export async function extractRelationsFromStorySession(
  storyText: string,
  existingPeople: Array<{ id: string; name: string }>,
  config: AIServiceConfig,
  existingRelations?: Array<{
    relationType: string;
    objectLabel: string;
    subjectId: string;
    subjectName: string;
  }>,
  sessionId?: string,
  explicitlyTaggedPeople?: Array<{ id: string; name: string }>,
  forceNewPeople?: string[]
): Promise<ExtractionResult> {
  const startTime = Date.now();

  // Create or get session
  let session: AISession;
  if (sessionId) {
    // For now, we'll create a new session each time since we don't persist them
    // In a production system, you'd load the session from storage
    session = createAISession(config, { systemPrompt: createSystemPrompt() });
  } else {
    session = createAISession(config, { systemPrompt: createSystemPrompt() });
  }

  // Filter existing people to only include those relevant to the story
  // This saves tokens and improves accuracy by reducing noise
  const relevantPeople = filterRelevantPeople(storyText, existingPeople);

  // Update context with current people and relations
  const contextUpdate = createContextUpdate(
    relevantPeople,
    existingRelations,
    explicitlyTaggedPeople,
    forceNewPeople
  );
  updateSessionContext(session.id, contextUpdate);

  // Create the extraction message
  const extractionMessage = `EXTRACT RELATIONS FROM THIS STORY:

"${storyText}"

Please analyze this story and extract people, their relationships, and any conflicts with existing data. Respond with JSON only.`;

  try {
    // Call AI with session
    const {
      response: rawResponse,
      tokensUsed,
      debugInfo,
    } = await callAISession(session.id, extractionMessage, config);

    // Attach the contextUpdate to debugInfo so it is persisted and visible in UIs
    if (debugInfo) {
      (debugInfo as any).contextUpdate = contextUpdate;
    }

    // Parse JSON response
    const parsed = parseExtractionResponse(rawResponse);

    const processingTime = Date.now() - startTime;

    return {
      people: parsed.people || [],
      relations: parsed.relations || [],
      conflicts: parsed.conflicts || [],
      rawResponse,
      tokensUsed,
      processingTime,
      debugInfo,
      ambiguousMatches: parsed.ambiguousMatches || [],
    };
  } catch (error) {
    console.error('AI extraction failed:', error);
    throw new Error(
      `Failed to extract relations: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Create context update message for session
 */
function createContextUpdate(
  existingPeople: Array<{ id: string; name: string }>,
  existingRelations?: Array<{
    relationType: string;
    objectLabel: string;
    subjectId: string;
    subjectName: string;
  }>,
  explicitlyTaggedPeople?: Array<{ id: string; name: string }>,
  forceNewPeople?: string[]
): string {
  let update = 'CURRENT DATABASE STATE:\n\n';

  update += 'EXISTING PEOPLE:\n';
  if (existingPeople.length > 0) {
    existingPeople.forEach((person) => {
      update += `- ${person.name} (ID: ${person.id})\n`;
    });
  } else {
    update += 'None yet\n';
  }

  update += '\nEXPLICITLY TAGGED PEOPLE (CONFIRMED PRESENT):\n';
  if (explicitlyTaggedPeople && explicitlyTaggedPeople.length > 0) {
    explicitlyTaggedPeople.forEach((person) => {
      update += `- ${person.name} (ID: ${person.id}) [CONFIRMED PRESENT]\n`;
    });
  } else {
    update += 'None\n';
  }

  update += '\nCONFIRMED NEW PEOPLE (DO NOT LINK TO EXISTING):\n';
  if (forceNewPeople && forceNewPeople.length > 0) {
    forceNewPeople.forEach((name) => {
      update += `- ${name} [CONFIRMED NEW PERSON]\n`;
    });
  } else {
    update += 'None\n';
  }

  update += '\nEXISTING RELATIONS:\n';
  if (existingRelations && existingRelations.length > 0) {
    existingRelations.forEach((relation) => {
      update += `- ${relation.subjectName}: ${relation.relationType} "${relation.objectLabel}"\n`;
    });
  } else {
    update += 'None yet\n';
  }

  return update;
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

/**
 * Filter people to only include those likely relevant to the story
 * Uses simple string matching to find potential mentions
 */
function filterRelevantPeople(
  storyText: string,
  allPeople: Array<{ id: string; name: string }>
): Array<{ id: string; name: string }> {
  const normalizedStory = storyText.toLowerCase();

  return allPeople.filter((person) => {
    const nameParts = person.name.toLowerCase().split(' ');

    // Check full name
    if (normalizedStory.includes(person.name.toLowerCase())) return true;

    // Check first name (if longer than 2 chars to avoid noise)
    if (nameParts[0].length > 2 && normalizedStory.includes(nameParts[0])) return true;

    // Check last name (if exists and longer than 2 chars)
    if (
      nameParts.length > 1 &&
      nameParts[nameParts.length - 1].length > 2 &&
      normalizedStory.includes(nameParts[nameParts.length - 1])
    )
      return true;

    return false;
  });
}
