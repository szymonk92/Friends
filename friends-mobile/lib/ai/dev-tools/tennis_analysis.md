# Tennis Example: Real Analysis

## The Story

```
"Played tennis on Tuesday with Falko, David, and Ola. Our trainer was David."
```

## Database State Before

- **David Smith** (id: david-1) - existing
- **Ola Kowalska** (id: ola-1) - existing
- No "Falko"

## What Our Prompt Says

```
4. **PLAIN NAMES (Ambiguity Check)**:
   - If the user writes just "Name" (no @) and it matches an existing person:
     - IF the name is very unique (e.g., "Xavier"), assume it's them.
     - IF the name is common (e.g., "Ola", "David", "Mike") AND there is NO explicit context (like "my wife Ola"), you MUST flag it as AMBIGUOUS.
```

## The Problem: The Prompt Is Ambiguous!

Our prompt says **"flag as AMBIGUOUS"** but what does that actually mean?

Looking at the JSON format we defined:

```json
"ambiguousMatches": [
  {
    "nameInStory": "Name as it appears in story",
    "possibleMatches": [
      { "id": "existing-id", "name": "Existing Name", "reason": "Exact match" }
    ]
  }
]
```

So the AI should:

1. **NOT** add them to the `people` array
2. **NOT** create relations for them
3. **INSTEAD** add them to `ambiguousMatches`

## Expected AI Response (Based on Our Prompt)

```json
{
  "people": [
    {
      "id": "NEW-falko",
      "name": "Falko",
      "isNew": true,
      "personType": "primary",
      "confidence": 0.95
    }
  ],
  "relations": [
    {
      "subjectId": "NEW-falko",
      "subjectName": "Falko",
      "relationType": "EXPERIENCED",
      "objectLabel": "playing tennis",
      "confidence": 0.9
    }
  ],
  "ambiguousMatches": [
    {
      "nameInStory": "David",
      "possibleMatches": [{ "id": "david-1", "name": "David Smith", "reason": "Name match" }]
    },
    {
      "nameInStory": "Ola",
      "possibleMatches": [{ "id": "ola-1", "name": "Ola Kowalska", "reason": "Name match" }]
    }
  ]
}
```

## What Happens Next (Our Code)

1. **addStory.tsx** checks: `result.ambiguousMatches.length > 0` → TRUE
2. Opens `AmbiguityResolutionDialog`
3. User sees:
   - "Who is 'David'?" → Options: David Smith, Create New, Ignore
   - "Who is 'Ola'?" → Options: Ola Kowalska, Create New, Ignore

## The "Trainer David" Issue

The story says "Our trainer was David" - which creates a complex scenario:

- Player David (ambiguous with David Smith)
- Trainer David (could be the same or different)

**What SHOULD happen:**
The AI might be smart enough to notice duplicate "David" mentions and ask:

```json
"ambiguousMatches": [
  {
    "nameInStory": "David (player)",
    "possibleMatches": [
      { "id": "david-1", "name": "David Smith", "reason": "Name match" }
    ]
  },
  {
    "nameInStory": "David (trainer)",
    "possibleMatches": [
      { "id": "david-1", "name": "David Smith", "reason": "Name match" }
    ]
  }
]
```

**What MIGHT happen:**
The AI could infer they're the same person and only ask once.

## The REAL Issue: We Need to Test This!

We have the code, but we don't know if:

1. The AI will actually follow our "flag as ambiguous" instruction
2. The AI will handle duplicate mentions correctly
3. The AI will leave ambiguous people OUT of the `people` array (crucial!)

## Proposed Test Approach

Create a **manual test script** that:

1. Uses the actual `extractRelationsFromStorySession` function
2. Calls a real AI (Anthropic/Gemini) with the prompts
3. Logs the actual JSON response
4. Compares with expected behavior

**Test File**: `lib/ai/dev-tools/test-tennis-story.ts`
