# AI Extraction Strategy

**Version**: 1.0
**Last Updated**: 2025-11-08
**Purpose**: Define the AI-powered relation extraction pipeline with optimal cost, speed, and accuracy

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Lightweight Context Strategy](#lightweight-context-strategy)
3. [Extraction Pipeline](#extraction-pipeline)
4. [Prompt Engineering](#prompt-engineering)
5. [Conflict Detection](#conflict-detection)
6. [Duplicate Person Management](#duplicate-person-management)
7. [Confidence Scoring](#confidence-scoring)
8. [Performance Optimization](#performance-optimization)

---

## 🔗 Related Guides

- **[AGENT_MENTION_REFERENCE.md](AGENT_MENTION_REFERENCE.md)** - How to use @mentions for clear person references
- **[RELATION_USAGE_GUIDE.md](RELATION_USAGE_GUIDE.md)** - How to choose the correct relation types

---

## 1. Architecture Overview

### Design Philosophy

**CRITICAL DECISION**: Do NOT send the entire user profile to AI for every extraction.

**Why?**
- ❌ Full profile: ~50,000 tokens, $1.50 per extraction, 15-30s latency
- ✅ Lightweight: ~1,500 tokens, $0.02 per extraction, 2-5s latency

### Two-Phase Approach

```
Phase 1: Extraction (Minimal Context)
  ↓ Fast, cheap AI call with person names only
  ↓ Extract relations with confidence scores
  ↓
Phase 2: Validation (Targeted Context)
  ↓ Load only relevant existing data
  ↓ Detect conflicts and duplicates
  ↓ Present user with review
```

---

## 2. Lightweight Context Strategy

### What to Send to AI

```typescript
interface ExtractionContext {
  // ALWAYS INCLUDE (Required)
  existingPeople: PersonNameList[];  // Just names + IDs
  storyText: string;

  // OPTIONAL (For complex stories)
  recentActivity?: RecentActivitySummary;  // Last 30 days
  userPreferences?: ExtractionPreferences;

  // NEVER INCLUDE (Too expensive)
  // ❌ Full relation history
  // ❌ Complete person profiles
  // ❌ All metadata
}

interface PersonNameList {
  id: string;
  name: string;
  personType: 'primary' | 'mentioned' | 'placeholder';
  relationshipType?: 'friend' | 'family' | 'colleague' | 'acquaintance' | 'partner';
}

// Example payload
{
  existingPeople: [
    { id: "uuid-1", name: "Sarah", personType: "primary", relationshipType: "friend" },
    { id: "uuid-2", name: "Ola", personType: "mentioned", relationshipType: "acquaintance" },
    { id: "uuid-3", name: "Ola", personType: "mentioned", relationshipType: "family" },
    { id: "uuid-4", name: "Mark", personType: "primary", relationshipType: "friend" },
    // ... up to 1000 people (still only ~500 tokens)
  ],
  storyText: "Sarah's mother has dementia. Sarah visits her twice a week..."
}
```

### Token Budget Breakdown

| **Context Type** | **Token Count** | **Cost (Claude 3.5)** | **Use Case** |
|------------------|-----------------|----------------------|--------------|
| Person names (100 people) | ~300 tokens | $0.001 | Always include |
| Person names (1000 people) | ~3000 tokens | $0.01 | Large profiles |
| Story text (short) | ~200 tokens | $0.0006 | Typical |
| Story text (long) | ~2000 tokens | $0.006 | Complex narratives |
| Prompt + instructions | ~500 tokens | $0.0015 | Standard |
| **Total (typical)** | **~1500 tokens** | **$0.02** | **MVP target** |

**Compare to Full Profile Approach:**
- Full profile: ~50,000 tokens = $1.50 per extraction
- **Savings: 97% cheaper, 10x faster**

---

## 3. Extraction Pipeline

### Step 1: Prepare Context

```typescript
async function prepareExtractionContext(
  userId: string,
  storyText: string
): Promise<ExtractionContext> {
  // Fast query: Just names, no relations
  const people = await db
    .select({
      id: people.id,
      name: people.name,
      personType: people.personType,
      relationshipType: people.relationshipType,
    })
    .from(people)
    .where(eq(people.userId, userId))
    .all();

  return {
    existingPeople: people,
    storyText,
  };
}
```

**Performance**: ~5-10ms for 1000 people

---

### Step 2: AI Extraction (Minimal Context)

```typescript
async function extractRelations(
  context: ExtractionContext
): Promise<ExtractionResult> {
  const prompt = buildExtractionPrompt(context);

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  return parseExtractionResult(response);
}

interface ExtractionResult {
  people: ExtractedPerson[];
  relations: ExtractedRelation[];
  duplicateFlags: DuplicateFlag[];
  ambiguities: Ambiguity[];
}
```

**Performance**: ~2-5s, ~$0.02 per extraction

---

### Step 3: Targeted Conflict Detection

```typescript
async function detectConflicts(
  extracted: ExtractionResult,
  userId: string
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];

  // For each extracted relation, check for conflicts
  for (const relation of extracted.relations) {
    // Only query relevant data (not entire profile)
    const existing = await db
      .select()
      .from(relations)
      .where(and(
        eq(relations.userId, userId),
        eq(relations.subjectId, relation.subjectId),
        or(
          eq(relations.relationType, relation.relationType),
          // Check opposite relations (e.g., LIKES vs DISLIKES)
          eq(relations.relationType, getOppositeRelation(relation.relationType))
        ),
        like(relations.objectLabel, `%${relation.objectLabel}%`)
      ))
      .limit(10);  // Cap results

    if (existing.length > 0) {
      conflicts.push(analyzeConflict(relation, existing));
    }
  }

  return conflicts;
}
```

**Performance**: ~10-50ms per extracted relation (10-20 relations = 100-500ms total)

---

### Step 4: Duplicate Person Detection

```typescript
async function detectDuplicates(
  extractedPeople: ExtractedPerson[],
  userId: string
): Promise<DuplicateMatch[]> {
  const duplicates: DuplicateMatch[] = [];

  for (const person of extractedPeople) {
    // Fuzzy name search
    const candidates = await db
      .select()
      .from(people)
      .where(and(
        eq(people.userId, userId),
        or(
          eq(people.name, person.name),
          like(people.name, `%${person.name}%`),
          like(people.nickname, `%${person.name}%`)
        )
      ))
      .limit(10);

    // Score each candidate
    for (const candidate of candidates) {
      const confidence = calculateMatchConfidence(person, candidate);

      if (confidence > 0.6) {  // Threshold for flagging
        duplicates.push({
          extractedPerson: person,
          existingPerson: candidate,
          confidence,
          reasons: getMatchReasons(person, candidate)
        });
      }
    }
  }

  return duplicates;
}

function calculateMatchConfidence(
  extracted: ExtractedPerson,
  existing: Person
): number {
  let score = 0;

  // Exact name match
  if (existing.name.toLowerCase() === extracted.name.toLowerCase()) {
    score += 0.5;
  }

  // Partial name match
  if (existing.name.toLowerCase().includes(extracted.name.toLowerCase())) {
    score += 0.3;
  }

  // Same relationship type
  if (existing.relationshipType === extracted.relationshipType) {
    score += 0.1;
  }

  // Has photo (more likely to be real person)
  if (existing.photoId) score += 0.1;

  // Frequently mentioned (more likely to be canonical)
  if (existing.mentionCount > 5) score += 0.1;

  return Math.min(score, 1.0);
}
```

**Performance**: ~20-50ms per extracted person

---

## 4. Prompt Engineering

### Extraction Prompt Template

```typescript
function buildExtractionPrompt(context: ExtractionContext): string {
  return `You are an expert at extracting structured relationship data from personal stories.

EXISTING PEOPLE (check for duplicates):
${context.existingPeople.map(p => `- ${p.name} (${p.personType}, ${p.relationshipType || 'unknown'})`).join('\n')}

IMPORTANT: If you see a name that matches an existing person, flag it as a potential duplicate with confidence score.

STORY:
"""
${context.storyText}
"""

TASK: Extract the following information:

1. **People** mentioned in the story:
   - For each person, check if they match an EXISTING PERSON above
   - If potential match, provide confidence score (0.0-1.0) and reasoning
   - Include any new facts learned about them

2. **Relations** (use these 20 types ONLY):
   - KNOWS, LIKES, DISLIKES, ASSOCIATED_WITH, EXPERIENCED
   - IS, BELIEVES, FEARS, WANTS_TO_ACHIEVE, STRUGGLES_WITH
   - CARES_FOR, DEPENDS_ON, REGULARLY_DOES, PREFERS_OVER, USED_TO_BE
   - SENSITIVE_TO, UNCOMFORTABLE_WITH, HAS_SKILL, OWNS, HAS_IMPORTANT_DATE

3. **Ambiguities**: Flag any uncertain extractions
   - Is it FEARS or DISLIKES? (e.g., "Sarah doesn't like dogs")
   - Is it allergy (SENSITIVE_TO) or ethical choice (BELIEVES)? (e.g., "Mark avoids shellfish")
   - Missing information (e.g., "unsure if vegan or vegetarian")

4. **Confidence scores**: For each relation, provide confidence (0.0-1.0)

Return JSON in this exact format:
{
  "people": [
    {
      "name": "Sarah's mother",
      "potentialMatch": { "existingId": "uuid-1", "confidence": 0.85, "reason": "Sarah mentioned before" },
      "relationToPrimary": "mother",
      "knownFacts": ["has_dementia", "receives_care"]
    }
  ],
  "relations": [
    {
      "subject": "Sarah",
      "relationType": "CARES_FOR",
      "object": "Sarah's mother",
      "objectType": "person",
      "metadata": {
        "care_type": "elderly_parent",
        "level": "part_time",
        "condition": "dementia"
      },
      "confidence": 0.95,
      "evidence": "visits twice a week"
    }
  ],
  "ambiguities": [
    {
      "type": "unclear_intensity",
      "question": "Is Sarah's caregiving full-time or part-time?",
      "evidence": "visits twice a week",
      "suggestedValue": "part_time",
      "confidence": 0.70
    }
  ]
}`;
}
```

---

## 5. Conflict Detection

### Conflict Types

```typescript
enum ConflictType {
  OPPOSITE_RELATION = 'opposite',      // LIKES vs DISLIKES
  TEMPORAL_MISMATCH = 'temporal',      // Current vs Past
  DUPLICATE_CURRENT = 'duplicate',     // Two current relations same type+object
  AMBIGUOUS_VALUE = 'ambiguous',       // Different intensities
}

interface Conflict {
  type: ConflictType;
  newRelation: ExtractedRelation;
  existingRelations: Relation[];
  severity: 'low' | 'medium' | 'high';
  suggestedResolution: Resolution;
  requiresUserInput: boolean;
}
```

### Resolution Strategies

```typescript
function suggestResolution(conflict: Conflict): Resolution {
  switch (conflict.type) {
    case ConflictType.OPPOSITE_RELATION:
      // LIKES(pizza) + new DISLIKES(pizza) = preference changed
      return {
        action: 'mark_old_as_past',
        reason: 'Preferences can change over time',
        confidence: 0.8,
        userPrompt: 'Did Sarah stop liking pizza?'
      };

    case ConflictType.TEMPORAL_MISMATCH:
      // REGULARLY_DOES(smoking, status=past) + new REGULARLY_DOES(smoking)
      return {
        action: 'ask_user',
        reason: 'Relapse or new habit',
        confidence: 0.5,
        userPrompt: 'Did David start smoking again?'
      };

    case ConflictType.DUPLICATE_CURRENT:
      // Two current CARES_FOR same person
      return {
        action: 'merge_or_reject',
        reason: 'Only one current relation of same type+object allowed',
        confidence: 0.9,
        userPrompt: 'Update existing caregiving info or ignore new mention?'
      };

    case ConflictType.AMBIGUOUS_VALUE:
      // FEARS(heights, intensity=medium) + new FEARS(heights, intensity=strong)
      return {
        action: 'update_intensity',
        reason: 'Intensity may have increased',
        confidence: 0.7,
        userPrompt: 'Has Sarah\'s fear of heights gotten worse?'
      };
  }
}
```

---

## 6. Duplicate Person Management

### Duplicate Detection Algorithm

**4 Signal Approach:**

```typescript
function calculateMatchConfidence(
  extracted: ExtractedPerson,
  existing: Person
): number {
  let confidence = 0;
  const reasons: string[] = [];

  // SIGNAL 1: Name similarity (40% weight)
  const nameSimilarity = levenshteinSimilarity(
    extracted.name.toLowerCase(),
    existing.name.toLowerCase()
  );
  if (nameSimilarity > 0.9) {
    confidence += 0.4;
    reasons.push(`Name match: ${(nameSimilarity * 100).toFixed(0)}%`);
  } else if (nameSimilarity > 0.7) {
    confidence += 0.2;
    reasons.push(`Partial name match: ${(nameSimilarity * 100).toFixed(0)}%`);
  }

  // SIGNAL 2: Relationship type match (30% weight)
  if (extracted.relationshipType === existing.relationshipType) {
    confidence += 0.3;
    reasons.push(`Same relationship: ${extracted.relationshipType}`);
  }

  // SIGNAL 3: Context overlap (20% weight)
  if (extracted.relationToPrimary && existing.extractionContext) {
    const existingContext = JSON.parse(existing.extractionContext);
    if (existingContext.relation_to_primary === extracted.relationToPrimary) {
      confidence += 0.2;
      reasons.push(`Both are ${extracted.relationToPrimary}`);
    }
  }

  // SIGNAL 4: Data completeness (10% weight)
  if (existing.photoId) confidence += 0.05;
  if (existing.mentionCount > 3) confidence += 0.05;
  if (existing.dataCompleteness === 'complete') confidence += 0.05;
  if (confidence > 0.6) {
    reasons.push('Well-established person');
  }

  return { confidence: Math.min(confidence, 1.0), reasons };
}
```

### User Confirmation Flow

```typescript
async function presentDuplicateReview(
  duplicates: DuplicateMatch[]
): Promise<UserDecision[]> {
  // Sort by confidence (highest first)
  const sorted = duplicates.sort((a, b) => b.confidence - a.confidence);

  // Auto-merge if confidence > 0.95 and user has auto-merge enabled
  const autoMerge = sorted.filter(d => d.confidence > 0.95);
  const needsReview = sorted.filter(d => d.confidence <= 0.95);

  return {
    autoMerged: autoMerge.map(d => ({
      action: 'merge',
      canonical: d.existingPerson,
      duplicate: d.extractedPerson,
    })),

    needsUserDecision: needsReview.map(d => ({
      question: `Is "${d.extractedPerson.name}" the same as "${d.existingPerson.name}"?`,
      confidence: d.confidence,
      reasons: d.reasons,
      existingData: summarizePerson(d.existingPerson),
      newData: d.extractedPerson.knownFacts,
      options: [
        { label: 'Yes, same person', action: 'merge' },
        { label: 'No, different person', action: 'create_new' },
        { label: 'Not sure', action: 'skip' }
      ]
    }))
  };
}
```

---

## 7. Confidence Scoring

### Confidence Levels

| **Score** | **Label** | **Action** | **User Visibility** |
|-----------|-----------|------------|-------------------|
| 0.95-1.0 | Very High | Auto-accept | Hidden (background) |
| 0.80-0.94 | High | Auto-accept with notification | Quick review |
| 0.60-0.79 | Medium | Present for review | Full review UI |
| 0.40-0.59 | Low | Flag for review | Highlight uncertainty |
| 0.0-0.39 | Very Low | Reject or manual | Manual entry |

### Auto-Accept Thresholds

```typescript
interface AutoAcceptRules {
  // High-confidence, low-risk relations
  safeRelations: {
    threshold: 0.85,
    types: ['LIKES', 'DISLIKES', 'ASSOCIATED_WITH', 'EXPERIENCED']
  },

  // Medium confidence needed for sensitive relations
  sensitiveRelations: {
    threshold: 0.90,
    types: ['FEARS', 'STRUGGLES_WITH', 'SENSITIVE_TO', 'UNCOMFORTABLE_WITH']
  },

  // High confidence required for person-to-person
  personRelations: {
    threshold: 0.95,
    types: ['CARES_FOR', 'DEPENDS_ON']
  },

  // Always require review
  alwaysReview: {
    threshold: 1.0,  // Never auto-accept
    types: ['BELIEVES']  // Political/religious beliefs
  }
}
```

---

## 8. Performance Optimization

### Caching Strategy

```typescript
// Cache person name list for 5 minutes
const PERSON_CACHE_TTL = 5 * 60 * 1000;

class ExtractionService {
  private personCache: Map<string, CachedPersonList> = new Map();

  async getPersonContext(userId: string): Promise<PersonNameList[]> {
    const cached = this.personCache.get(userId);

    if (cached && Date.now() - cached.timestamp < PERSON_CACHE_TTL) {
      return cached.people;
    }

    const people = await db.select(/* ... */);

    this.personCache.set(userId, {
      people,
      timestamp: Date.now()
    });

    return people;
  }
}
```

### Batch Processing

```typescript
// Process multiple stories in parallel
async function batchExtract(
  stories: Story[],
  userId: string
): Promise<ExtractionResult[]> {
  const context = await prepareExtractionContext(userId, '');  // Get once

  // Process in parallel (max 5 concurrent)
  const results = await Promise.all(
    stories.map(story =>
      extractRelations({ ...context, storyText: story.text })
    )
  );

  return results;
}
```

### Database Query Optimization

```typescript
// Use indexes for conflict detection
CREATE INDEX relations_conflict_idx
  ON relations(user_id, subject_id, relation_type, object_label);

// Limit result sets
const CONFLICT_CHECK_LIMIT = 10;  // Don't check more than 10 existing relations

// Use prepared statements
const conflictQuery = db.prepare(`
  SELECT * FROM relations
  WHERE user_id = ?
    AND subject_id = ?
    AND relation_type IN (?, ?)
    AND object_label LIKE ?
  LIMIT ?
`);
```

---

## Performance Summary

### MVP Targets (Single Story Extraction)

| **Metric** | **Target** | **Actual (Expected)** |
|------------|------------|---------------------|
| **Latency** | < 5s | 2-5s |
| **Cost** | < $0.05 | $0.02 |
| **Token usage** | < 2000 | ~1500 |
| **DB queries** | < 20 | ~10-15 |
| **Accuracy** | > 85% | 80-90% |

### Scaling Characteristics

| **User Profile Size** | **Extraction Latency** | **Cost** |
|-----------------------|----------------------|----------|
| 10 people | 2s | $0.015 |
| 100 people | 2.5s | $0.02 |
| 1000 people | 3.5s | $0.03 |
| 10,000 people | 5s | $0.05 |

**Key Insight**: Latency scales logarithmically, cost scales linearly with context size. Lightweight context keeps both manageable even at 10,000+ people.

---

## Implementation Checklist

- [ ] Build extraction prompt template
- [ ] Implement lightweight context fetcher
- [ ] Create AI extraction service
- [ ] Add conflict detection logic
- [ ] Build duplicate matching algorithm
- [ ] Create user review UI
- [ ] Add confidence scoring
- [ ] Implement auto-accept rules
- [ ] Add caching layer
- [ ] Optimize database queries
- [ ] Add performance monitoring

---

**End of AI_EXTRACTION_STRATEGY.md**
