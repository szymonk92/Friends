/**
 * AI Extraction Prompt Variants
 * Multiple versions to test for optimal extraction quality
 */

import type { ExtractionContext } from '../prompts';

/**
 * Version 1: Concise & Direct
 * Focus: Brevity while maintaining accuracy
 * Pros: Lower token usage, faster responses
 * Cons: May miss edge cases
 */
export function createPromptV1(context: ExtractionContext): string {
  const { existingPeople, existingRelations: _existingRelations, storyText } = context;

  const peopleList =
    existingPeople.length > 0
      ? existingPeople.map((p) => `${p.name} (${p.id})`).join(', ')
      : 'None';

  return `Extract relationship data from this story about people.

KNOWN PEOPLE: ${peopleList}

STORY:
"${storyText}"

EXTRACT:
1. People mentioned (match to known people when possible)
2. Relations: what people LIKE, DISLIKE, ARE (traits), DO, KNOW, etc.
3. Conflicts with existing data

RELATION TYPES:
LIKES, DISLIKES, IS, KNOWS, HAS_SKILL, OWNS, FEARS, WANTS_TO_ACHIEVE, STRUGGLES_WITH, SENSITIVE_TO, REGULARLY_DOES, BELIEVES

RESPOND WITH JSON:
{
  "people": [{"id": "uuid", "name": "Name", "isNew": bool, "personType": "primary|mentioned", "confidence": 0.0-1.0}],
  "relations": [{"subjectId": "person-uuid", "subjectName": "Name", "relationType": "LIKES", "objectLabel": "thing", "intensity": "weak|medium|strong", "confidence": 0.0-1.0, "category": "food|activity|etc"}],
  "conflicts": [{"type": "contradiction", "description": "what conflicts", "reasoning": "why it conflicts"}]
}

IMPORTANT: Check for ingredient/dietary conflicts! (e.g., "vegan" + "likes cheese" = CONFLICT)`;
}

/**
 * Version 2: Chain-of-Thought Reasoning
 * Focus: Explicit reasoning steps for better accuracy
 * Pros: Better conflict detection, higher quality
 * Cons: Higher token usage
 */
export function createPromptV2(context: ExtractionContext): string {
  const { existingPeople, existingRelations, storyText } = context;

  const peopleList =
    existingPeople.length > 0
      ? existingPeople.map((p) => `- ${p.name} (ID: ${p.id})`).join('\n')
      : 'None';

  const relationsList =
    existingRelations && existingRelations.length > 0
      ? existingRelations
          .map((r) => `- ${r.subjectName}: ${r.relationType} "${r.objectLabel}"`)
          .join('\n')
      : 'None';

  return `You are extracting structured relationship data. Think step-by-step.

EXISTING DATABASE:
People:
${peopleList}

Known Relations:
${relationsList}

STORY TO ANALYZE:
"${storyText}"

STEP 1 - IDENTIFY PEOPLE:
List every person mentioned. For each:
- Check if they match an existing person (same/similar name)
- Determine if they're primary (main subject) or mentioned (referenced)
- Assign confidence score

STEP 2 - EXTRACT RELATIONS:
For each fact about a person, determine:
- Subject: Who is this about?
- Type: What kind of relation? (LIKES, DISLIKES, IS, KNOWS, HAS_SKILL, OWNS, FEARS, WANTS_TO_ACHIEVE, STRUGGLES_WITH, SENSITIVE_TO, REGULARLY_DOES, BELIEVES)
- Object: What do they like/dislike/have/etc.?
- Intensity: How strong? (weak/medium/strong/very_strong)
- Category: food, activity, person, place, trait, etc.

STEP 3 - DETECT CONFLICTS:
For EACH new relation, check against ALL existing relations:
- Direct contradiction? (LIKES X vs DISLIKES X)
- Ingredient conflict? (SENSITIVE_TO potatoes vs LIKES fries)
- Dietary conflict? (IS vegan vs LIKES cheese)

INGREDIENT KNOWLEDGE:
- Fries = potatoes
- Pizza/cheese/ice cream = dairy
- Bacon/ham/sausage = pork
- Bread/pasta = wheat/gluten

RESPOND WITH JSON:
{
  "reasoning": "Your step-by-step analysis here",
  "people": [{
    "id": "existing-id-or-new-uuid",
    "name": "Full Name",
    "isNew": true/false,
    "personType": "primary" | "mentioned",
    "confidence": 0.0-1.0
  }],
  "relations": [{
    "subjectId": "person-id",
    "subjectName": "Name",
    "relationType": "LIKES",
    "objectLabel": "coffee",
    "intensity": "strong",
    "confidence": 0.85,
    "category": "food",
    "status": "current"
  }],
  "conflicts": [{
    "type": "ingredient_conflict",
    "description": "Likes fries but is sensitive to potatoes",
    "reasoning": "Fries are made from potatoes"
  }]
}`;
}

/**
 * Version 3: Few-Shot Learning
 * Focus: Learn from examples
 * Pros: Consistent output format, learns edge cases
 * Cons: Long prompt, highest token usage
 */
export function createPromptV3(context: ExtractionContext): string {
  const { existingPeople, existingRelations: _existingRelations, storyText } = context;

  const peopleList =
    existingPeople.length > 0
      ? existingPeople.map((p) => `- ${p.name} (${p.id})`).join('\n')
      : 'None';

  return `Extract relationship data from stories. Learn from these examples:

EXAMPLE 1:
Story: "Had lunch with Sarah today. She mentioned she's now vegan and really into hiking."
Output:
{
  "people": [{"id": "existing-sarah-id", "name": "Sarah", "isNew": false, "personType": "primary", "confidence": 1.0}],
  "relations": [
    {"subjectId": "existing-sarah-id", "subjectName": "Sarah", "relationType": "IS", "objectLabel": "vegan", "intensity": "strong", "confidence": 0.9, "category": "diet"},
    {"subjectId": "existing-sarah-id", "subjectName": "Sarah", "relationType": "LIKES", "objectLabel": "hiking", "intensity": "strong", "confidence": 0.85, "category": "activity"}
  ],
  "conflicts": []
}

EXAMPLE 2:
Story: "Mike can't have dairy - he's lactose intolerant. But he said his favorite dessert is cheesecake."
Output:
{
  "people": [{"id": "mike-uuid", "name": "Mike", "isNew": true, "personType": "primary", "confidence": 1.0}],
  "relations": [
    {"subjectId": "mike-uuid", "subjectName": "Mike", "relationType": "SENSITIVE_TO", "objectLabel": "dairy", "intensity": "strong", "confidence": 0.95, "category": "allergy"},
    {"subjectId": "mike-uuid", "subjectName": "Mike", "relationType": "LIKES", "objectLabel": "cheesecake", "intensity": "strong", "confidence": 0.8, "category": "food"}
  ],
  "conflicts": [{
    "type": "ingredient_conflict",
    "description": "Likes cheesecake but is lactose intolerant",
    "reasoning": "Cheesecake contains cream cheese and other dairy products which lactose intolerant people cannot digest"
  }]
}

EXAMPLE 3:
Story: "Emma is terrified of dogs but she started dating Tom who has two golden retrievers."
Output:
{
  "people": [
    {"id": "emma-uuid", "name": "Emma", "isNew": true, "personType": "primary", "confidence": 1.0},
    {"id": "tom-uuid", "name": "Tom", "isNew": true, "personType": "mentioned", "confidence": 0.9}
  ],
  "relations": [
    {"subjectId": "emma-uuid", "subjectName": "Emma", "relationType": "FEARS", "objectLabel": "dogs", "intensity": "very_strong", "confidence": 0.95, "category": "animal"},
    {"subjectId": "emma-uuid", "subjectName": "Emma", "relationType": "KNOWS", "objectLabel": "Tom", "intensity": "strong", "confidence": 0.9, "category": "person"},
    {"subjectId": "tom-uuid", "subjectName": "Tom", "relationType": "OWNS", "objectLabel": "two golden retrievers", "intensity": "strong", "confidence": 0.9, "category": "pet"}
  ],
  "conflicts": []
}

NOW YOUR TURN:

KNOWN PEOPLE:
${peopleList}

STORY:
"${storyText}"

RELATION TYPES: LIKES, DISLIKES, IS, KNOWS, HAS_SKILL, OWNS, FEARS, WANTS_TO_ACHIEVE, STRUGGLES_WITH, SENSITIVE_TO, REGULARLY_DOES, BELIEVES, UNCOMFORTABLE_WITH

Extract people and relations following the exact format above. Check for conflicts!`;
}

/**
 * Version 4: Structured Template
 * Focus: Explicit field-by-field extraction
 * Pros: Very consistent, easy to parse
 * Cons: May be too rigid
 */
export function createPromptV4(context: ExtractionContext): string {
  const { existingPeople, storyText } = context;

  const peopleIds = existingPeople.map((p) => p.id).join(', ') || 'none';
  const peopleNames = existingPeople.map((p) => p.name).join(', ') || 'none';

  return `TASK: Parse story into structured relationship data

DATABASE_STATE:
known_person_ids: [${peopleIds}]
known_person_names: [${peopleNames}]

INPUT_STORY: "${storyText}"

EXTRACTION_RULES:
1. Match names to known_person_ids when possible (case-insensitive)
2. Create new UUID for unknown people
3. Confidence: 0.9+ for explicit facts, 0.7-0.9 for implied facts, 0.5-0.7 for uncertain
4. Intensity: weak (slight), medium (normal), strong (emphasized), very_strong (extreme)

SCHEMA:
{
  "people": Array<{
    id: string,           // existing ID or new UUID
    name: string,         // full name as mentioned
    isNew: boolean,       // false if matched to known person
    personType: "primary" | "mentioned",
    confidence: number    // 0.0 to 1.0
  }>,
  "relations": Array<{
    subjectId: string,    // person ID
    subjectName: string,  // person name
    relationType: "LIKES" | "DISLIKES" | "IS" | "KNOWS" | "HAS_SKILL" | "OWNS" | "FEARS" | "WANTS_TO_ACHIEVE" | "STRUGGLES_WITH" | "SENSITIVE_TO" | "REGULARLY_DOES" | "BELIEVES",
    objectLabel: string,  // what they like/dislike/are/etc.
    intensity: "weak" | "medium" | "strong" | "very_strong",
    confidence: number,   // 0.0 to 1.0
    category: string      // food, activity, trait, person, place, etc.
  }>,
  "conflicts": Array<{
    type: "direct_contradiction" | "ingredient_conflict" | "dietary_conflict",
    description: string,  // brief conflict description
    reasoning: string     // why this is a conflict
  }>
}

CONFLICT_CHECK:
Before finalizing, verify no new relation contradicts:
- Direct opposites (LIKES vs DISLIKES same thing)
- Ingredient containment (allergic to X but likes food containing X)
- Dietary restrictions (vegan but likes non-vegan food)

OUTPUT: Valid JSON matching the schema above`;
}

// Test function to evaluate prompts
export interface PromptTestCase {
  name: string;
  story: string;
  existingPeople: Array<{ id: string; name: string }>;
  existingRelations?: Array<{
    relationType: string;
    objectLabel: string;
    subjectId: string;
    subjectName: string;
  }>;
  expectedPeopleCount: number;
  expectedRelationTypes: string[];
  shouldHaveConflicts: boolean;
}

export const testCases: PromptTestCase[] = [
  {
    name: 'Simple likes/dislikes',
    story:
      'Had coffee with John today. He loves carrots but absolutely hates broccoli. He also mentioned he started running every morning.',
    existingPeople: [{ id: 'john-123', name: 'John Smith' }],
    expectedPeopleCount: 1,
    expectedRelationTypes: ['LIKES', 'DISLIKES', 'REGULARLY_DOES'],
    shouldHaveConflicts: false,
  },
  {
    name: 'Dietary conflict detection',
    story:
      'Sarah told me she went vegan last month. She said she really misses eating cheese pizza.',
    existingPeople: [{ id: 'sarah-456', name: 'Sarah' }],
    existingRelations: [
      {
        relationType: 'LIKES',
        objectLabel: 'cheese pizza',
        subjectId: 'sarah-456',
        subjectName: 'Sarah',
      },
    ],
    expectedPeopleCount: 1,
    expectedRelationTypes: ['IS'],
    shouldHaveConflicts: true,
  },
  {
    name: 'Ingredient conflict',
    story: 'Mike mentioned he developed a potato allergy recently.',
    existingPeople: [{ id: 'mike-789', name: 'Mike' }],
    existingRelations: [
      {
        relationType: 'LIKES',
        objectLabel: 'french fries',
        subjectId: 'mike-789',
        subjectName: 'Mike',
      },
    ],
    expectedPeopleCount: 1,
    expectedRelationTypes: ['SENSITIVE_TO'],
    shouldHaveConflicts: true,
  },
  {
    name: 'Multiple people extraction',
    story:
      'At the party, I met Emma who is a software engineer. Her boyfriend Tom is a chef who specializes in Italian cuisine. They both love traveling.',
    existingPeople: [],
    expectedPeopleCount: 2,
    expectedRelationTypes: ['IS', 'HAS_SKILL', 'LIKES', 'KNOWS'],
    shouldHaveConflicts: false,
  },
  {
    name: 'Complex traits and fears',
    story:
      'Lisa struggles with anxiety and is afraid of flying. She wants to overcome this because her dream is to visit Japan.',
    existingPeople: [{ id: 'lisa-111', name: 'Lisa' }],
    expectedPeopleCount: 1,
    expectedRelationTypes: ['STRUGGLES_WITH', 'FEARS', 'WANTS_TO_ACHIEVE'],
    shouldHaveConflicts: false,
  },
];

export function evaluateExtraction(
  result: any,
  testCase: PromptTestCase
): { passed: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check people count
  if (result.people?.length !== testCase.expectedPeopleCount) {
    issues.push(
      `Expected ${testCase.expectedPeopleCount} people, got ${result.people?.length || 0}`
    );
  }

  // Check relation types
  const extractedTypes = result.relations?.map((r: any) => r.relationType) || [];
  for (const expectedType of testCase.expectedRelationTypes) {
    if (!extractedTypes.includes(expectedType)) {
      issues.push(`Missing expected relation type: ${expectedType}`);
    }
  }

  // Check conflicts
  const hasConflicts = (result.conflicts?.length || 0) > 0;
  if (testCase.shouldHaveConflicts && !hasConflicts) {
    issues.push('Expected conflicts but none detected');
  }
  if (!testCase.shouldHaveConflicts && hasConflicts) {
    issues.push(`Unexpected conflicts: ${JSON.stringify(result.conflicts)}`);
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
