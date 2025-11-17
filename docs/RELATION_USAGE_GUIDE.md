# Relation Usage Guide & Decision Trees

**Version**: 1.0
**Last Updated**: 2025-11-07
**Purpose**: Help AI extraction and users choose the correct relation type for any scenario

---

## Table of Contents
1. [Quick Decision Tree](#quick-decision-tree)
2. [Relation Type Selection by Category](#relation-type-selection-by-category)
3. [Ambiguous Case Resolution](#ambiguous-case-resolution)
4. [Common Patterns](#common-patterns)
5. [Anti-Patterns (What NOT to Do)](#anti-patterns-what-not-to-do)
6. [Extraction Examples](#extraction-examples)

---

## 1. Quick Decision Tree

### Start Here: What Type of Information Are You Capturing?

```
┌─────────────────────────────────────────────────────────────┐
│ Is this about a PERSON-TO-PERSON relationship?              │
│ (Sarah knows John, Sarah cares for her mother)              │
└──────────┬──────────────────────────────────────────────────┘
           │
           ├─ YES → Use KNOWS (general) or specific:
           │        • CARES_FOR (if caregiving/support involved)
           │        • DEPENDS_ON (if dependency relationship)
           │        • UNCOMFORTABLE_WITH (if tension/conflict)
           │
           └─ NO → Continue below ↓

┌─────────────────────────────────────────────────────────────┐
│ Is this about IDENTITY or BELIEFS?                          │
│ (is a doctor, is catholic, believes in climate change)      │
└──────────┬──────────────────────────────────────────────────┘
           │
           ├─ Identity/Role → IS (is a doctor, is vegan)
           │
           └─ Belief/Opinion → BELIEVES (believes in god, thinks...)

┌─────────────────────────────────────────────────────────────┐
│ Is this about EMOTIONS or MENTAL STATE?                     │
│ (fears heights, struggles with anxiety, wants to...)        │
└──────────┬──────────────────────────────────────────────────┘
           │
           ├─ Fear/Phobia → FEARS
           ├─ Ongoing challenge → STRUGGLES_WITH
           ├─ Goal/Aspiration → WANTS_TO_ACHIEVE
           ├─ Sensitivity → SENSITIVE_TO or UNCOMFORTABLE_WITH
           │
           └─ Continue below ↓

┌─────────────────────────────────────────────────────────────┐
│ Is this about PREFERENCES or OPINIONS?                      │
│ (likes pizza, dislikes crowds, prefers tea over coffee)    │
└──────────┬──────────────────────────────────────────────────┘
           │
           ├─ Simple preference → LIKES or DISLIKES
           │
           └─ Comparative preference → PREFERS_OVER

┌─────────────────────────────────────────────────────────────┐
│ Is this about ACTIVITIES or HABITS?                         │
│ (runs daily, used to smoke, wants to learn guitar)         │
└──────────┬──────────────────────────────────────────────────┘
           │
           ├─ Current habit → REGULARLY_DOES (status=current)
           ├─ Past habit → REGULARLY_DOES (status=past) OR USED_TO_BE
           ├─ Desired habit → REGULARLY_DOES (status=aspiration)
           │
           └─ Continue below ↓

┌─────────────────────────────────────────────────────────────┐
│ Is this about SKILLS, POSSESSIONS, or ASSOCIATIONS?         │
└──────────┬──────────────────────────────────────────────────┘
           │
           ├─ Skill/Ability → HAS_SKILL
           ├─ Ownership → OWNS
           ├─ Association/Membership → ASSOCIATED_WITH
           ├─ Life event/Experience → EXPERIENCED
           │
           └─ Important date → HAS_IMPORTANT_DATE
```

---

## 2. Relation Type Selection by Category

### 2.1 IDENTITY & BELIEFS

#### When to use **IS**:
- ✅ Professional roles: "is a doctor", "is a teacher"
- ✅ Identities: "is vegan", "is catholic", "is LGBTQ+"
- ✅ Nationalities: "is American", "is Polish"
- ✅ Persistent characteristics: "is introverted", "is left-handed"

**Decision Rule**: If you can say "X **is a** Y" or "X **is** Y", use IS.

**Examples**:
```typescript
IS(Sarah, doctor, { category: 'profession', specialty: 'pediatrics' })
IS(John, vegan, { category: 'lifestyle', since_when: '2020', strictness: 'strict' })
IS(Maria, catholic, { category: 'religion', practicing: true })
```

#### When to use **BELIEVES**:
- ✅ Opinions: "believes climate change is real"
- ✅ Worldviews: "believes in karma", "believes in free market"
- ✅ Hypotheses: "thinks John is lying", "suspects fraud"
- ✅ Values: "believes family comes first"

**Decision Rule**: If you can say "X **believes/thinks** Y", use BELIEVES.

**Examples**:
```typescript
BELIEVES(Sarah, climate_change_is_real, { confidence: 'very_strong', topic: 'environment' })
BELIEVES(John, free_market_economy, { intensity: 'strong', political: true })
BELIEVES(Maria, karma, { category: 'spiritual', confidence: 'medium' })
```

---

### 2.2 EMOTIONS & MENTAL STATE

#### When to use **FEARS**:
- ✅ Phobias: "fears heights", "fears spiders"
- ✅ Anxieties: "fears public speaking", "fears failure"
- ✅ Concerns: "fears losing job", "fears being alone"

**Decision Rule**: If it causes anxiety, avoidance, or emotional distress.

**NOT FEARS**: Simple dislikes (use DISLIKES instead). "Doesn't like heights" ≠ "Fears heights"

**Examples**:
```typescript
FEARS(Sarah, heights, { category: 'phobia', intensity: 'very_strong', triggers: ['tall_buildings', 'balconies'] })
FEARS(John, public_speaking, { category: 'social_anxiety', impact: 'avoids_presentations' })
```

#### When to use **STRUGGLES_WITH**:
- ✅ Ongoing challenges: "struggles with depression", "struggles with time management"
- ✅ Difficulties: "struggles to say no", "struggles with math"
- ✅ Addictions: "struggles with alcohol", "struggles to quit smoking"

**Decision Rule**: If it's an active, ongoing difficulty (not just a one-time event).

**Examples**:
```typescript
STRUGGLES_WITH(Sarah, depression, { category: 'mental_health', severity: 'moderate', since_when: '2022' })
STRUGGLES_WITH(John, time_management, { category: 'productivity', impact: 'often_late' })
```

#### When to use **WANTS_TO_ACHIEVE**:
- ✅ Goals: "wants to run a marathon", "wants to learn Spanish"
- ✅ Aspirations: "wants to become CEO", "wants to travel the world"
- ✅ Desires: "wants to buy a house", "wants to have children"

**Decision Rule**: If it's a future-oriented goal or aspiration.

**Examples**:
```typescript
WANTS_TO_ACHIEVE(Sarah, run_marathon, { timeframe: '1_year', motivation: 'health', status: 'training' })
WANTS_TO_ACHIEVE(John, learn_Spanish, { timeframe: 'long_term', reason: 'travel' })
```

---

### 2.3 PREFERENCES & OPINIONS

#### When to use **LIKES**:
- ✅ Enjoyment: "likes pizza", "likes hiking"
- ✅ Positive feelings: "likes summer", "likes quiet environments"
- ✅ General preferences: "likes action movies"

**Decision Rule**: Positive preference without comparison.

**Examples**:
```typescript
LIKES(Sarah, pizza, { intensity: 'strong', category: 'food', favorite_type: 'margherita' })
LIKES(John, hiking, { intensity: 'very_strong', category: 'activity', frequency: 'weekly' })
```

#### When to use **DISLIKES**:
- ✅ Aversion: "dislikes crowds", "dislikes spicy food"
- ✅ Negative feelings: "dislikes winter", "dislikes small talk"
- ✅ Pet peeves: "dislikes being late"

**Decision Rule**: Negative preference without fear/phobia intensity.

**Examples**:
```typescript
DISLIKES(Sarah, crowds, { intensity: 'strong', category: 'environment', reason: 'overstimulating' })
DISLIKES(John, spicy_food, { intensity: 'medium', category: 'food' })
```

#### When to use **PREFERS_OVER**:
- ✅ Comparative preferences: "prefers tea over coffee", "prefers cats over dogs"
- ✅ Choices: "prefers email over phone calls"
- ✅ Rankings: "prefers summer over winter"

**Decision Rule**: ONLY when comparing two specific things.

**Examples**:
```typescript
PREFERS_OVER(Sarah, tea, { over: 'coffee', intensity: 'strong', reason: 'less_caffeine' })
PREFERS_OVER(John, email, { over: 'phone_calls', context: 'work_communication' })
```

---

### 2.4 ACTIVITIES & HABITS

#### When to use **REGULARLY_DOES**:
- ✅ Current habits: "runs every morning", "meditates daily"
- ✅ Past habits: "used to smoke" (status=past)
- ✅ Routines: "goes to church on Sundays", "calls mom every week"
- ✅ Aspirational habits: "wants to start journaling" (status=aspiration)

**Decision Rule**: If it's a repeated activity with a frequency.

**Examples**:
```typescript
// Current habit
REGULARLY_DOES(Sarah, morning_run, {
  frequency: 'daily',
  status: 'current',
  since_when: '2023-01',
  time_of_day: 'morning'
})

// Past habit
REGULARLY_DOES(John, smoking, {
  frequency: 'daily',
  status: 'past',
  validFrom: '2010',
  validTo: '2022-06',
  quit_reason: 'health'
})

// Aspirational
REGULARLY_DOES(Maria, journaling, {
  frequency: 'daily',
  status: 'aspiration',
  motivation: 'mental_health'
})
```

#### When to use **USED_TO_BE**:
- ✅ Past identities: "used to be a smoker", "used to be overweight"
- ✅ Changed roles: "used to be CEO", "used to be married"
- ✅ Life phases: "used to be a competitive athlete"

**Decision Rule**: If it describes a past identity or state (not just a habit).

**USED_TO_BE vs REGULARLY_DOES (status=past)**:
- Use USED_TO_BE for identities: "used to be a smoker" (identity change)
- Use REGULARLY_DOES for activities: "used to smoke daily" (habit)

**Examples**:
```typescript
USED_TO_BE(Sarah, smoker, {
  category: 'habit',
  validFrom: '2010',
  validTo: '2022',
  reason_for_change: 'quit_for_health'
})

USED_TO_BE(John, competitive_athlete, {
  category: 'identity',
  validFrom: '2005',
  validTo: '2015',
  reason_for_change: 'knee_injury',
  sport: 'running'
})
```

---

### 2.5 RELATIONSHIPS

#### When to use **KNOWS** (person-to-person):
- ✅ General acquaintance: "Sarah knows John"
- ✅ Professional network: "met at conference"
- ⚠️ **Use `connections` table for primary relationships**
- ⚠️ **Use KNOWS in relations table only for context/notes**

**Decision Rule**: For simple person-to-person awareness. For deeper relationships, use connections table.

#### When to use **CARES_FOR**:
- ✅ Caregiving: "cares for aging mother", "cares for disabled sibling"
- ✅ Parenting: "cares for young children"
- ✅ Support: "cares for friend with depression"
- ✅ Pets: "cares for rescue dog"
- ✅ Causes: "cares about climate change" (abstract)

**Decision Rule**: If there's an element of responsibility, support, or emotional investment.

**Examples**:
```typescript
// Person caregiving
CARES_FOR(Sarah, mother, {
  care_type: 'elderly_parent',
  objectType: 'person',
  objectId: mother_uuid,
  level: 'part_time',
  responsibilities: ['medical', 'emotional'],
  impact_on_availability: 'medium'
})

// Pet care
CARES_FOR(John, rescue_dog, {
  care_type: 'pet',
  objectType: 'pet',
  level: 'full_time',
  emotional_bond: 'very_strong'
})

// Abstract cause
CARES_FOR(Maria, climate_change, {
  care_type: 'cause',
  objectType: 'cause',
  level: 'emotional_only',
  involvement: 'activism'
})
```

#### When to use **DEPENDS_ON**:
- ✅ Financial dependency: "depends on parents financially"
- ✅ Emotional dependency: "depends on therapist"
- ✅ Practical dependency: "depends on assistant for scheduling"
- ✅ Tool/Service dependency: "depends on coffee for energy"

**Decision Rule**: If there's a need or reliance.

**Examples**:
```typescript
// Person dependency
DEPENDS_ON(Sarah, therapist, {
  dependency_type: 'emotional_support',
  objectType: 'person',
  objectId: therapist_uuid,
  level: 'moderate',
  frequency: 'weekly_sessions'
})

// Substance dependency
DEPENDS_ON(John, coffee, {
  dependency_type: 'energy',
  objectType: 'substance',
  level: 'moderate',
  frequency: 'daily',
  amount: '3_cups'
})
```

#### When to use **UNCOMFORTABLE_WITH**:
- ✅ Social discomfort: "uncomfortable with ex-partner"
- ✅ Topic avoidance: "uncomfortable with politics talk"
- ✅ Situation discomfort: "uncomfortable in crowded elevators"

**Decision Rule**: If it causes discomfort but not fear-level anxiety.

**UNCOMFORTABLE_WITH vs FEARS**:
- UNCOMFORTABLE_WITH: Mild to moderate discomfort, can tolerate if needed
- FEARS: Intense anxiety, actively avoids

**Examples**:
```typescript
UNCOMFORTABLE_WITH(Sarah, ex_partner, {
  objectType: 'person',
  objectId: ex_uuid,
  reason: 'past_relationship',
  level: 'moderate',
  avoidance_strategy: 'minimize_contact'
})

UNCOMFORTABLE_WITH(John, political_discussions, {
  objectType: 'topic',
  context: 'family_gatherings',
  reason: 'causes_conflict'
})
```

---

### 2.6 SKILLS, POSSESSIONS & ASSOCIATIONS

#### When to use **HAS_SKILL**:
- ✅ Abilities: "speaks Spanish", "knows Python"
- ✅ Talents: "plays piano", "good at public speaking"
- ✅ Certifications: "has CPR certification"

**Decision Rule**: If it's a learned or innate ability.

**Examples**:
```typescript
HAS_SKILL(Sarah, Spanish, {
  category: 'language',
  proficiency: 'fluent',
  years_of_practice: 10
})

HAS_SKILL(John, Python, {
  category: 'programming',
  proficiency: 'expert',
  years_of_experience: 8
})
```

#### When to use **OWNS**:
- ✅ Possessions: "owns a Tesla", "owns a house"
- ✅ Pets: "owns a cat" (if not emphasizing care, otherwise use CARES_FOR)
- ✅ Assets: "owns rental properties"

**Decision Rule**: If it's about ownership/possession.

**Examples**:
```typescript
OWNS(Sarah, Tesla, {
  category: 'vehicle',
  since_when: '2023',
  importance: 'daily_use'
})

OWNS(John, rental_properties, {
  category: 'real_estate',
  count: 3,
  investment: true
})
```

#### When to use **ASSOCIATED_WITH**:
- ✅ Memberships: "member of chess club", "works at Google"
- ✅ Affiliations: "associated with startup community"
- ✅ Groups: "part of running group"

**Decision Rule**: If it's about belonging to a group/organization.

**Examples**:
```typescript
ASSOCIATED_WITH(Sarah, Google, {
  association_type: 'employment',
  role: 'engineer',
  since_when: '2022'
})

ASSOCIATED_WITH(John, chess_club, {
  association_type: 'membership',
  status: 'active',
  involvement_level: 'regular'
})
```

---

## 3. Ambiguous Case Resolution

### Case 1: "Sarah doesn't like heights"
**Ambiguity**: Is it DISLIKES or FEARS?

**Decision Tree**:
```
Does Sarah avoid situations with heights at all costs?
├─ YES → Does it cause anxiety/panic?
│         ├─ YES → FEARS (phobia-level)
│         └─ NO → DISLIKES (strong aversion)
│
└─ NO → Can she tolerate heights if needed?
          ├─ YES → DISLIKES
          └─ NO → FEARS
```

**Examples**:
```typescript
// Mild: Can go on balcony but doesn't enjoy it
DISLIKES(Sarah, heights, { intensity: 'medium', reason: 'makes_me_nervous' })

// Severe: Refuses to go near windows in tall buildings
FEARS(Sarah, heights, { category: 'phobia', intensity: 'very_strong', triggers: ['tall_buildings', 'balconies'] })
```

---

### Case 2: "John used to climb every week but doesn't anymore"
**Ambiguity**: Use REGULARLY_DOES (status=past) or USED_TO_BE?

**Decision Tree**:
```
Is climbing part of John's identity?
├─ YES → "I used to be a climber" → USED_TO_BE
│
└─ NO → "I used to climb weekly" → REGULARLY_DOES (status=past)
```

**Examples**:
```typescript
// Activity-focused: Just stopped a hobby
REGULARLY_DOES(John, rock_climbing, {
  frequency: 'weekly',
  status: 'past',
  validFrom: '2010',
  validTo: '2020',
  reason_stopped: 'knee_injury'
})

// Identity-focused: Was part of who he was
USED_TO_BE(John, competitive_climber, {
  category: 'identity',
  validFrom: '2010',
  validTo: '2020',
  reason_for_change: 'knee_injury',
  achievement_level: 'sponsored_athlete'
})

// BOTH can coexist if both aspects are important!
```

---

### Case 3: "Sarah cares about her team at work"
**Ambiguity**: Use CARES_FOR (each person) or ASSOCIATED_WITH?

**Decision Tree**:
```
Is there a specific caregiving/support relationship?
├─ YES → Individual CARES_FOR relations
│
└─ NO → General affiliation → ASSOCIATED_WITH
```

**Examples**:
```typescript
// General team affiliation
ASSOCIATED_WITH(Sarah, engineering_team, {
  association_type: 'work_team',
  role: 'team_lead',
  relationship_quality: 'positive'
})

// Specific care (if Sarah mentors someone)
CARES_FOR(Sarah, junior_engineer_Mike, {
  care_type: 'mentorship',
  objectType: 'person',
  objectId: mike_uuid,
  level: 'professional_support'
})
```

---

### Case 4: "John is trying to quit smoking"
**Ambiguity**: Multiple possible relations

**Decision Tree**:
```
What aspect are we capturing?
├─ Past habit → REGULARLY_DOES (status=past)
│
├─ Current struggle → STRUGGLES_WITH
│
├─ Current (reduced) habit → REGULARLY_DOES (status=current, frequency: 'rarely')
│
└─ Goal to quit → WANTS_TO_ACHIEVE
```

**Comprehensive Capture** (use multiple relations):
```typescript
// 1. The old habit (now past)
REGULARLY_DOES(John, smoking, {
  frequency: 'daily',
  status: 'past',
  validTo: '2024-10',
  amount: '1_pack_per_day'
})

// 2. Current struggle
STRUGGLES_WITH(John, nicotine_addiction, {
  category: 'addiction',
  severity: 'moderate',
  status: 'current',
  coping_strategies: ['nicotine_patches', 'therapy']
})

// 3. Goal
WANTS_TO_ACHIEVE(John, quit_smoking, {
  timeframe: '6_months',
  status: 'in_progress',
  motivation: 'health'
})
```

---

### Case 5: "Maria prefers working from home"
**Ambiguity**: LIKES, PREFERS_OVER, or REGULARLY_DOES?

**Decision Tree**:
```
Is there a comparison being made?
├─ YES → "prefers WFH over office" → PREFERS_OVER
│
└─ NO → Is it about liking or doing?
          ├─ Liking → LIKES
          └─ Doing → REGULARLY_DOES
```

**Examples**:
```typescript
// Comparison stated
PREFERS_OVER(Maria, working_from_home, {
  over: 'working_from_office',
  intensity: 'strong',
  reasons: ['focus', 'no_commute', 'flexibility']
})

// Simple preference (no comparison)
LIKES(Maria, working_from_home, {
  intensity: 'strong',
  category: 'work_style',
  reasons: ['quiet', 'flexible_hours']
})

// Current practice
REGULARLY_DOES(Maria, work_from_home, {
  frequency: 'daily',
  status: 'current',
  since_when: '2020',
  arrangement: 'full_remote'
})

// Again, multiple relations can capture different aspects!
```

---

## 4. Common Patterns

### Pattern 1: Capturing Life Transitions

**Scenario**: "John used to work at Google, now works at a startup"

**Correct Approach**:
```typescript
// Old job
ASSOCIATED_WITH(John, Google, {
  association_type: 'employment',
  role: 'senior_engineer',
  status: 'past',
  validFrom: '2018',
  validTo: '2024-06'
})

// New job
ASSOCIATED_WITH(John, TechStartup, {
  association_type: 'employment',
  role: 'founding_engineer',
  status: 'current',
  validFrom: '2024-06'
})
```

---

### Pattern 2: Capturing Complex Dietary Identities

**Scenario**: "Sarah is vegan, doesn't eat anything with face, prefers plant-based restaurants"

**Comprehensive Capture**:
```typescript
// Identity
IS(Sarah, vegan, {
  category: 'lifestyle',
  since_when: '2020',
  strictness: 'strict',
  reasons: ['ethics', 'environment']
})

// Dietary restriction (could also be DISLIKES)
UNCOMFORTABLE_WITH(Sarah, animal_products, {
  category: 'food',
  reason: 'ethical',
  intensity: 'very_strong',
  includes: ['meat', 'dairy', 'eggs']
})

// Restaurant preference
PREFERS_OVER(Sarah, plant_based_restaurants, {
  over: 'traditional_restaurants',
  intensity: 'strong',
  context: 'dining_out'
})
```

---

### Pattern 3: Capturing Caregiving Situations

**Scenario**: "Mark takes care of his aging mother with dementia, visits twice a week"

**Comprehensive Capture**:
```typescript
// 1. Auto-create mother as placeholder
const mother = {
  id: crypto.randomUUID(),
  name: "Mark's mother",
  personType: 'placeholder',
  dataCompleteness: 'minimal',
  addedBy: 'auto_created',
  importanceToUser: 'important',  // Auto-calculated from CARES_FOR
  extractionContext: JSON.stringify({
    mentioned_in_story: storyId,
    relation_to_primary: 'mother',
    known_facts: ['has_dementia', 'aging', 'receives_care_from_Mark']
  })
};

// 2. Caregiving relation
CARES_FOR(Mark, mother, {
  care_type: 'elderly_parent',
  objectType: 'person',
  objectId: mother.id,
  level: 'part_time',
  responsibilities: ['medical', 'emotional', 'financial'],
  frequency: 'twice_weekly',
  impact_on_availability: 'medium',
  condition: 'dementia'
})

// 3. Activity pattern
REGULARLY_DOES(Mark, visit_mother, {
  frequency: 'twice_weekly',
  status: 'current',
  location: 'nursing_home',
  duration: '2_hours',
  importance: 'very_important'
})
```

---

### Pattern 4: Capturing Conflict/Tension

**Scenario**: "Emma is uncomfortable around her ex-partner Tom at mutual gatherings"

**Comprehensive Capture**:
```typescript
// 1. Create/link ex-partner
const tom = {
  id: crypto.randomUUID(),
  name: 'Tom',
  personType: 'mentioned',
  relationshipType: 'acquaintance',  // Current status
  extractionContext: JSON.stringify({
    relation_to_primary: 'ex_partner',
    known_facts: ['past_romantic_relationship', 'mutual_friend_group']
  })
};

// 2. Discomfort relation
UNCOMFORTABLE_WITH(Emma, Tom, {
  objectType: 'person',
  objectId: tom.id,
  reason: 'past_relationship',
  level: 'moderate',
  context: 'mutual_friend_gatherings',
  avoidance_strategy: 'minimize_contact',
  impact: 'prefers_separate_invites'
})

// 3. Past relationship (if important)
USED_TO_BE(Emma, in_relationship_with_Tom, {
  category: 'relationship',
  validFrom: '2020',
  validTo: '2022',
  reason_for_change: 'breakup'
})
```

---

## 5. Anti-Patterns (What NOT to Do)

### ❌ Anti-Pattern 1: Using Wrong Relation for Person-to-Person

**Bad**:
```typescript
// ❌ Using ASSOCIATED_WITH for family
ASSOCIATED_WITH(Sarah, mother, {
  association_type: 'family'
})
```

**Good**:
```typescript
// ✅ Use connections table for family relationships
// OR use CARES_FOR if emphasizing caregiving aspect
CARES_FOR(Sarah, mother, {
  care_type: 'elderly_parent',
  objectType: 'person',
  objectId: mother_uuid
})
```

---

### ❌ Anti-Pattern 2: Over-using IS for Activities

**Bad**:
```typescript
// ❌ Activities are not identities
IS(John, runner, { category: 'activity' })
```

**Good**:
```typescript
// ✅ If it's an identity
IS(John, competitive_runner, {
  category: 'identity',
  level: 'professional',
  achievement: 'Boston_qualifier'
})

// ✅ If it's just a habit
REGULARLY_DOES(John, running, {
  frequency: 'daily',
  status: 'current'
})
```

**Rule**: Only use IS if the person would say "I am a runner" (identity), not just "I run" (activity).

---

### ❌ Anti-Pattern 3: Creating Redundant Relations

**Bad**:
```typescript
// ❌ Redundant
LIKES(Sarah, pizza, { intensity: 'strong' })
PREFERS_OVER(Sarah, pizza, { over: 'pasta' })
REGULARLY_DOES(Sarah, eat_pizza, { frequency: 'weekly' })
```

**Good**:
```typescript
// ✅ Choose most specific/informative relation
PREFERS_OVER(Sarah, pizza, {
  over: 'pasta',
  intensity: 'strong',
  frequency: 'weekly',
  favorite_type: 'margherita'
})
```

**Rule**: Choose the most specific relation that captures the most information. Avoid redundancy unless capturing truly different aspects.

---

### ❌ Anti-Pattern 4: Mixing Temporal Statuses

**Bad**:
```typescript
// ❌ Conflicting statuses
REGULARLY_DOES(John, smoking, {
  frequency: 'daily',
  status: 'current',  // Says current
  validTo: '2022'     // But has end date!
})
```

**Good**:
```typescript
// ✅ Consistent
REGULARLY_DOES(John, smoking, {
  frequency: 'daily',
  status: 'past',
  validFrom: '2010',
  validTo: '2022'
})
```

---

### ❌ Anti-Pattern 5: Vague Object Labels

**Bad**:
```typescript
// ❌ Too vague
CARES_FOR(Sarah, person, {
  care_type: 'elderly_parent'
})

FEARS(John, thing, {
  category: 'phobia'
})
```

**Good**:
```typescript
// ✅ Specific
CARES_FOR(Sarah, aging_mother, {
  care_type: 'elderly_parent',
  objectType: 'person'
})

FEARS(John, heights, {
  category: 'phobia'
})
```

**Rule**: `objectLabel` should always be descriptive enough to understand without metadata.

---

## 6. Extraction Examples

### Example 1: Short Story

**Story**: "Sarah mentioned her mom has dementia. She visits her twice a week. It's tough."

**Extraction**:
```typescript
// 1. Create placeholder for mother
const mother = {
  name: "Sarah's mother",
  personType: 'placeholder',
  addedBy: 'auto_created',
  extractionContext: JSON.stringify({
    mentioned_in_story: storyId,
    relation_to_primary: 'mother',
    known_facts: ['has_dementia']
  }),
  mentionCount: 1
};

// 2. Caregiving relation
CARES_FOR(Sarah, mother, {
  care_type: 'elderly_parent',
  objectType: 'person',
  objectId: mother.id,
  level: 'part_time',
  condition: 'dementia',
  emotional_state: 'stressed'  // From "it's tough"
})

// 3. Activity
REGULARLY_DOES(Sarah, visit_mother, {
  frequency: 'twice_weekly',
  status: 'current',
  importance: 'very_important'
})
```

---

### Example 2: Complex Story

**Story**: "John used to be a competitive climber. Climbed every week for 10 years. Had to stop in 2020 due to a knee injury. He's devastated and wants to get back to it, but his doctor says it's risky."

**Extraction**:
```typescript
// 1. Past identity
USED_TO_BE(John, competitive_climber, {
  category: 'identity',
  validFrom: '2010',
  validTo: '2020',
  reason_for_change: 'knee_injury',
  achievement_level: 'high'
})

// 2. Past habit
REGULARLY_DOES(John, rock_climbing, {
  frequency: 'weekly',
  status: 'past',
  validFrom: '2010',
  validTo: '2020-06',
  context: '10 years of weekly climbing'
})

// 3. Current struggle
STRUGGLES_WITH(John, loss_of_climbing, {
  category: 'emotional',
  severity: 'severe',
  emotional_state: 'devastated',
  since_when: '2020'
})

// 4. Aspiration (wants to return)
WANTS_TO_ACHIEVE(John, return_to_climbing, {
  timeframe: 'uncertain',
  status: 'blocked',
  obstacle: 'medical_risk',
  motivation: 'passion'
})

// 5. Medical constraint
SENSITIVE_TO(John, knee_injury, {
  category: 'medical',
  severity: 'moderate',
  impact: 'prevents_climbing',
  medical_advice: 'avoid_high_impact'
})
```

---

### Example 3: Preference Story

**Story**: "Mark is a meat-eater, loves steak. His best friend Emma is vegan. They've known each other for 15 years. They go to Thai restaurants together because there's something for both of them."

**Extraction**:
```typescript
// MARK:
// 1. Identity
IS(Mark, meat_eater, {
  category: 'lifestyle',
  dietary_preference: 'omnivore'
})

// 2. Strong preference
LIKES(Mark, steak, {
  intensity: 'very_strong',
  category: 'food',
  favorite_food: true
})

// 3. Restaurant preference (compromise)
LIKES(Mark, Thai_restaurants, {
  intensity: 'medium',
  category: 'dining',
  reason: 'inclusive_for_friends'
})

// EMMA:
// 1. Identity
IS(Emma, vegan, {
  category: 'lifestyle',
  since_when: 'unknown',
  strictness: 'strict'
})

// RELATIONSHIP (connections table):
KNOWS(Mark, Emma, {
  relationship_quality: 'best_friends',
  duration_years: 15,
  strength: 1.0
})

// SHARED PATTERN:
// Both like Thai restaurants for inclusive dining
```

---

## 7. Quick Reference Table

| **User Says** | **Relation Type** | **Notes** |
|---------------|-------------------|-----------|
| "is a doctor" | IS | Professional role/identity |
| "believes in god" | BELIEVES | Opinion/worldview |
| "fears heights" | FEARS | Phobia/anxiety |
| "struggles with depression" | STRUGGLES_WITH | Ongoing challenge |
| "wants to learn guitar" | WANTS_TO_ACHIEVE | Goal/aspiration |
| "likes pizza" | LIKES | Simple preference |
| "dislikes crowds" | DISLIKES | Negative preference |
| "prefers tea over coffee" | PREFERS_OVER | Comparative preference |
| "runs every morning" | REGULARLY_DOES | Current habit |
| "used to smoke" | REGULARLY_DOES (status=past) OR USED_TO_BE | Depends on identity vs activity |
| "cares for mother" | CARES_FOR | Caregiving/support |
| "depends on coffee" | DEPENDS_ON | Dependency/reliance |
| "uncomfortable with ex" | UNCOMFORTABLE_WITH | Social discomfort |
| "speaks Spanish" | HAS_SKILL | Ability/skill |
| "owns a Tesla" | OWNS | Possession |
| "works at Google" | ASSOCIATED_WITH | Membership/employment |
| "experienced burnout" | EXPERIENCED | Past event |
| "birthday on May 5" | HAS_IMPORTANT_DATE | Important date |
| "sensitive to criticism" | SENSITIVE_TO | Emotional sensitivity |

---

**End of RELATION_USAGE_GUIDE.md**
