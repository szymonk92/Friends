/**
 * AI Extraction Prompt Templates
 * Based on AI_EXTRACTION_STRATEGY.md
 */

export interface ExtractionContext {
  existingPeople: Array<{ id: string; name: string }>;
  storyText: string;
}

/**
 * Main extraction prompt for Claude
 * Uses lightweight context (only person names, not full profiles)
 */
export function createExtractionPrompt(context: ExtractionContext): string {
  const { existingPeople, storyText } = context;

  const existingPeopleList =
    existingPeople.length > 0
      ? existingPeople.map((p) => `- ${p.name} (ID: ${p.id})`).join('\n')
      : 'None yet';

  return `You are an AI assistant that extracts structured relationship data from stories about people.

EXISTING PEOPLE IN DATABASE:
${existingPeopleList}

STORY TO ANALYZE:
"${storyText}"

YOUR TASK:
Extract all people mentioned and their relations (preferences, facts, experiences, etc.)

RELATION TYPES (use exactly these):
- KNOWS: knows a person/place/thing
- LIKES: enjoys, prefers, loves
- DISLIKES: dislikes, hates, avoids
- ASSOCIATED_WITH: connected to a place, group, organization
- EXPERIENCED: went through an event or experience
- HAS_SKILL: has ability or skill
- OWNS: possesses something
- HAS_IMPORTANT_DATE: birthday, anniversary, etc.
- IS: identity, role, profession, trait
- BELIEVES: holds belief, opinion, value
- FEARS: afraid of, anxious about
- WANTS_TO_ACHIEVE: goal, aspiration, dream
- STRUGGLES_WITH: difficulty, challenge, problem
- CARES_FOR: looks after, supports (person or cause)
- DEPENDS_ON: relies on (person, thing, or activity)
- REGULARLY_DOES: habit, routine, regular activity
- PREFERS_OVER: prefers X over Y
- USED_TO_BE: past identity, role, or habit
- SENSITIVE_TO: emotionally sensitive topic
- UNCOMFORTABLE_WITH: makes them uncomfortable

DUPLICATE DETECTION:
- If a mentioned person matches an existing person (same or similar name), use the existing person's ID
- If unsure, create a new person and flag as potential duplicate

RESPONSE FORMAT (JSON):
{
  "people": [
    {
      "id": "existing-id-or-new-uuid",
      "name": "Full Name",
      "isNew": true/false,
      "potentialDuplicateOf": "person-id or null",
      "personType": "primary" | "mentioned" | "placeholder",
      "confidence": 0.0-1.0
    }
  ],
  "relations": [
    {
      "subjectId": "person-id",
      "subjectName": "Person Name",
      "relationType": "LIKES" | "DISLIKES" | etc.,
      "objectLabel": "what they like/dislike/etc",
      "objectType": "food" | "activity" | "person" | etc.,
      "intensity": "weak" | "medium" | "strong" | "very_strong",
      "confidence": 0.0-1.0,
      "category": "food" | "sport" | "music" | etc.,
      "metadata": {
        // Type-specific metadata
      },
      "status": "current" | "past" | "future" | "aspiration",
      "source": "ai_extraction"
    }
  ],
  "conflicts": [
    {
      "type": "contradiction",
      "description": "Emma is said to be vegan but also likes steak",
      "existingRelationId": "relation-id-if-known",
      "newRelation": { /* the conflicting relation */ }
    }
  ]
}

IMPORTANT:
- Be conservative with confidence scores (0.7-0.85 for clear facts, 0.5-0.7 for implied)
- Flag potential conflicts with existing data
- Use "mentioned" for people only referenced (e.g., "Sarah's mother")
- Use "primary" for main people in the story
- Extract temporal info (validFrom/validTo) when dates are mentioned`;
}

/**
 * Simplified prompt for question mode (Phase 2)
 */
export function createQuestionPrompt(personName: string, question: string): string {
  return `Answer this question about ${personName}: ${question}

Extract any new information as relations. Respond in the same JSON format as the main extraction.`;
}

/**
 * Validation prompt for conflict detection (Phase 2 of extraction)
 */
export function createValidationPrompt(
  personName: string,
  existingRelations: Array<{ relationType: string; objectLabel: string; status: string }>,
  newRelation: any
): string {
  return `PERSON: ${personName}

EXISTING RELATIONS:
${existingRelations.map((r) => `- ${r.relationType}: ${r.objectLabel} (${r.status})`).join('\n')}

NEW RELATION TO VALIDATE:
${JSON.stringify(newRelation, null, 2)}

Does this new relation conflict with any existing relations?

RESPOND WITH JSON:
{
  "hasConflict": true/false,
  "conflictType": "contradiction" | "update" | "refinement" | null,
  "conflictingRelationIds": ["id1", "id2"],
  "reasoning": "explanation",
  "recommendation": "replace" | "add_both" | "mark_old_as_past" | "reject"
}`;
}
