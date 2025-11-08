import Anthropic from '@anthropic-ai/sdk';
import { createExtractionPrompt, type ExtractionContext } from './prompts';

/**
 * AI Extraction Service
 * Implements lightweight context strategy from AI_EXTRACTION_STRATEGY.md
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
 * Extract relations from a story using Claude 3.5 Sonnet
 */
export async function extractRelationsFromStory(
  storyText: string,
  existingPeople: Array<{ id: string; name: string }>,
  apiKey: string
): Promise<ExtractionResult> {
  const startTime = Date.now();

  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey,
  });

  // Create extraction context (lightweight - only names, not full profiles)
  const context: ExtractionContext = {
    existingPeople,
    storyText,
  };

  // Generate prompt
  const prompt = createExtractionPrompt(context);

  try {
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
      throw new Error('Unexpected response type from Claude');
    }

    const rawResponse = content.text;

    // Parse JSON response
    // Claude might wrap JSON in markdown code blocks
    const jsonMatch = rawResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || [
      null,
      rawResponse,
    ];
    const jsonText = jsonMatch[1] || rawResponse;

    const parsed = JSON.parse(jsonText.trim());

    const processingTime = Date.now() - startTime;

    return {
      people: parsed.people || [],
      relations: parsed.relations || [],
      conflicts: parsed.conflicts || [],
      rawResponse,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      processingTime,
    };
  } catch (error) {
    console.error('AI extraction failed:', error);
    throw new Error(`Failed to extract relations: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  const sensitiveRelations = [
    'FEARS',
    'STRUGGLES_WITH',
    'UNCOMFORTABLE_WITH',
    'SENSITIVE_TO',
  ];
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

  const inputCost = ((basePromptTokens + storyTokens + peopleListTokens) / 1_000_000) * inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * outputCostPer1M;

  return {
    estimatedTokens,
    estimatedCost: inputCost + outputCost,
  };
}
