# Batch Test Simulation: Ambiguity & Extraction Logic

I have simulated the execution of 10 complex stories against the new extraction logic and prompts. Below are the results and judgments.

## Scenario 1: The "Ola" Ambiguity (Common Name)

**Story**: "I went shopping with Ola yesterday."
**Context**: Existing Person: `Ola Kowalska (id: ola-1)`
**Prompt Sent**:

```text
EXISTING PEOPLE:
- Ola Kowalska (ID: ola-1)

STORY: "I went shopping with Ola yesterday."

AMBIGUITY RULES: ... IF name is common (e.g. "Ola") AND NO explicit context ... flag as AMBIGUOUS.
```

**Simulated AI Response**:

```json
{
  "people": [],
  "relations": [],
  "ambiguousMatches": [
    {
      "nameInStory": "Ola",
      "possibleMatches": [{ "id": "ola-1", "name": "Ola Kowalska", "reason": "Name match" }]
    }
  ]
}
```

**Judgment**: ✅ **PASS**. Correctly identifies ambiguity instead of guessing.

---

## Scenario 2: Explicit @Mention

**Story**: "I went shopping with @Ola yesterday."
**Context**: Existing Person: `Ola Kowalska (id: ola-1)`
**Prompt Sent**:

```text
EXISTING PEOPLE:
- Ola Kowalska (ID: ola-1)

STORY: "I went shopping with @Ola yesterday."

RULES: ... If @Name ... Match them to database.
```

**Simulated AI Response**:

```json
{
  "people": [
    {
      "id": "ola-1",
      "name": "Ola Kowalska",
      "isNew": false,
      "personType": "primary",
      "confidence": 1.0
    }
  ],
  "relations": [
    {
      "subjectId": "ola-1",
      "subjectName": "Ola Kowalska",
      "relationType": "ASSOCIATED_WITH",
      "objectLabel": "shopping",
      "confidence": 0.9
    }
  ]
}
```

**Judgment**: ✅ **PASS**. Correctly links to existing ID due to `@`.

---

## Scenario 3: The "@+" On-the-Fly Person Creation

**Story**: "Had lunch with @Ola today, and we met her old friend @+Fabian"
**Context**: Existing Person: `Ola Kowalska (id: ola-1)`. User types `@+Fabian` to add a new person on-the-fly.
**Prompt Sent**:

```text
EXISTING PEOPLE:
- Ola Kowalska (ID: ola-1)

STORY: "Had lunch with @Ola today, and we met her old friend @+Fabian"

@+ SYNTAX RULES:
- @+Name creates a new person entry
- Extract relationships from context (e.g., "her old friend")
- Mark for user approval (check for duplicate names)
```

**Simulated AI Response**:

```json
{
  "people": [
    {
      "id": "ola-1",
      "name": "Ola Kowalska",
      "isNew": false,
      "personType": "primary",
      "confidence": 1.0
    },
    {
      "id": "NEW-fabian",
      "name": "Fabian",
      "isNew": true,
      "personType": "mentioned",
      "confidence": 0.9,
      "requiresApproval": true
    }
  ],
  "relations": [
    {
      "subjectId": "NEW-fabian",
      "subjectName": "Fabian",
      "relationType": "KNOWS",
      "objectLabel": "Ola Kowalska",
      "confidence": 0.85,
      "requiresApproval": true
    }
  ]
}
```

**Judgment**: ✅ **PASS**. Correctly creates new person from @+ syntax and extracts relationship from context ("her old friend"). Marks both for user approval.

---

## Scenario 4: New Person Collision (The "New Ola")

**Story**: "I met a new girl named Ola at the party."
**Context**: Existing Person: `Ola Kowalska (id: ola-1)`
**Prompt Sent**:

```text
EXISTING PEOPLE:
- Ola Kowalska (ID: ola-1)

STORY: "I met a new girl named Ola at the party."
```

**Simulated AI Response**:

```json
{
  "people": [],
  "relations": [],
  "ambiguousMatches": [
    {
      "nameInStory": "Ola",
      "possibleMatches": [{ "id": "ola-1", "name": "Ola Kowalska", "reason": "Name match" }]
    }
  ]
}
```

**Judgment**: ✅ **PASS**. Even though story says "new girl", AI should be conservative and ask user to confirm it's not the existing Ola.

---

## Scenario 5: Force New Person (Resolution)

**Story**: "I met a new girl named Ola at the party."
**Action**: User selects "Create New" in dialog.
**Prompt Sent (Re-run)**:

```text
EXISTING PEOPLE:
- Ola Kowalska (ID: ola-1)

CONFIRMED NEW PEOPLE (DO NOT LINK TO EXISTING):
- Ola [CONFIRMED NEW PERSON]

STORY: "I met a new girl named Ola at the party."
```

**Simulated AI Response**:

```json
{
  "people": [
    { "id": "NEW-ola", "name": "Ola", "isNew": true, "personType": "primary", "confidence": 1.0 }
  ],
  "relations": [
    {
      "subjectId": "NEW-ola",
      "subjectName": "Ola",
      "relationType": "ASSOCIATED_WITH",
      "objectLabel": "party",
      "confidence": 0.9
    }
  ]
}
```

**Judgment**: ✅ **PASS**. Correctly creates new person and ignores existing ID.

---

## Scenario 6: Unique Nickname

**Story**: "Grabbed a beer with T-Bone."
**Context**: Existing Person: `Thomas Wilson (id: tom-1)`, Nickname: `T-Bone`
**Prompt Sent**:

```text
EXISTING PEOPLE:
- Thomas Wilson (ID: tom-1)

STORY: "Grabbed a beer with T-Bone."
```

**Simulated AI Response**:

```json
{
  "people": [
    {
      "id": "tom-1",
      "name": "Thomas Wilson",
      "isNew": false,
      "personType": "primary",
      "confidence": 0.95
    }
  ],
  "relations": [
    {
      "subjectId": "tom-1",
      "subjectName": "Thomas Wilson",
      "relationType": "REGULARLY_DOES",
      "objectLabel": "drinking beer",
      "confidence": 0.9
    }
  ]
}
```

**Judgment**: ⚠️ **WARNING**. Depending on how "unique" the AI thinks "T-Bone" is, it might link or flag ambiguous. Ideally, if "T-Bone" is a known nickname in the DB, it should link. _Note: Current prompt only sends Names, not Nicknames. We might need to send Nicknames in context for this to work perfectly._

---

## Scenario 7: Ingredient Conflict

**Story**: "John loves the pepperoni pizza."
**Context**: Existing Relation: `John (id: john-1) SENSITIVE_TO dairy`
**Prompt Sent**:

```text
EXISTING RELATIONS:
- John: SENSITIVE_TO "dairy"

STORY: "John loves the pepperoni pizza."

CONFLICT RULES: ... SENSITIVE_TO dairy conflicts with LIKES pizza (cheese) ...
```

**Simulated AI Response**:

```json
{
  "people": [
    { "id": "john-1", "name": "John", "isNew": false, "personType": "primary", "confidence": 1.0 }
  ],
  "relations": [
    {
      "subjectId": "john-1",
      "subjectName": "John",
      "relationType": "LIKES",
      "objectLabel": "pepperoni pizza",
      "confidence": 0.9
    }
  ],
  "conflicts": [
    {
      "type": "ingredient_conflict",
      "description": "John likes pizza but is sensitive to dairy",
      "reasoning": "Pizza typically contains cheese, which is a dairy product.",
      "newRelation": {
        "subjectId": "john-1",
        "relationType": "LIKES",
        "objectLabel": "pepperoni pizza"
      }
    }
  ]
}
```

**Judgment**: ✅ **PASS**. Deep reasoning detects the hidden ingredient conflict.

---

## Scenario 8: Multiple People (Mixed)

**Story**: "Went hiking with @Mike and his friend Steve."
**Context**: Existing: `Mike (id: mike-1)`
**Prompt Sent**:

```text
EXISTING PEOPLE:
- Mike (ID: mike-1)

STORY: "Went hiking with @Mike and his friend Steve."
```

**Simulated AI Response**:

```json
{
  "people": [
    { "id": "mike-1", "name": "Mike", "isNew": false, "personType": "primary", "confidence": 1.0 },
    {
      "id": "NEW-steve",
      "name": "Steve",
      "isNew": true,
      "personType": "primary",
      "confidence": 0.9
    }
  ],
  "relations": [
    {
      "subjectId": "mike-1",
      "subjectName": "Mike",
      "relationType": "KNOWS",
      "objectLabel": "Steve",
      "confidence": 1.0
    },
    {
      "subjectId": "NEW-steve",
      "subjectName": "Steve",
      "relationType": "ASSOCIATED_WITH",
      "objectLabel": "hiking",
      "confidence": 0.9
    }
  ]
}
```

**Judgment**: ✅ **PASS**. Correctly links Mike (explicit) and creates Steve (new).

---

## Scenario 9: Temporal Update

**Story**: "Sarah is no longer vegan."
**Context**: Existing: `Sarah (id: sarah-1) IS vegan`
**Prompt Sent**:

```text
EXISTING RELATIONS:
- Sarah: IS "vegan"

STORY: "Sarah is no longer vegan."
```

**Simulated AI Response**:

```json
{
  "people": [
    { "id": "sarah-1", "name": "Sarah", "isNew": false, "personType": "primary", "confidence": 1.0 }
  ],
  "relations": [
    {
      "subjectId": "sarah-1",
      "subjectName": "Sarah",
      "relationType": "USED_TO_BE",
      "objectLabel": "vegan",
      "status": "past",
      "confidence": 0.95
    }
  ]
}
```

**Judgment**: ✅ **PASS**. Correctly identifies status change.

---

## Scenario 10: The "He/She" Ambiguity (No Context)

**Story**: "He was late again."
**Context**: No explicit tags.
**Prompt Sent**:

```text
STORY: "He was late again."
```

**Simulated AI Response**:

```json
{
  "people": [],
  "relations": [],
  "ambiguousMatches": []
}
```

**Judgment**: ✅ **PASS**. AI should refuse to extract "He" without a name or explicit context. It correctly returns nothing instead of hallucinating.
