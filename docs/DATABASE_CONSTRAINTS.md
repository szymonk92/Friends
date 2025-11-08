# Database Constraints & Validation Rules

**Version**: 1.0
**Last Updated**: 2025-11-07
**Purpose**: Define validation rules, constraints, and business logic for the Friends database

---

## Table of Contents
1. [People Table Constraints](#people-table-constraints)
2. [Relations Table Constraints](#relations-table-constraints)
3. [Temporal Validation Rules](#temporal-validation-rules)
4. [Person Management Rules](#person-management-rules)
5. [Duplicate Detection & Merging](#duplicate-detection--merging)
6. [Metadata Validation](#metadata-validation)
7. [Performance & Query Constraints](#performance--query-constraints)

---

## 1. People Table Constraints

### 1.1 Required Fields Validation

```typescript
// RULE: Minimum required data for person creation
interface MinimumPersonData {
  userId: string;      // REQUIRED - must reference existing user
  name: string;        // REQUIRED - cannot be empty or whitespace-only
  personType: 'primary' | 'mentioned' | 'placeholder'; // REQUIRED
  status: 'active' | 'archived' | 'deceased' | 'placeholder' | 'merged'; // REQUIRED
}

// Validation function
function validateMinimumPersonData(person: Partial<Person>): ValidationResult {
  const errors: string[] = [];

  if (!person.userId?.trim()) {
    errors.push("userId is required");
  }

  if (!person.name?.trim()) {
    errors.push("name cannot be empty");
  }

  if (person.name && person.name.trim().length < 2) {
    errors.push("name must be at least 2 characters");
  }

  return { valid: errors.length === 0, errors };
}
```

### 1.2 Status Transition Rules

```typescript
// RULE: Valid status transitions
const VALID_STATUS_TRANSITIONS: Record<PersonStatus, PersonStatus[]> = {
  'placeholder': ['active', 'merged', 'archived'],     // Can be upgraded or merged
  'active':      ['archived', 'deceased', 'merged'],   // Can be archived, died, or merged
  'archived':    ['active', 'deceased'],               // Can be reactivated or marked deceased
  'deceased':    [],                                   // Terminal state (except data corrections)
  'merged':      ['active'],                           // Can be un-merged (revert operation)
};

// Validation
function canTransitionStatus(from: PersonStatus, to: PersonStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from].includes(to);
}
```

### 1.3 Person Type Validation

```typescript
// RULE: personType determines required fields
const PERSON_TYPE_REQUIREMENTS = {
  primary: {
    requiredFields: ['name', 'relationshipType'], // Must know relationship type
    optionalFields: ['nickname', 'photoId', 'metDate', 'dateOfBirth'],
    minDataCompleteness: 'partial',
    allowedAddedBy: ['user', 'import'],
  },

  mentioned: {
    requiredFields: ['name'],
    optionalFields: ['relationshipType', 'extractionContext'],
    minDataCompleteness: 'minimal',
    allowedAddedBy: ['ai_extraction', 'auto_created'],
    mustHaveContext: true, // extractionContext required
  },

  placeholder: {
    requiredFields: ['name'],
    optionalFields: ['extractionContext'],
    minDataCompleteness: 'minimal',
    allowedAddedBy: ['auto_created'],
    mustHaveContext: true,
  },
};

// Validation
function validatePersonType(person: Person): ValidationResult {
  const requirements = PERSON_TYPE_REQUIREMENTS[person.personType];
  const errors: string[] = [];

  // Check required fields
  for (const field of requirements.requiredFields) {
    if (!person[field]) {
      errors.push(`${field} is required for personType=${person.personType}`);
    }
  }

  // Check context requirement
  if (requirements.mustHaveContext && !person.extractionContext) {
    errors.push(`extractionContext required for personType=${person.personType}`);
  }

  // Check addedBy is allowed
  if (!requirements.allowedAddedBy.includes(person.addedBy)) {
    errors.push(
      `addedBy=${person.addedBy} not allowed for personType=${person.personType}`
    );
  }

  return { valid: errors.length === 0, errors };
}
```

### 1.4 Merge Constraints

```typescript
// RULE: Constraints for person merging
interface MergeConstraints {
  // Cannot merge if:
  - Both persons are 'primary' with different relationshipTypes
  - Either person has status 'deceased' (different death dates)
  - Canonical person has status 'merged' (must merge into active/placeholder)
  - Persons belong to different users
}

function validateMerge(
  canonical: Person,
  toBeMerged: Person
): ValidationResult {
  const errors: string[] = [];

  // Same user check
  if (canonical.userId !== toBeMerged.userId) {
    errors.push("Cannot merge persons from different users");
  }

  // Canonical must not be merged already
  if (canonical.status === 'merged') {
    errors.push("Canonical person cannot have status='merged'");
  }

  // Deceased persons conflict
  if (canonical.status === 'deceased' && toBeMerged.status === 'deceased') {
    if (canonical.dateOfDeath !== toBeMerged.dateOfDeath) {
      errors.push("Cannot merge deceased persons with different death dates");
    }
  }

  // Primary person conflict
  if (
    canonical.personType === 'primary' &&
    toBeMerged.personType === 'primary' &&
    canonical.relationshipType !== toBeMerged.relationshipType
  ) {
    errors.push(
      "Cannot merge two primary persons with different relationship types. " +
      "Please resolve manually."
    );
  }

  return { valid: errors.length === 0, errors };
}
```

### 1.5 Importance Calculation

```typescript
// RULE: Auto-calculate importanceToUser based on signals
function calculateImportance(person: Person, relations: Relation[]): ImportanceLevel {
  let score = 0;

  // Signal 1: Person type
  if (person.personType === 'primary') score += 30;
  else if (person.personType === 'mentioned') score += 10;

  // Signal 2: Mention count
  score += Math.min(person.mentionCount * 5, 20); // Cap at 20

  // Signal 3: Relation count and types
  const careRelations = relations.filter(r =>
    ['CARES_FOR', 'DEPENDS_ON'].includes(r.relationType)
  );
  score += careRelations.length * 15;

  const emotionalRelations = relations.filter(r =>
    ['FEARS', 'STRUGGLES_WITH', 'UNCOMFORTABLE_WITH'].includes(r.relationType)
  );
  score += emotionalRelations.length * 10;

  score += Math.min(relations.length * 2, 20); // General relations

  // Signal 4: Has photo
  if (person.photoId) score += 5;

  // Signal 5: Has rich context
  if (person.extractionContext) {
    const context = JSON.parse(person.extractionContext);
    if (context.known_facts?.length > 2) score += 10;
  }

  // Convert score to level
  if (score >= 60) return 'very_important';
  if (score >= 35) return 'important';
  if (score >= 15) return 'peripheral';
  return 'unknown';
}

// RULE: Auto-upgrade placeholder -> mentioned -> primary
function shouldUpgradePersonType(person: Person, importance: ImportanceLevel): PersonType | null {
  if (person.personType === 'placeholder' && importance !== 'unknown') {
    return 'mentioned'; // Upgrade to mentioned
  }

  if (person.personType === 'mentioned' && importance === 'very_important') {
    return 'primary'; // Upgrade to primary
  }

  return null; // No upgrade needed
}
```

---

## 2. Relations Table Constraints

### 2.1 Relation Type Validation

```typescript
// RULE: Each relation type has specific requirements
interface RelationTypeConstraints {
  relationType: RelationType;
  allowedObjectTypes: ObjectType[];
  requiredMetadataFields: string[];
  optionalMetadataFields: string[];
  allowedStatuses: RelationStatus[];
}

const RELATION_TYPE_CONSTRAINTS: Record<RelationType, RelationTypeConstraints> = {
  KNOWS: {
    relationType: 'KNOWS',
    allowedObjectTypes: ['person'],
    requiredMetadataFields: [], // Handled by connections table instead
    optionalMetadataFields: ['context', 'through'],
    allowedStatuses: ['current', 'past'],
  },

  CARES_FOR: {
    relationType: 'CARES_FOR',
    allowedObjectTypes: ['person', 'pet', 'cause'],
    requiredMetadataFields: ['care_type', 'level'],
    optionalMetadataFields: [
      'impact_on_availability',
      'responsibilities',
      'caregiver_burnout',
      'emotional_state',
    ],
    allowedStatuses: ['current', 'past'],
  },

  REGULARLY_DOES: {
    relationType: 'REGULARLY_DOES',
    allowedObjectTypes: ['activity', 'habit'],
    requiredMetadataFields: ['frequency'],
    optionalMetadataFields: [
      'time_of_day',
      'location',
      'with_whom',
      'importance',
      'since_when',
    ],
    allowedStatuses: ['current', 'past', 'aspiration'],
  },

  PREFERS_OVER: {
    relationType: 'PREFERS_OVER',
    allowedObjectTypes: ['food', 'activity', 'place', 'concept'],
    requiredMetadataFields: ['preferred', 'over'],
    optionalMetadataFields: ['reason', 'intensity', 'context'],
    allowedStatuses: ['current', 'past'],
  },

  // ... (define for all 20 relation types)
};

// Validation function
function validateRelationType(relation: Relation): ValidationResult {
  const constraints = RELATION_TYPE_CONSTRAINTS[relation.relationType];
  const errors: string[] = [];

  // Check object type
  if (!constraints.allowedObjectTypes.includes(relation.objectType)) {
    errors.push(
      `objectType=${relation.objectType} not allowed for ${relation.relationType}. ` +
      `Allowed: ${constraints.allowedObjectTypes.join(', ')}`
    );
  }

  // Check required metadata
  const metadata = relation.metadata ? JSON.parse(relation.metadata) : {};
  for (const field of constraints.requiredMetadataFields) {
    if (!(field in metadata)) {
      errors.push(`Required metadata field missing: ${field}`);
    }
  }

  // Check status
  if (!constraints.allowedStatuses.includes(relation.status)) {
    errors.push(
      `status=${relation.status} not allowed for ${relation.relationType}. ` +
      `Allowed: ${constraints.allowedStatuses.join(', ')}`
    );
  }

  return { valid: errors.length === 0, errors };
}
```

### 2.2 Person-to-Person Relations

```typescript
// RULE: Special handling for person-to-person relations
const PERSON_TO_PERSON_RELATIONS = [
  'KNOWS',         // Handled by connections table primarily
  'CARES_FOR',     // Can be person (elderly parent, child)
  'DEPENDS_ON',    // Can be person (financially, emotionally)
  'UNCOMFORTABLE_WITH', // Can be person (ex-partner, rival)
];

function validatePersonToPerson(relation: Relation): ValidationResult {
  const errors: string[] = [];

  if (
    PERSON_TO_PERSON_RELATIONS.includes(relation.relationType) &&
    relation.objectType === 'person'
  ) {
    // MUST have objectId pointing to people.id
    if (!relation.objectId) {
      errors.push(
        `${relation.relationType} with objectType=person requires objectId`
      );
    }

    // SHOULD have objectLabel as fallback
    if (!relation.objectLabel) {
      errors.push(
        `${relation.relationType} with objectType=person should have objectLabel`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}
```

### 2.3 Object Reference Integrity

```typescript
// RULE: If objectId is provided, objectType must be 'person' and ID must exist
async function validateObjectReference(
  relation: Relation,
  db: Database
): Promise<ValidationResult> {
  const errors: string[] = [];

  if (relation.objectId) {
    // Must be person type
    if (relation.objectType !== 'person') {
      errors.push(
        `objectId can only be used with objectType=person, got ${relation.objectType}`
      );
    }

    // Person must exist
    const person = await db
      .select()
      .from(people)
      .where(eq(people.id, relation.objectId))
      .get();

    if (!person) {
      errors.push(`Referenced person with id=${relation.objectId} does not exist`);
    }

    // Person must belong to same user
    if (person && person.userId !== relation.userId) {
      errors.push("Referenced person must belong to same user");
    }
  }

  return { valid: errors.length === 0, errors };
}
```

---

## 3. Temporal Validation Rules

### 3.1 Date Range Validation

```typescript
// RULE: validFrom must be before validTo
function validateDateRange(relation: Relation): ValidationResult {
  const errors: string[] = [];

  if (relation.validFrom && relation.validTo) {
    const from = new Date(relation.validFrom);
    const to = new Date(relation.validTo);

    if (from >= to) {
      errors.push("validFrom must be before validTo");
    }

    // Sanity check: not more than 100 years
    const yearsDiff = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (yearsDiff > 100) {
      errors.push("Date range exceeds 100 years (possible data error)");
    }
  }

  return { valid: errors.length === 0, errors };
}
```

### 3.2 Status-Temporal Consistency

```typescript
// RULE: Relation status must match temporal data
function validateStatusConsistency(relation: Relation): ValidationResult {
  const errors: string[] = [];
  const now = new Date();

  // CURRENT status checks
  if (relation.status === 'current') {
    if (relation.validTo && new Date(relation.validTo) < now) {
      errors.push(
        "Relation with status='current' cannot have validTo in the past. " +
        "Should be status='past'"
      );
    }
  }

  // PAST status checks
  if (relation.status === 'past') {
    if (!relation.validTo) {
      errors.push(
        "Relation with status='past' should have validTo set. " +
        "Consider setting validTo or changing status to 'current'"
      );
    }

    if (relation.validTo && new Date(relation.validTo) > now) {
      errors.push(
        "Relation with status='past' cannot have validTo in the future. " +
        "Should be status='future' or 'aspiration'"
      );
    }
  }

  // FUTURE status checks
  if (relation.status === 'future') {
    if (!relation.validFrom || new Date(relation.validFrom) <= now) {
      errors.push(
        "Relation with status='future' must have validFrom in the future"
      );
    }
  }

  // ASPIRATION status checks
  if (relation.status === 'aspiration') {
    if (relation.validFrom || relation.validTo) {
      errors.push(
        "Relation with status='aspiration' should not have validFrom/validTo " +
        "(aspirations are timeless until achieved)"
      );
    }
  }

  return { valid: errors.length === 0, errors };
}
```

### 3.3 Overlapping Relations Prevention

```typescript
// RULE: Prevent conflicting overlapping relations
async function checkOverlappingRelations(
  relation: Relation,
  db: Database
): Promise<ValidationResult> {
  const errors: string[] = [];

  // Check for conflicts with same relationType + objectLabel
  const overlapping = await db
    .select()
    .from(relations)
    .where(
      and(
        eq(relations.subjectId, relation.subjectId),
        eq(relations.relationType, relation.relationType),
        eq(relations.objectLabel, relation.objectLabel),
        eq(relations.status, 'current'),
        ne(relations.id, relation.id) // Exclude self
      )
    )
    .all();

  if (overlapping.length > 0 && relation.status === 'current') {
    errors.push(
      `Overlapping relation found: ${relation.relationType}(${relation.objectLabel}). ` +
      `Only one 'current' relation of same type+object allowed. ` +
      `Consider marking old relation as 'past' first.`
    );
  }

  return { valid: errors.length === 0, errors };
}
```

---

## 4. Person Management Rules

### 4.1 Auto-Creation Rules

```typescript
// RULE: When to auto-create person placeholders
interface AutoCreationContext {
  mentionedInStory: string;        // Story/interaction ID
  relationToPrimary: string;       // 'mother', 'boss', 'friend'
  primaryPerson: string;           // Name of primary person
  knownFacts: string[];            // ['has_dementia', 'lives_in_NYC']
}

function shouldAutoCreatePerson(
  objectLabel: string,
  relationType: RelationType,
  objectType: ObjectType
): boolean {
  // Only for person-to-person relations
  if (objectType !== 'person') return false;

  // Only for these relation types
  const AUTO_CREATE_RELATIONS = [
    'CARES_FOR',
    'DEPENDS_ON',
    'UNCOMFORTABLE_WITH',
  ];

  return AUTO_CREATE_RELATIONS.includes(relationType);
}

async function autoCreatePerson(
  userId: string,
  objectLabel: string,
  context: AutoCreationContext,
  db: Database
): Promise<Person> {
  return await db.insert(people).values({
    id: crypto.randomUUID(),
    userId,
    name: objectLabel,
    personType: 'placeholder',
    dataCompleteness: 'minimal',
    addedBy: 'auto_created',
    importanceToUser: 'unknown',
    status: 'placeholder',
    extractionContext: JSON.stringify(context),
    mentionCount: 1,
  });
}
```

### 4.2 Mention Count Updates

```typescript
// RULE: Increment mentionCount whenever person is referenced
async function incrementMentionCount(
  personId: string,
  db: Database
): Promise<void> {
  await db
    .update(people)
    .set({
      mentionCount: sql`${people.mentionCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(people.id, personId));

  // Check if importance should be recalculated
  const person = await db.select().from(people).where(eq(people.id, personId)).get();
  const relations = await db.select().from(relations).where(eq(relations.subjectId, personId)).all();

  const newImportance = calculateImportance(person, relations);
  if (newImportance !== person.importanceToUser) {
    await db
      .update(people)
      .set({ importanceToUser: newImportance })
      .where(eq(people.id, personId));
  }
}
```

---

## 5. Duplicate Detection & Merging

### 5.1 Fuzzy Matching Algorithm

```typescript
// RULE: Detect potential duplicates using multiple signals
interface DuplicateMatch {
  id: string;
  name: string;
  confidence: number; // 0.0 to 1.0
  reasons: string[];
}

function detectDuplicates(
  newPerson: Person,
  existingPersons: Person[]
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];

  for (const existing of existingPersons) {
    let confidence = 0;
    const reasons: string[] = [];

    // Signal 1: Name similarity (Levenshtein distance)
    const nameSimilarity = calculateNameSimilarity(newPerson.name, existing.name);
    if (nameSimilarity > 0.8) {
      confidence += 0.4;
      reasons.push(`Name similarity: ${(nameSimilarity * 100).toFixed(0)}%`);
    }

    // Signal 2: Nickname match
    if (
      newPerson.nickname &&
      existing.nickname &&
      newPerson.nickname.toLowerCase() === existing.nickname.toLowerCase()
    ) {
      confidence += 0.3;
      reasons.push("Exact nickname match");
    }

    // Signal 3: Same relationship type + met date
    if (
      newPerson.relationshipType === existing.relationshipType &&
      newPerson.metDate === existing.metDate
    ) {
      confidence += 0.2;
      reasons.push("Same relationship type and met date");
    }

    // Signal 4: Similar extraction context
    if (newPerson.extractionContext && existing.extractionContext) {
      const newContext = JSON.parse(newPerson.extractionContext);
      const existingContext = JSON.parse(existing.extractionContext);

      if (newContext.relation_to_primary === existingContext.relation_to_primary) {
        confidence += 0.1;
        reasons.push(`Both are ${newContext.relation_to_primary}`);
      }
    }

    // Only include if confidence > 0.6
    if (confidence > 0.6) {
      matches.push({
        id: existing.id,
        name: existing.name,
        confidence,
        reasons,
      });
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

function calculateNameSimilarity(name1: string, name2: string): number {
  // Simplified Levenshtein-based similarity
  const normalize = (s: string) => s.toLowerCase().trim();
  const n1 = normalize(name1);
  const n2 = normalize(name2);

  if (n1 === n2) return 1.0;

  // Check if one is substring of other
  if (n1.includes(n2) || n2.includes(n1)) return 0.85;

  // Check first name match (Ola K. vs Ola)
  const first1 = n1.split(' ')[0];
  const first2 = n2.split(' ')[0];
  if (first1 === first2 && first1.length > 2) return 0.75;

  // Full Levenshtein distance calculation here...
  const distance = levenshteinDistance(n1, n2);
  const maxLen = Math.max(n1.length, n2.length);
  return 1 - (distance / maxLen);
}
```

### 5.2 Merge Operation

```typescript
// RULE: Merge duplicate person into canonical person
async function mergePerson(
  canonicalId: string,
  duplicateId: string,
  db: Database
): Promise<void> {
  const canonical = await db.select().from(people).where(eq(people.id, canonicalId)).get();
  const duplicate = await db.select().from(people).where(eq(people.id, duplicateId)).get();

  // Validate merge
  const validation = validateMerge(canonical, duplicate);
  if (!validation.valid) {
    throw new Error(`Merge validation failed: ${validation.errors.join(', ')}`);
  }

  // 1. Move all relations from duplicate to canonical
  await db
    .update(relations)
    .set({ subjectId: canonicalId })
    .where(eq(relations.subjectId, duplicateId));

  // 2. Update objectId references
  await db
    .update(relations)
    .set({ objectId: canonicalId })
    .where(eq(relations.objectId, duplicateId));

  // 3. Move connections
  await db
    .update(connections)
    .set({ person1Id: canonicalId })
    .where(eq(connections.person1Id, duplicateId));

  await db
    .update(connections)
    .set({ person2Id: canonicalId })
    .where(eq(connections.person2Id, duplicateId));

  // 4. Merge data fields (keep most complete data)
  const mergedData: Partial<Person> = {
    // Keep better data
    nickname: canonical.nickname || duplicate.nickname,
    photoId: canonical.photoId || duplicate.photoId,
    dateOfBirth: canonical.dateOfBirth || duplicate.dateOfBirth,
    metDate: canonical.metDate || duplicate.metDate,

    // Upgrade person type if needed
    personType: canonical.personType === 'primary' ? 'primary' :
                duplicate.personType === 'primary' ? 'primary' :
                canonical.personType === 'mentioned' ? 'mentioned' :
                duplicate.personType === 'mentioned' ? 'mentioned' : 'placeholder',

    // Combine mention counts
    mentionCount: canonical.mentionCount + duplicate.mentionCount,

    // Track merge
    mergedFrom: canonical.mergedFrom
      ? `${canonical.mergedFrom},${duplicateId}`
      : duplicateId,
  };

  await db
    .update(people)
    .set(mergedData)
    .where(eq(people.id, canonicalId));

  // 5. Mark duplicate as merged
  await db
    .update(people)
    .set({
      status: 'merged',
      canonicalId,
      updatedAt: new Date(),
    })
    .where(eq(people.id, duplicateId));
}
```

---

## 6. Metadata Validation

### 6.1 JSON Schema Validation

```typescript
// RULE: Validate metadata conforms to relation-specific schema
// See RELATION_METADATA_SCHEMAS.md for full schemas

import { RelationMetadataSchemas } from './RELATION_METADATA_SCHEMAS';

function validateMetadata(
  relationType: RelationType,
  metadata: any
): ValidationResult {
  const schema = RelationMetadataSchemas[relationType];
  const errors: string[] = [];

  // Check required fields
  for (const field of schema.required || []) {
    if (!(field in metadata)) {
      errors.push(`Required field missing: ${field}`);
    }
  }

  // Validate enum values
  for (const [key, value] of Object.entries(metadata)) {
    const fieldSchema = schema.properties[key];
    if (fieldSchema?.enum) {
      if (!fieldSchema.enum.includes(value)) {
        errors.push(
          `Invalid value for ${key}: ${value}. ` +
          `Allowed: ${fieldSchema.enum.join(', ')}`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
```

### 6.2 Metadata Field Limits

```typescript
// RULE: Prevent metadata bloat
const METADATA_LIMITS = {
  maxJsonSize: 10000,        // 10KB max per metadata field
  maxArrayLength: 50,        // Max items in array fields
  maxStringLength: 1000,     // Max string field length
};

function validateMetadataLimits(metadata: any): ValidationResult {
  const errors: string[] = [];
  const jsonString = JSON.stringify(metadata);

  if (jsonString.length > METADATA_LIMITS.maxJsonSize) {
    errors.push(
      `Metadata exceeds size limit: ${jsonString.length} > ${METADATA_LIMITS.maxJsonSize}`
    );
  }

  // Check array lengths
  for (const [key, value] of Object.entries(metadata)) {
    if (Array.isArray(value) && value.length > METADATA_LIMITS.maxArrayLength) {
      errors.push(
        `Array field ${key} exceeds length limit: ${value.length} > ${METADATA_LIMITS.maxArrayLength}`
      );
    }

    if (typeof value === 'string' && value.length > METADATA_LIMITS.maxStringLength) {
      errors.push(
        `String field ${key} exceeds length limit: ${value.length} > ${METADATA_LIMITS.maxStringLength}`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}
```

---

## 7. Performance & Query Constraints

### 7.1 Index Requirements

```sql
-- REQUIRED INDEXES (already in schema)
CREATE INDEX people_user_id_idx ON people(user_id);
CREATE INDEX people_status_idx ON people(status);
CREATE INDEX people_person_type_idx ON people(person_type);
CREATE INDEX people_importance_idx ON people(importance_to_user);
CREATE INDEX people_canonical_id_idx ON people(canonical_id);

CREATE INDEX relations_user_id_idx ON relations(user_id);
CREATE INDEX relations_subject_idx ON relations(subject_id);
CREATE INDEX relations_relation_type_idx ON relations(relation_type);
CREATE INDEX relations_status_idx ON relations(status);
CREATE INDEX relations_object_id_idx ON relations(object_id);

-- RECOMMENDED COMPOSITE INDEXES for common queries
CREATE INDEX relations_user_subject_type_idx
  ON relations(user_id, subject_id, relation_type);

CREATE INDEX people_user_type_importance_idx
  ON people(user_id, person_type, importance_to_user);
```

### 7.2 Query Performance Rules

```typescript
// RULE: Limit query result sizes
const QUERY_LIMITS = {
  maxPersonsPerQuery: 1000,
  maxRelationsPerQuery: 5000,
  maxDuplicateScanSize: 500,  // Don't scan more than 500 persons for duplicates
};

// RULE: Use pagination for large result sets
interface PaginationParams {
  limit: number;  // Max 100
  offset: number;
}

async function getPeople(
  userId: string,
  filters: PersonFilters,
  pagination: PaginationParams,
  db: Database
): Promise<Person[]> {
  // Enforce max limit
  const limit = Math.min(pagination.limit, 100);

  return await db
    .select()
    .from(people)
    .where(and(
      eq(people.userId, userId),
      // ... apply filters
    ))
    .limit(limit)
    .offset(pagination.offset)
    .all();
}
```

### 7.3 JSON Query Optimization

```typescript
// RULE: Avoid json_extract in WHERE clauses when possible
// BAD: Slow for large tables
const badQuery = await db
  .select()
  .from(relations)
  .where(
    sql`json_extract(metadata, '$.care_type') = 'elderly_parent'`
  );

// GOOD: Use category field + metadata validation
const goodQuery = await db
  .select()
  .from(relations)
  .where(and(
    eq(relations.relationType, 'CARES_FOR'),
    eq(relations.category, 'elderly_care')  // Indexed field
  ));

// RULE: Add category field to relations for common filters
// Update relations on insert:
async function insertRelation(relation: Relation, db: Database) {
  // Extract category from metadata for indexing
  const metadata = JSON.parse(relation.metadata);
  relation.category = extractCategoryForIndex(relation.relationType, metadata);

  return await db.insert(relations).values(relation);
}
```

---

## 8. Validation Helpers

### 8.1 Complete Validation Pipeline

```typescript
// RULE: Run all validations before insert/update
async function validatePerson(
  person: Person,
  db: Database
): Promise<ValidationResult> {
  const allErrors: string[] = [];

  // Run all validations
  const validations = [
    validateMinimumPersonData(person),
    validatePersonType(person),
  ];

  for (const result of validations) {
    if (!result.valid) {
      allErrors.push(...result.errors);
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

async function validateRelation(
  relation: Relation,
  db: Database
): Promise<ValidationResult> {
  const allErrors: string[] = [];

  // Synchronous validations
  const syncValidations = [
    validateRelationType(relation),
    validatePersonToPerson(relation),
    validateDateRange(relation),
    validateStatusConsistency(relation),
  ];

  for (const result of syncValidations) {
    if (!result.valid) {
      allErrors.push(...result.errors);
    }
  }

  // Async validations
  const asyncResults = await Promise.all([
    validateObjectReference(relation, db),
    checkOverlappingRelations(relation, db),
  ]);

  for (const result of asyncResults) {
    if (!result.valid) {
      allErrors.push(...result.errors);
    }
  }

  // Metadata validation
  if (relation.metadata) {
    const metadata = JSON.parse(relation.metadata);
    const metadataValidation = validateMetadata(relation.relationType, metadata);
    const limitsValidation = validateMetadataLimits(metadata);

    if (!metadataValidation.valid) allErrors.push(...metadataValidation.errors);
    if (!limitsValidation.valid) allErrors.push(...limitsValidation.errors);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}
```

---

## 9. Summary of Critical Constraints

### Must-Have Validations (Enforce in Code):
1. ✅ **Person.userId + Person.name** - Required fields
2. ✅ **Status transitions** - Follow valid state machine
3. ✅ **Merge validation** - Prevent invalid merges
4. ✅ **Temporal consistency** - validFrom < validTo, status matches dates
5. ✅ **Object references** - objectId must point to existing person
6. ✅ **Relation type constraints** - Required metadata fields present
7. ✅ **No overlapping current relations** - Same type+object must be unique
8. ✅ **Metadata size limits** - Prevent bloat (10KB max)

### Nice-to-Have Validations (Optional/Warnings):
1. ⚠️ **Importance calculation** - Auto-calculate but allow override
2. ⚠️ **Duplicate detection** - Suggest but don't block
3. ⚠️ **Data completeness** - Encourage but don't enforce
4. ⚠️ **JSON schema conformance** - Warn on deviation but allow flexibility

### Performance Requirements:
1. 🚀 **Index all foreign keys** - userId, subjectId, objectId
2. 🚀 **Limit query results** - Max 1000 persons, 5000 relations per query
3. 🚀 **Use category field** - Avoid json_extract in WHERE clauses
4. 🚀 **Paginate large scans** - Duplicate detection, exports

---

**End of DATABASE_CONSTRAINTS.md**
