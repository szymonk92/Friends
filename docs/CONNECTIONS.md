# Connection Relationships & Bidirectionality

## Current State
The `connections` table currently links two people (`person1Id`, `person2Id`) with a `relationshipType` (Friend, Family, etc.) and a single `qualifier` string.

```typescript
// Current Schema
{
  person1Id: "Me",
  person2Id: "Alice",
  relationshipType: "family",
  qualifier: "Daughter" // Implies Alice is my Daughter
}
```

## The Problem: Asymmetric Relationships
While symmetric relationships like "Friend" or "Colleague" work well with a single record and qualifier, asymmetric relationships create ambiguity when viewed from the other side.

**Example:**
- I add **Alice** as my **Daughter**.
- Record: `Me -> Alice` (Family, "Daughter").
- **View from Me:** "Alice is my Daughter" (Correct).
- **View from Alice:** "Me is my... Daughter?" (Incorrect).

Currently, the system has no way to know that the inverse of "Daughter" is "Mother" or "Father".

## Proposed Solution

To properly handle bidirectional asymmetric relationships, we need to explicitly store the role of both parties or the inverse qualifier.

### 1. Schema Update
We should modify the `connections` table to store the role/qualifier for both sides of the relationship.

**Option A: Two Qualifier Fields (Recommended)**
Add `person1Role` and `person2Role` (or `qualifier1` and `qualifier2`).

```typescript
{
  person1Id: "Me",
  person2Id: "Alice",
  relationshipType: "family",
  
  // Describes Person 2 relative to Person 1
  person2Role: "Daughter", 
  
  // Describes Person 1 relative to Person 2
  person1Role: "Father" 
}
```

**Migration:**
- Rename `qualifier` to `person2Role` (or keep as `qualifier` but define it strictly as "P2's role").
- Add `person1Role` (or `inverseQualifier`).

### 2. UI/UX Changes

**Adding a Connection:**
When a user adds a connection and specifies a qualifier (e.g., "Daughter"), the UI should:
1.  **Attempt to Infer:** If "Daughter" is entered, suggest "Mother" or "Father" for the other side (based on user's gender if known, or generic "Parent").
2.  **Prompt User:** Allow the user to specify the reciprocal role.
    *   *Input 1:* "Alice is my..." [Daughter]
    *   *Input 2:* "So I am Alice's..." [Father]

**Displaying Connections:**
- **Viewing Me:** Show Alice, use `person2Role` ("Daughter").
- **Viewing Alice:** Show Me, use `person1Role` ("Father").

### 3. Implementation Plan

1.  **Database Migration:**
    - Add `inverse_qualifier` column to `connections` table.
    
2.  **Code Update (`useConnections.ts`):**
    - Update queries to fetch the correct qualifier based on whether the current view is `person1` or `person2`.
    - If `viewingPerson == person1`, display `person2Role`.
    - If `viewingPerson == person2`, display `person1Role`.

3.  **Form Update (`connection-form.tsx`):**
    - Add a second input field for the inverse role.
    - (Optional) Add a lookup map for common inverses to auto-fill (e.g., Daughter <-> Parent, Wife <-> Husband/Partner).

## Common Inverse Pairs (for Auto-fill)

| Role (P2) | Inverse (P1) |
|-----------|--------------|
| Daughter  | Mother / Father / Parent |
| Son       | Mother / Father / Parent |
| Child     | Parent |
| Wife      | Husband / Wife / Partner |
| Husband   | Wife / Husband / Partner |
| Boss      | Employee / Subordinate |
| Mentor    | Mentee / Student |
| Aunt/Uncle| Niece / Nephew |

## Alternative: Double Records
We could store two records for every connection:
1. `Me -> Alice` (Daughter)
2. `Alice -> Me` (Father)

**Pros:** Simpler queries (always select where `person1Id = current`).
**Cons:** Data synchronization issues (updating one must update the other).

**Recommendation:** Single record with dual roles (`person1Role`, `person2Role`) is cleaner and prevents data drift.
