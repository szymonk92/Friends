import { createSystemPrompt } from './prompts';
import { 
  createAISession, 
  updateSessionContext, 
  callAISession,
  parseExtractionResponse,
  type AIServiceConfig,
  type AISession
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
  sessionId?: string
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

  // Update context with current people and relations
  const contextUpdate = createContextUpdate(existingPeople, existingRelations);
  updateSessionContext(session.id, contextUpdate);

  // Create the extraction message
  const extractionMessage = `EXTRACT RELATIONS FROM THIS STORY:

"${storyText}"

Please analyze this story and extract people, their relationships, and any conflicts with existing data. Respond with JSON only.`;

  try {
    // Call AI with session
    const { response: rawResponse, tokensUsed } = await callAISession(session.id, extractionMessage, config);

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
  }>
): string {
  let update = 'CURRENT DATABASE STATE:\n\n';

  update += 'EXISTING PEOPLE:\n';
  if (existingPeople.length > 0) {
    existingPeople.forEach(person => {
      update += `- ${person.name} (ID: ${person.id})\n`;
    });
  } else {
    update += 'None yet\n';
  }

  update += '\nEXISTING RELATIONS:\n';
  if (existingRelations && existingRelations.length > 0) {
    existingRelations.forEach(relation => {
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
