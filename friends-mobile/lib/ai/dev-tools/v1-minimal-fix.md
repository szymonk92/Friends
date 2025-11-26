# Minimal Changes to Fix V1 Prompt

## Problem in Current V1 (prompts.ts line 288-452)

The `createSystemPrompt()` function has **3 critical issues**:

### Issue 1: No `ambiguousMatches` in JSON Format
Lines 397-439 define the response format, but `ambiguousMatches` is missing.

### Issue 2: Contradictory Instructions
Lines 450-451:
```typescript
- CRITICAL: If a person exists in the database, you MUST use their existing ID. Do not create a new ID for them.
- CRITICAL: Even if the user doesn't use @mention, if the name matches an existing person, assume it's them unless context suggests otherwise.
```
This tells the AI to **always link**, which breaks ambiguity handling!

### Issue 3: No Ambiguity Examples
The prompt doesn't show the AI **how** to populate `ambiguousMatches`.

---

## MINIMAL FIX (3 Changes)

### Change 1: Add `ambiguousMatches` to JSON Format
**Location**: Line 437 (after `conflicts` array closes)

**Add**:
```typescript
  ],
  "ambiguousMatches": [
    {
      "nameInStory": "Name as it appears in story",
      "possibleMatches": [
        { "id": "existing-id", "name": "Existing Name", "reason": "Name match" }
      ]
    }
  ]
}
```

### Change 2: Replace Lines 450-451
**Remove**:
```typescript
- CRITICAL: Even if the user doesn't use @mention, if the name matches an existing person, assume it's them unless context suggests otherwise.
```

**Replace with**:
```typescript
- CRITICAL: Common names (David, Mike, Sarah, Ola, etc.) WITHOUT @ or explicit context should be flagged as AMBIGUOUS
- CRITICAL: Add ambiguous names to ambiguousMatches, NOT to people array
- CRITICAL: Do NOT create relations for ambiguous people - wait for user clarification
```

### Change 3: Add Quick Example (Before "IMPORTANT:")
**Location**: Before line 441

**Add**:
```typescript
AMBIGUITY EXAMPLE:
Story: "Played tennis with David and Ola"
Existing: "David Smith (ID: david-1)", "Ola Kowalska (ID: ola-1)"
Response:
{
  "people": [],
  "ambiguousMatches": [
    { "nameInStory": "David", "possibleMatches": [{"id": "david-1", "name": "David Smith", "reason": "Name match"}]},
    { "nameInStory": "Ola", "possibleMatches": [{"id": "ola-1", "name": "Ola Kowalska", "reason": "Name match"}]}
  ]
}

```

---

## Summary
- **3 changes**, ~10 lines of code
- Adds `ambiguousMatches` to JSON format
- Removes "assume it's them" instruction
- Adds concrete example

This should be enough for Claude to understand what we want!
