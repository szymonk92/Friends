/**
 * AI Extraction Prompt Templates
 * Based on AI_EXTRACTION_STRATEGY.md
 */

export interface ExtractionContext {
  existingPeople: Array<{ id: string; name: string }>;
  existingRelations?: Array<{
    relationType: string;
    objectLabel: string;
    subjectId: string;
    subjectName: string;
  }>;
  storyText: string;
}

/**
 * Main extraction prompt for Claude
 * Uses lightweight context (only person names, not full profiles)
 */
export function createExtractionPrompt(context: ExtractionContext): string {
  const { existingPeople, existingRelations, storyText } = context;

  const existingPeopleList =
    existingPeople.length > 0
      ? existingPeople.map((p) => `- ${p.name} (ID: ${p.id})`).join('\n')
      : 'None yet';

  const existingRelationsList =
    existingRelations && existingRelations.length > 0
      ? existingRelations
          .map((r) => `- ${r.subjectName}: ${r.relationType} "${r.objectLabel}"`)
          .join('\n')
      : 'None yet';

  return `You are an AI assistant that extracts structured relationship data from stories about people.

EXISTING PEOPLE IN DATABASE:
${existingPeopleList}

EXISTING RELATIONS:
${existingRelationsList}

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
- IS: identity, role, profession, trait (e.g., "vegan", "vegetarian", "lactose intolerant")
- BELIEVES: holds belief, opinion, value
- FEARS: afraid of, anxious about
- WANTS_TO_ACHIEVE: goal, aspiration, dream
- STRUGGLES_WITH: difficulty, challenge, problem
- CARES_FOR: looks after, supports (person or cause)
- DEPENDS_ON: relies on (person, thing, or activity)
- REGULARLY_DOES: habit, routine, regular activity
- PREFERS_OVER: prefers X over Y
- USED_TO_BE: past identity, role, or habit
- SENSITIVE_TO: allergic to, sensitive to (e.g., "SENSITIVE_TO: potatoes")
- UNCOMFORTABLE_WITH: makes them uncomfortable

⚠️ CRITICAL: CONFLICT DETECTION WITH DEEP REASONING ⚠️

You MUST detect conflicts using INGREDIENT-LEVEL and LOGICAL REASONING. Think deeply about implications!

CONFLICT TYPES TO DETECT:

1. DIRECT CONTRADICTIONS
   - Example: "LIKES ice cream" vs "DISLIKES ice cream"
   - Example: "IS vegan" vs "IS meat-eater"

2. INGREDIENT-LEVEL CONFLICTS (CRITICAL!)
   Think about what foods CONTAIN:
   - "SENSITIVE_TO: potatoes" conflicts with "LIKES: fries"
     → WHY? Fries are made from potatoes!
   - "SENSITIVE_TO: dairy" conflicts with "LIKES: ice cream"
     → WHY? Ice cream contains milk and cream!
   - "SENSITIVE_TO: peanuts" conflicts with "LIKES: peanut butter"
     → WHY? Peanut butter is made from peanuts!

3. DIETARY RESTRICTION IMPLICATIONS
   Think about what diets EXCLUDE:
   - "IS: vegan" conflicts with "LIKES: cheese"
     → WHY? Vegans don't eat dairy products!
   - "IS: vegan" conflicts with "LIKES: eggs"
     → WHY? Vegans don't eat eggs!
   - "IS: vegetarian" conflicts with "LIKES: fish"
     → WHY? Vegetarians don't eat fish!
   - "IS: vegetarian" conflicts with "LIKES: bacon"
     → WHY? Bacon is pork/meat!
   - "IS: lactose intolerant" conflicts with "REGULARLY_DOES: drinks milk"
     → WHY? Lactose intolerant people can't digest lactose in milk!
   - "IS: kosher" conflicts with "LIKES: pork"
     → WHY? Kosher diet prohibits pork!
   - "IS: halal" conflicts with "LIKES: bacon"
     → WHY? Halal diet prohibits pork!

4. INGREDIENT DERIVATIVES (THINK CAREFULLY!)
   Many foods are derivatives of base ingredients:
   - Potato → fries, chips, hash browns, mashed potatoes, potato salad
   - Dairy → milk, cheese, butter, yogurt, ice cream, cream
   - Eggs → mayonnaise, meringue, custard
   - Pork → bacon, ham, sausage, pepperoni, salami
   - Wheat → bread, pasta, crackers, beer
   - Nuts → peanut butter, almond milk, Nutella

EXAMPLES OF EDGE CASES:

Example 1:
Story: "John is allergic to potatoes"
Existing: "John LIKES: fries"
→ CONFLICT! "Cannot like fries while being allergic to potatoes (fries are made from potatoes)"

Example 2:
Story: "Sarah is vegan"
Existing: "Sarah LIKES: pizza"
→ POTENTIAL CONFLICT! Most pizza has cheese (dairy). Flag for review.

Example 3:
Story: "Mike loves ice cream"
Existing: "Mike IS: lactose intolerant"
→ CONFLICT! "Cannot love ice cream while being lactose intolerant (ice cream contains dairy)"

Example 4:
Story: "Emma is vegetarian now"
Existing: "Emma LIKES: sushi"
→ POTENTIAL CONFLICT! Some sushi has fish. Flag as: "Most sushi contains fish, which vegetarians avoid"

Example 5:
Story: "Tom hates cheese"
New: "Tom loves pizza"
→ CONFLICT! "Most pizza contains cheese"

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
      "type": "ingredient_conflict" | "dietary_conflict" | "direct_contradiction" | "logical_implication",
      "description": "Clear description of the conflict",
      "reasoning": "WHY this is a conflict (explain the ingredient/dietary connection)",
      "existingRelationId": "relation-id-if-known",
      "newRelation": {
        "subjectId": "...",
        "relationType": "...",
        "objectLabel": "..."
      }
    }
  ]
}

IMPORTANT:
- THINK DEEPLY about ingredient composition and dietary restrictions
- Be conservative with confidence scores (0.7-0.85 for clear facts, 0.5-0.7 for implied)
- ALWAYS explain WHY there's a conflict (ingredient reasoning)
- Use "mentioned" for people only referenced (e.g., "Sarah's mother")
- Use "primary" for main people in the story
- Extract temporal info (validFrom/validTo) when dates are mentioned
- For allergies/sensitivities, use "SENSITIVE_TO" relation type`;
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
