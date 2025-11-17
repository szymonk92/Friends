# Relation Types Ontology - Design Discussion

**Updated:** November 7, 2025
**Status:** Implemented (20 Core Relations)

---

## 🎯 The Core Question

**How do we model relationships in a way that is:**
1. ✅ Expressive enough to capture nuanced relationships
2. ✅ Simple enough for AI to extract from stories
3. ✅ Extensible for future use cases (meal planning, gift recommendations)
4. ✅ Easy for users to understand and verify

---

## 🏗️ Three Architectural Approaches

### Approach 1: Fixed Predefined Relations (Simple) ⭐

**Philosophy:** Define a small, fixed set of well-understood relations

```
Person → KNOWS → Person
Person → LIKES → Thing
Person → DISLIKES → Thing
Person → OWNS → Thing
Person → WORKS_AT → Organization
Person → LIVES_IN → Place
```

**Pros:**
✅ Simple to implement
✅ Easy for AI to extract
✅ Clear semantics
✅ Type-safe in TypeScript

**Cons:**
❌ Limited expressiveness
❌ Hard to extend without code changes
❌ Might miss important relationships

---

### Approach 2: Open Vocabulary (Flexible) 🔧

**Philosophy:** Allow any relation type, let AI extract whatever it finds

```
Person → [any string] → Entity

Examples:
Person → "is married to" → Person
Person → "is allergic to" → Thing
Person → "used to work with" → Person
Person → "dreams of visiting" → Place
```

**Pros:**
✅ Maximum flexibility
✅ Can capture any relationship
✅ No code changes needed for new relations
✅ Natural language friendly

**Cons:**
❌ Inconsistent relation names (synonyms)
❌ Hard to query ("likes" vs "loves" vs "enjoys")
❌ Ambiguous semantics
❌ Type safety challenges

---

### Approach 3: Hierarchical Ontology (Best of Both) 🏆

**Philosophy:** Core relations + extensible sub-types

```
Core Relations (5-10 fixed):
  KNOWS
  LIKES
  DISLIKES
  HAS_SKILL
  ASSOCIATED_WITH

Each core relation has optional qualifiers:
  LIKES(food:ice_cream, confidence:0.95)
  KNOWS(person:Ola, since:2015, strength:0.9)
  HAS_SKILL(skill:cooking, level:expert)
  ASSOCIATED_WITH(place:Italy, type:visited, count:10)
```

**Pros:**
✅ Balance of structure and flexibility
✅ Queryable (group by core relation)
✅ Extensible (qualifiers can be added)
✅ AI-friendly (maps to fixed set)
✅ Type-safe core with flexible metadata

**Cons:**
⚠️ More complex to implement
⚠️ Need clear documentation

**Verdict: RECOMMENDED** ✅

---

## 📊 Proposed Core Relations (Hierarchical Approach)

### Category 1: Social Relationships (Person ↔ Person)

#### KNOWS
**Description:** General acquaintance or relationship between people

**Sub-types:**
- `relationship_type`: friend, family, colleague, acquaintance, partner
- `since`: When they met (date)
- `strength`: 0.0 to 1.0 (calculated from shared experiences)
- `context`: How they know each other (work, school, hobby)

**Examples:**
```
Ola → KNOWS → User
  relationship_type: friend
  since: 2015-11-07
  strength: 0.85
  context: conference

Sarah → KNOWS → Mark
  relationship_type: colleague
  since: 2020-01-15
  strength: 0.6
  context: work
```

**AI Extraction Patterns:**
- "I met [Person] X years ago"
- "[Person] and [Person] are friends"
- "[Person] works with [Person]"
- "[Person] is my [relationship]"

---

### Category 2: Preferences (Person ↔ Thing)

#### LIKES
**Description:** Positive preference or affinity

**Sub-types by category:**
- `category`: food, activity, travel, entertainment, other
- `item`: The specific thing they like
- `confidence`: 0.0 to 1.0 (AI confidence)
- `intensity`: mild, moderate, strong, passionate
- `verified`: boolean (user confirmed)

**Examples:**
```
Ola → LIKES → ice_cream
  category: food
  confidence: 0.95
  intensity: strong
  source_story: "we always eat ice cream"

Sarah → LIKES → hiking
  category: activity
  confidence: 0.9
  intensity: moderate
  source_story: "Sarah loved the trail"
```

**AI Extraction Patterns:**
- "[Person] loves [Thing]"
- "[Person] always eats [Food]"
- "[Person] enjoys [Activity]"
- "[Person] is passionate about [Thing]"

#### DISLIKES
**Description:** Negative preference or aversion

**Sub-types:**
- `category`: Same as LIKES
- `item`: The thing they dislike
- `confidence`: 0.0 to 1.0
- `severity`: mild, moderate, strong, extreme
- `reason`: Optional context (allergy, preference, ethics)

**Examples:**
```
Sarah → DISLIKES → nuts
  category: food
  severity: extreme
  reason: allergy
  confidence: 1.0

John → DISLIKES → horror_movies
  category: entertainment
  severity: moderate
  reason: preference
  confidence: 0.8
```

**AI Extraction Patterns:**
- "[Person] hates [Thing]"
- "[Person] doesn't like [Thing]"
- "[Person] is allergic to [Thing]"
- "[Person] avoids [Thing]"

---

### Category 3: Skills & Expertise (Person ↔ Knowledge)

#### HAS_SKILL
**Description:** Competency or expertise in a domain

**Sub-types:**
- `skill`: Name of the skill
- `level`: beginner, intermediate, advanced, expert, master
- `domain`: cooking, programming, sports, arts, languages, etc.
- `confidence`: 0.0 to 1.0

**Examples:**
```
Mark → HAS_SKILL → baking
  domain: cooking
  level: advanced
  confidence: 0.9
  evidence: "Mark brought his famous cookies"

Lisa → HAS_SKILL → python
  domain: programming
  level: expert
  confidence: 0.95
```

**AI Extraction Patterns:**
- "[Person] is good at [Skill]"
- "[Person] knows how to [Skill]"
- "[Person] is an expert in [Domain]"
- "[Person]'s famous [Thing]" (implies skill)

**Use Cases:**
- Ask for help: "Who knows Python?"
- Dinner parties: "Mark can bring dessert!"
- Gift ideas: "Get Sarah hiking gear"

---

### Category 4: Possessions & Resources (Person ↔ Thing)

#### OWNS
**Description:** Physical or abstract ownership

**Sub-types:**
- `item`: What they own
- `category`: vehicle, pet, property, business, collection
- `since`: When acquired
- `status`: current, past, planning_to_acquire

**Examples:**
```
Tom → OWNS → tesla_model_3
  category: vehicle
  since: 2022-06
  status: current

Emma → OWNS → golden_retriever
  category: pet
  name: "Max"
  since: 2020-03
```

**AI Extraction Patterns:**
- "[Person] has a [Thing]"
- "[Person] owns [Thing]"
- "[Person] bought a [Thing]"
- "[Person] got a [Pet]"

**Use Cases:**
- "Who has a car?" (trip planning)
- "Who has a dog?" (park meetups)
- "Who collects vinyl?" (gift ideas)

---

### Category 5: Location Associations (Person ↔ Place)

#### ASSOCIATED_WITH (Place)

**Description:** Connection to a location

**Sub-types:**
- `place`: Location name
- `type`: lived, lives, visited, works_at, studies_at, born_in, dreams_of
- `timeframe`: When (date or date range)
- `frequency`: once, multiple, regular
- `count`: Number of visits (for visited)

**Examples:**
```
Ola → ASSOCIATED_WITH → Italy
  type: visited
  frequency: multiple
  count: 10
  timeframe: 2015-2024

User → ASSOCIATED_WITH → Italy
  type: visited
  frequency: multiple
  count: 10
  shared_with: Ola

Sarah → ASSOCIATED_WITH → San_Francisco
  type: lives
  since: 2019-03
```

**AI Extraction Patterns:**
- "[Person] lives in [Place]"
- "We went to [Place]"
- "[Person] has been to [Place] X times"
- "[Person] works at [Place]"
- "[Person] was born in [Place]"

**Use Cases:**
- "Who's been to Italy?" (travel tips)
- "Who lives in SF?" (meetups)
- "Where has [Person] traveled?"

---

### Category 6: Experiences (Person ↔ Event)

#### EXPERIENCED
**Description:** Participated in or attended an event/activity

**Sub-types:**
- `event`: Event or activity name
- `type`: activity, milestone, celebration, achievement
- `date`: When it happened
- `location`: Where
- `with`: List of other people
- `role`: participant, organizer, attendee

**Examples:**
```
User → EXPERIENCED → italy_trip_2020
  type: activity
  date: 2020-06-15 to 2020-06-29
  location: Italy
  with: [Ola]
  activities: [sightseeing, dining, museums]

Mark → EXPERIENCED → hiking_2024
  type: activity
  date: 2024-10-15
  location: Lake Trail
  with: [Sarah, User]
  role: participant
```

**AI Extraction Patterns:**
- "We went to [Place] together"
- "[Person] and I did [Activity]"
- "[Person] attended [Event]"
- "We celebrated [Milestone]"

---

### Category 7: Dietary & Health (Person ↔ Constraint)

#### HAS_DIETARY_RESTRICTION
**Description:** Food-related constraints or preferences

**Sub-types:**
- `restriction`: The constraint
- `type`: allergy, intolerance, preference, religious, ethical
- `severity`: mild, moderate, severe, life_threatening
- `since`: When it started
- `verified`: boolean

**Examples:**
```
Sarah → HAS_DIETARY_RESTRICTION → vegetarian
  type: ethical
  since: 2024-01
  verified: true

Emma → HAS_DIETARY_RESTRICTION → nuts
  type: allergy
  severity: life_threatening
  verified: true
```

**AI Extraction Patterns:**
- "[Person] is vegetarian"
- "[Person] is allergic to [Food]"
- "[Person] doesn't eat [Food]"
- "[Person] can't have [Food]"

**Use Cases:**
- Meal planning: "Can [Person] eat this?"
- Restaurant selection
- Grocery shopping

---

### Category 8: Temporal (Person ↔ Date)

#### HAS_IMPORTANT_DATE
**Description:** Significant dates to remember

**Sub-types:**
- `date`: The date (full or recurring)
- `type`: birthday, anniversary, work_anniversary, memorial
- `recurring`: boolean
- `send_reminder`: boolean

**Examples:**
```
Ola → HAS_IMPORTANT_DATE → birthday
  date: 05-15 (May 15, recurring)
  type: birthday
  send_reminder: true

User+Ola → HAS_IMPORTANT_DATE → friendship_anniversary
  date: 2015-11-07
  type: anniversary
  recurring: true
  context: "Met at conference"
```

**AI Extraction Patterns:**
- "[Person]'s birthday is [Date]"
- "We met on [Date]"
- "[Person] started working on [Date]"

---

### Category 9: Identity & Attributes (Person ↔ Identity)

#### IS
**Description:** Core identity attributes, characteristics, professions, beliefs, or categorical memberships

**Sub-types by category:**
- `category`: profession, religion, nationality, identity, lifestyle, condition, role
- `attribute`: The specific identity or attribute
- `confidence`: 0.0 to 1.0 (AI confidence)
- `since`: When this became true (optional)
- `verified`: boolean (user confirmed)
- `context`: Additional context or qualifier

**Examples:**
```
Sarah → IS → doctor
  category: profession
  confidence: 1.0
  since: 2018-06
  verified: true
  context: "pediatrician"

Mark → IS → catholic
  category: religion
  confidence: 0.95
  verified: false
  context: "mentioned attending church"

Emma → IS → vegetarian
  category: lifestyle
  since: 2024-01
  confidence: 1.0
  verified: true

Tom → IS → Brazilian
  category: nationality
  confidence: 1.0
  verified: true

Lisa → IS → parent
  category: role
  confidence: 1.0
  context: "has two children"

John → IS → diabetic
  category: condition
  confidence: 1.0
  verified: true
  context: "Type 2"
```

**AI Extraction Patterns:**
- "[Person] is a [Profession]"
- "[Person] is [Religion/Nationality/Identity]"
- "[Person] works as a [Job]"
- "[Person] has [Condition]"
- "[Person] identifies as [Identity]"

**Use Cases:**
- Professional networking: "Who's a doctor?"
- Event planning: "Consider dietary restrictions (vegetarians)"
- Understanding context: "Remember John needs sugar-free options"
- Gift recommendations: "Religious considerations for gifts"
- Conversation starters: "Ask Sarah about her medical career"

---

### Category 10: Beliefs & Opinions (Person ↔ Belief)

#### BELIEVES
**Description:** Opinions, beliefs, values, and perspectives a person holds

**Sub-types by category:**
- `category`: political, social, environmental, philosophical, personal, value
- `belief`: The specific belief or opinion
- `intensity`: weak, moderate, strong, very_strong
- `confidence`: 0.0 to 1.0 (AI confidence)
- `context`: Additional context or evidence
- `since`: When this belief was mentioned (optional)

**Examples:**
```
Sarah → BELIEVES → climate_action_important
  category: environmental
  intensity: very_strong
  confidence: 0.95
  context: "Sarah is passionate about reducing carbon footprint"

Mark → BELIEVES → education_access
  category: social
  intensity: strong
  confidence: 0.9
  context: "volunteers at literacy programs"

Emma → BELIEVES → work_life_balance
  category: personal
  intensity: strong
  confidence: 0.85
  context: "left corporate job for better balance"

Tom → BELIEVES → privacy_rights
  category: political
  intensity: moderate
  confidence: 0.8
  context: "mentioned concerns about data collection"

Lisa → BELIEVES → family_first
  category: value
  intensity: very_strong
  confidence: 1.0
  context: "always prioritizes family time"
```

**AI Extraction Patterns:**
- "[Person] thinks [Opinion]"
- "[Person] believes [Belief]"
- "[Person] is passionate about [Cause]"
- "[Person] values [Value]"
- "[Person] cares deeply about [Topic]"
- "[Person] mentioned that [Opinion]"

**Use Cases:**
- Conversation topics: "Emma cares about work-life balance"
- Gift ideas: "Get Sarah something eco-friendly"
- Event planning: "Avoid controversial topics with Tom"
- Understanding values: "Remember Mark volunteers for education"
- Building connections: "Introduce people with shared values"

---

### Category 11: Fears & Anxieties (Person ↔ Fear)

#### FEARS
**Description:** Phobias, fears, anxieties, triggers that cause distress or avoidance

**Sub-types by category:**
- `category`: phobia, anxiety, trigger, trauma_related, social_fear
- `fear`: The specific thing feared
- `intensity`: weak, moderate, strong, very_strong
- `confidence`: 0.0 to 1.0 (AI confidence)
- `triggers`: What activates this fear (optional)
- `coping_mechanism`: How they manage it (optional)
- `since`: When this started (optional)

**Examples:**
```
John → FEARS → heights
  category: phobia
  intensity: very_strong
  confidence: 1.0
  triggers: ['tall_buildings', 'balconies', 'airplanes']
  coping_mechanism: 'breathing_exercises'
  impact: 'avoids_hiking'

Sarah → FEARS → public_speaking
  category: social_fear
  intensity: strong
  confidence: 0.95
  context: 'breaks out in sweat, heart races'

Emma → FEARS → abandonment
  category: anxiety
  intensity: strong
  confidence: 0.85
  since: 2019-06
  context: 'after divorce'

Tom → FEARS → spiders
  category: phobia
  intensity: moderate
  confidence: 1.0

Lisa → FEARS → car_accidents
  category: trauma_related
  intensity: very_strong
  confidence: 1.0
  triggers: ['highway_driving', 'intersections']
  context: 'PTSD from 2020 accident'
```

**AI Extraction Patterns:**
- "[Person] is afraid of [Thing]"
- "[Person] has a phobia of [Thing]"
- "[Person] gets anxious about [Situation]"
- "[Person] is terrified of [Thing]"
- "[Person] panics when [Trigger]"
- "[Person] avoids [Thing] because it scares them"

**Use Cases:**
- Event planning: "Don't choose a high-altitude venue for John"
- Activity suggestions: "Avoid horror movies with Tom"
- Emotional support: "Be sensitive to Lisa's driving anxiety"
- Gift ideas: "Don't get Sarah surprise speaking engagements"
- Conversation topics: "Don't joke about car accidents around Lisa"

---

### Category 12: Goals & Aspirations (Person ↔ Goal)

#### WANTS_TO_ACHIEVE
**Description:** Active goals, aspirations, things person is working towards or dreaming of

**Sub-types by category:**
- `category`: career, fitness, skill, travel, personal_growth, relationship, financial
- `goal`: The specific aspiration
- `status`: aspiration, planning, in_progress, achieved, abandoned
- `priority`: low, medium, high, critical
- `timeline`: When they hope to achieve it
- `progress`: How far along they are (optional)
- `obstacles`: What's blocking them (optional)

**Examples:**
```
Sarah → WANTS_TO_ACHIEVE → run_marathon
  category: fitness
  status: in_progress
  priority: high
  timeline: '2025-10'
  progress: 'training 3x per week'
  obstacles: 'knee pain'

Mark → WANTS_TO_ACHIEVE → learn_piano
  category: skill
  status: aspiration
  priority: medium
  timeline: 'someday'

Emma → WANTS_TO_ACHIEVE → start_own_business
  category: career
  status: planning
  priority: critical
  timeline: '2026'
  progress: 'researching business models'

Tom → WANTS_TO_ACHIEVE → visit_Japan
  category: travel
  status: aspiration
  priority: high
  timeline: '2025'

Lisa → WANTS_TO_ACHIEVE → become_school_principal
  category: career
  status: in_progress
  priority: high
  timeline: '5_years'
  progress: 'getting masters degree'
```

**AI Extraction Patterns:**
- "[Person] wants to [Goal]"
- "[Person] dreams of [Goal]"
- "[Person] is working towards [Goal]"
- "[Person]'s goal is to [Goal]"
- "[Person] hopes to [Goal]"
- "[Person] is training for [Goal]"

**Use Cases:**
- Support their journey: "How's the marathon training going?"
- Gift ideas: "Running gear for Sarah"
- Avoid sensitive topics: "Don't mention failed attempts"
- Collaboration: "Let's train together!"
- Encouragement: "I believe in your business idea!"

---

### Category 13: Struggles & Challenges (Person ↔ Challenge)

#### STRUGGLES_WITH
**Description:** Ongoing challenges, difficulties, bad habits person is trying to overcome

**Sub-types by category:**
- `category`: habit, health, mental_health, skill, relationship, work, personal
- `struggle`: The specific challenge
- `intensity`: weak, moderate, strong, very_strong
- `since`: When this started
- `trying_to_change`: boolean (actively working on it)
- `support_needed`: What help they need (optional)
- `sensitive`: boolean (is this a touchy subject)

**Examples:**
```
John → STRUGGLES_WITH → procrastination
  category: habit
  intensity: strong
  since: 'always'
  trying_to_change: true
  support_needed: 'accountability'

Sarah → STRUGGLES_WITH → work_life_balance
  category: work
  intensity: very_strong
  since: 2023-09
  trying_to_change: true
  context: 'new job is demanding'

Emma → STRUGGLES_WITH → anxiety
  category: mental_health
  intensity: strong
  since: 2019-06
  trying_to_change: true
  support_needed: 'therapy, medication'
  sensitive: true

Tom → STRUGGLES_WITH → quitting_smoking
  category: habit
  intensity: very_strong
  since: 2024-01
  trying_to_change: true
  attempts: 3

Lisa → STRUGGLES_WITH → time_management
  category: personal
  intensity: moderate
  since: 'recent'
  trying_to_change: false
```

**AI Extraction Patterns:**
- "[Person] struggles with [Challenge]"
- "[Person] has a hard time with [Challenge]"
- "[Person] is trying to quit [Habit]"
- "[Person] can't seem to [Thing]"
- "[Person] finds [Thing] difficult"
- "[Person] is working on [Challenge]"

**Use Cases:**
- Emotional support: "Be understanding about Emma's anxiety"
- Avoid judgment: "Don't lecture John about procrastination"
- Offer help: "Want an accountability partner?"
- Gift ideas: "Productivity tools for Lisa"
- Sensitive conversations: "Don't bring up smoking around Tom"

---

### Category 14: Caregiving Relationships (Person ↔ Person)

#### CARES_FOR
**Description:** Person provides care, support, or guardianship for someone else

**Sub-types:**
- `care_type`: elderly_parent, child, disabled_sibling, spouse, pet, friend
- `level`: full_time, part_time, occasional, financial_only, emotional_only
- `since`: When caregiving started
- `responsibilities`: What they do (medical, financial, emotional, daily_care)
- `impact_on_availability`: high, medium, low
- `support_system`: Who helps them (optional)

**Examples:**
```
Sarah → CARES_FOR → aging_mother
  care_type: elderly_parent
  level: part_time
  since: 2022-03
  responsibilities: ['medical_appointments', 'grocery_shopping', 'finances']
  impact_on_availability: high
  context: 'mother has dementia'

Mark → CARES_FOR → disabled_son
  care_type: child
  level: full_time
  since: 2015-01
  responsibilities: ['daily_care', 'therapy', 'medical', 'emotional']
  impact_on_availability: very_high
  support_system: ['wife', 'home_health_aide']

Emma → CARES_FOR → young_children
  care_type: child
  level: full_time
  since: 2020-06
  ages: [5, 3]
  impact_on_availability: very_high

Tom → CARES_FOR → best_friend_with_cancer
  care_type: friend
  level: occasional
  responsibilities: ['emotional_support', 'rides_to_treatment']
  impact_on_availability: medium
```

**AI Extraction Patterns:**
- "[Person] takes care of [Person/Pet]"
- "[Person] is caring for their [Relation]"
- "[Person] is a caregiver for [Person]"
- "[Person] looks after [Person]"
- "[Person] is responsible for [Person]"

**Use Cases:**
- Event planning: "Sarah needs flexibility for mom's appointments"
- Understanding availability: "Mark can't do late evening events"
- Emotional support: "Ask how Mark's son is doing"
- Gift ideas: "Respite care gift certificate"
- Avoid assumptions: "Don't expect Emma to be spontaneous"

---

### Category 15: Dependencies (Person ↔ Person/Thing)

#### DEPENDS_ON
**Description:** Person relies on someone/something for support, care, or functioning

**Sub-types:**
- `dependency_type`: care, financial, emotional, housing, transportation, medical
- `dependent_on`: Who/what they depend on
- `level`: critical, high, moderate, low
- `since`: When dependency started
- `working_to_reduce`: boolean (trying to become independent)

**Examples:**
```
John → DEPENDS_ON → parents_for_childcare
  dependency_type: care
  level: critical
  since: 2020-06
  context: 'both parents work, no other options'
  impact: 'limits work schedule'

Sarah → DEPENDS_ON → partner_for_income
  dependency_type: financial
  level: high
  since: 2024-01
  context: 'going back to school'
  working_to_reduce: true
  timeline: '2025-12'

Emma → DEPENDS_ON → medication
  dependency_type: medical
  level: critical
  since: 2019-06
  medication: 'anxiety medication'

Tom → DEPENDS_ON → best_friend_for_emotional_support
  dependency_type: emotional
  level: high
  since: 2020-03
  context: 'after divorce'

Lisa → DEPENDS_ON → public_transportation
  dependency_type: transportation
  level: high
  context: 'no car'
```

**AI Extraction Patterns:**
- "[Person] depends on [Person/Thing]"
- "[Person] relies on [Person/Thing]"
- "[Person] needs [Person/Thing] for [Purpose]"
- "[Person] couldn't function without [Person/Thing]"

**Use Cases:**
- Understanding constraints: "John needs events near parents' house"
- Avoid assumptions: "Don't suggest Sarah quit her partner's insurance"
- Emotional sensitivity: "Tom needs his best friend invited"
- Practical planning: "Lisa needs transit-accessible venues"

---

### Category 16: Habits & Routines (Person ↔ Activity)

#### REGULARLY_DOES
**Description:** Habitual activities, routines, regular patterns of behavior

**Sub-types:**
- `activity`: The thing they do regularly
- `frequency`: daily, weekly, monthly, yearly, varies
- `time_of_day`: morning, afternoon, evening, night (optional)
- `since`: When they started this habit
- `importance`: critical, high, medium, low (how important is this to them)
- `disruption_impact`: How upset they get if disrupted

**Examples:**
```
Sarah → REGULARLY_DOES → morning_yoga
  frequency: daily
  time_of_day: morning
  since: 2022-01
  importance: high
  disruption_impact: moderate
  context: 'grumpy if she misses it'

Mark → REGULARLY_DOES → meal_prep
  frequency: weekly
  time_of_day: Sunday_afternoon
  since: 2020-03
  importance: high

Emma → REGULARLY_DOES → therapy
  frequency: weekly
  time_of_day: Tuesday_evening
  since: 2019-06
  importance: critical
  disruption_impact: high

Tom → REGULARLY_DOES → game_night
  frequency: weekly
  time_of_day: Friday_evening
  since: 2018-01
  with: ['college_friends']
  importance: high

Lisa → REGULARLY_DOES → church
  frequency: weekly
  time_of_day: Sunday_morning
  since: 'childhood'
  importance: critical
```

**AI Extraction Patterns:**
- "[Person] does [Activity] every [Frequency]"
- "[Person] always [Activity] on [Day/Time]"
- "[Person] has a routine of [Activity]"
- "[Person] never misses [Activity]"
- "[Person]'s [Frequency] [Activity]"

**Use Cases:**
- Event planning: "Don't schedule during Emma's therapy"
- Understanding availability: "Tom is busy Friday evenings"
- Respecting routines: "Sarah needs morning events to start later"
- Gift ideas: "Yoga mat for Sarah"
- Conversation: "How was church, Lisa?"

**IMPORTANT for Temporal Tracking:**
For past habits (like "used to climb every week"), use the same REGULARLY_DOES relation with temporal metadata:

```typescript
// Current habit
REGULARLY_DOES(John, rock_climbing, {
  frequency: 'weekly',
  status: 'current',
  validFrom: '2024-01',
  validTo: null
})

// Past habit (what you asked about!)
REGULARLY_DOES(John, rock_climbing, {
  frequency: 'weekly',
  status: 'past',
  validFrom: '2015-01',
  validTo: '2020-06',
  context: 'stopped due to knee injury'
})
```

---

### Category 17: Comparative Preferences (Person ↔ Preference)

#### PREFERS_OVER
**Description:** Relative preferences showing what they choose when given options

**Sub-types:**
- `prefers`: What they prefer
- `over`: What they prefer it over
- `category`: food, activity, communication, environment, etc.
- `context`: When this applies (optional)
- `strength`: weak, moderate, strong (how strong is the preference)

**Examples:**
```
Sarah → PREFERS_OVER → tea_over_coffee
  prefers: tea
  over: coffee
  category: beverage
  strength: strong
  context: 'always'

Mark → PREFERS_OVER → mountains_over_beach
  prefers: mountains
  over: beach
  category: travel
  strength: moderate

Emma → PREFERS_OVER → texting_over_calling
  prefers: texting
  over: calling
  category: communication
  strength: strong
  context: 'has phone anxiety'

Tom → PREFERS_OVER → small_groups_over_parties
  prefers: small_groups
  over: large_parties
  category: social
  strength: very_strong
  context: 'introvert'

Lisa → PREFERS_OVER → cats_over_dogs
  prefers: cats
  over: dogs
  category: pets
  strength: moderate
```

**AI Extraction Patterns:**
- "[Person] prefers [X] over [Y]"
- "[Person] likes [X] more than [Y]"
- "[Person] would rather [X] than [Y]"
- "[Person] chooses [X] instead of [Y]"
- "Given choice, [Person] picks [X]"

**Use Cases:**
- Better recommendations: "Suggest tea, not coffee for Sarah"
- Event planning: "Small dinner party for Tom, not big bash"
- Communication: "Text Emma, don't call"
- Gift ideas: "Cat-themed gifts for Lisa"
- Understanding: "Mountains for Mark's vacation, not beach"

---

### Category 18: Past States & Changes (Person ↔ Identity/Activity)

#### USED_TO_BE
**Description:** Past identity states, former activities, things that were true but changed

**Sub-types:**
- `category`: identity, profession, lifestyle, belief, location, activity
- `past_state`: What they used to be/do
- `changed_to`: What they are now (optional)
- `validFrom`: When it started
- `validTo`: When it ended
- `reason_for_change`: Why it changed
- `sensitive`: boolean (is this a touchy subject)

**Examples:**
```
Sarah → USED_TO_BE → meat_eater
  category: lifestyle
  validFrom: '1990-01'
  validTo: '2024-01'
  changed_to: 'vegetarian'
  reason_for_change: 'ethical_reasons'

Mark → USED_TO_BE → corporate_lawyer
  category: profession
  validFrom: '2010-06'
  validTo: '2023-06'
  changed_to: 'elementary_teacher'
  reason_for_change: 'burnout, wanted_meaningful_work'
  sensitive: false

Emma → USED_TO_BE → married
  category: identity
  validFrom: '2015-03'
  validTo: '2019-11'
  changed_to: 'divorced'
  reason_for_change: 'divorce'
  sensitive: true

Tom → USED_TO_BE → smoker
  category: lifestyle
  validFrom: '2005-01'
  validTo: '2023-08'
  changed_to: 'non_smoker'
  reason_for_change: 'health_scare'

Lisa → USED_TO_BE → competitive_runner
  category: activity
  validFrom: '2010-01'
  validTo: '2021-03'
  changed_to: 'casual_walker'
  reason_for_change: 'injury'
  sensitive: true
```

**AI Extraction Patterns:**
- "[Person] used to be [Thing]"
- "[Person] was [Thing] but now [Current_State]"
- "[Person] used to [Activity]"
- "[Person] quit [Thing]"
- "[Person] stopped [Activity]"
- "[Person] gave up [Thing]"

**Use Cases:**
- Avoid assumptions: "Don't offer Sarah meat"
- Conversation sensitivity: "Don't bring up Emma's marriage"
- Understanding change: "Mark's much happier now"
- Support journey: "Congratulate Tom on quitting!"
- Respect past: "Lisa was a serious athlete, knee injury ended it"

**CRITICAL ANSWER TO YOUR QUESTION:**

For someone who "used to climb every week for a very long time but doesn't anymore":

```typescript
USED_TO_BE(John, regular_climber, {
  category: 'activity',
  validFrom: '2010-01',
  validTo: '2020-06',
  context: '10 years of weekly climbing',
  reason_for_change: 'knee_injury',
  sensitive: true,  // might be sad about it
  intensity: 'very_strong',  // was very committed
})

// Or use REGULARLY_DOES with past status:
REGULARLY_DOES(John, rock_climbing, {
  frequency: 'weekly',
  status: 'past',
  validFrom: '2010-01',
  validTo: '2020-06',
  context: 'stopped due to knee injury',
  importance: 'critical'  // shows it was important to them
})
```

Both work! Use USED_TO_BE for identity-level changes, REGULARLY_DOES with `status: 'past'` for routine changes.

---

### Category 19: Sensitivities (Person ↔ Sensitivity)

#### SENSITIVE_TO
**Description:** Physical, emotional, or environmental sensitivities that cause discomfort

**Sub-types:**
- `category`: sensory, emotional, environmental, topic, physical
- `sensitivity`: What they're sensitive to
- `severity`: mild, moderate, severe, extreme
- `reaction`: How they react
- `accommodation_needed`: What helps
- `since`: When this started (optional)

**Examples:**
```
Sarah → SENSITIVE_TO → loud_noises
  category: sensory
  severity: severe
  reaction: 'headaches, anxiety'
  accommodation_needed: 'quiet venues'
  context: 'sensory processing'

Mark → SENSITIVE_TO → bright_lights
  category: sensory
  severity: moderate
  reaction: 'migraines'
  accommodation_needed: 'dim_lighting'

Emma → SENSITIVE_TO → discussion_of_divorce
  category: emotional
  severity: very_strong
  reaction: 'tears, shuts_down'
  since: '2019-11'
  context: 'recent divorce trauma'

Tom → SENSITIVE_TO → strong_smells
  category: environmental
  severity: severe
  reaction: 'nausea'
  triggers: ['perfume', 'cologne', 'smoke']

Lisa → SENSITIVE_TO → criticism
  category: emotional
  severity: moderate
  reaction: 'defensive, withdrawn'
  context: 'childhood trauma'
```

**AI Extraction Patterns:**
- "[Person] is sensitive to [Thing]"
- "[Person] can't handle [Thing]"
- "[Person] gets upset by [Thing]"
- "[Person] is bothered by [Thing]"
- "[Person] reacts to [Thing]"

**Use Cases:**
- Venue selection: "Quiet restaurant for Sarah"
- Avoid triggers: "Don't mention divorce around Emma"
- Accessibility: "Choose well-ventilated space for Tom"
- Communication: "Give constructive feedback gently to Lisa"
- Gift considerations: "Unscented products for Tom"

---

### Category 20: Social Boundaries (Person ↔ Boundary)

#### UNCOMFORTABLE_WITH
**Description:** Social boundaries, topics to avoid, situations that make them uncomfortable

**Sub-types:**
- `category`: topic, social_situation, physical, communication, surprise
- `discomfort`: What makes them uncomfortable
- `intensity`: weak, moderate, strong, very_strong
- `why`: Reason for discomfort (optional)
- `accommodation`: What would help
- `since`: When this started (optional)

**Examples:**
```
Sarah → UNCOMFORTABLE_WITH → surprise_visits
  category: surprise
  intensity: very_strong
  why: 'needs_preparation, anxiety'
  accommodation: 'advance_notice'

Mark → UNCOMFORTABLE_WITH → discussing_politics
  category: topic
  intensity: strong
  why: 'causes_conflict'
  accommodation: 'avoid_topic'

Emma → UNCOMFORTABLE_WITH → physical_touch
  category: physical
  intensity: moderate
  why: 'trauma_history'
  accommodation: 'ask_before_hugging'
  since: '2019-11'

Tom → UNCOMFORTABLE_WITH → small_talk
  category: social_situation
  intensity: moderate
  why: 'finds_it_awkward'
  accommodation: 'deeper_conversations'

Lisa → UNCOMFORTABLE_WITH → confrontation
  category: social_situation
  intensity: very_strong
  why: 'childhood_trauma'
  accommodation: 'gentle_communication'
```

**AI Extraction Patterns:**
- "[Person] is uncomfortable with [Thing]"
- "[Person] doesn't like [Situation]"
- "[Person] needs warning before [Thing]"
- "[Person] hates [Thing]"
- "[Person] gets anxious about [Situation]"
- "[Person] avoids [Thing]"

**Use Cases:**
- Social etiquette: "Text Sarah before dropping by"
- Conversation topics: "Avoid politics with Mark"
- Physical boundaries: "Don't hug Emma without asking"
- Communication style: "Be gentle with Lisa"
- Event planning: "Structured activities for Tom, not mingling"

---

## 🔄 Derived Relations (Computed, Not Stored)

These are calculated from other relations:

### INDIRECTLY_KNOWS
**Description:** Friend-of-friend connections

**Computed from:**
```sql
SELECT p2.*
FROM connections c1
JOIN connections c2 ON c1.person_2_id = c2.person_1_id
WHERE c1.person_1_id = 'user-id'
  AND c2.person_2_id != 'user-id'
```

**Use Cases:**
- Networking: "Who can introduce me to X?"
- Events: "Who should I invite who knows each other?"

### SHARED_INTERESTS
**Description:** People with similar preferences

**Computed from:**
```sql
SELECT p2.*, COUNT(*) as shared_count
FROM people p1
JOIN preferences pref1 ON p1.id = pref1.person_id
JOIN preferences pref2 ON pref1.item = pref2.item
JOIN people p2 ON pref2.person_id = p2.id
WHERE p1.id = 'person-id'
  AND p2.id != 'person-id'
GROUP BY p2.id
ORDER BY shared_count DESC
```

**Use Cases:**
- Introductions: "You two would get along!"
- Group activities: "Who likes hiking?"

### RELATIONSHIP_STRENGTH
**Description:** How close two people are

**Computed from:**
- Number of shared stories
- Frequency of mention
- Time known
- Shared preferences
- Common connections

**Formula:**
```typescript
strength = (
  shared_stories * 0.4 +
  time_known_years / 20 * 0.2 +
  shared_preferences / 10 * 0.2 +
  mention_frequency * 0.2
)
```

---

## 🎨 Implementation in Different Architectures

### Option A: RDF/Turtle

```turtle
@prefix : <http://friends.app/ontology#> .

# Define relations
:KNOWS a rdf:Property ;
  rdfs:domain :Person ;
  rdfs:range :Person .

:LIKES a rdf:Property ;
  rdfs:domain :Person ;
  rdfs:range :Thing .

# Use with qualifiers
:person/ola :KNOWS :person/user ;
  :since "2015-11-07"^^xsd:date ;
  :strength "0.85"^^xsd:decimal ;
  :relationshipType "friend" .

:person/ola :LIKES :preference/ice-cream ;
  :category "food" ;
  :confidence "0.95"^^xsd:decimal ;
  :intensity "strong" .

:person/sarah :HAS_DIETARY_RESTRICTION :restriction/vegetarian ;
  :type "ethical" ;
  :since "2024-01"^^xsd:date .
```

### Option B: SQLite + Drizzle

```typescript
// Generic relations table approach
export const relations = sqliteTable('relations', {
  id: text('id').primaryKey(),
  subjectId: text('subject_id').notNull(), // Person
  relationType: text('relation_type', {
    enum: ['KNOWS', 'LIKES', 'DISLIKES', 'HAS_SKILL', 'OWNS',
           'ASSOCIATED_WITH', 'EXPERIENCED', 'HAS_DIETARY_RESTRICTION',
           'HAS_IMPORTANT_DATE'],
  }).notNull(),
  objectId: text('object_id').notNull(), // Person, Thing, Place, etc.
  metadata: text('metadata', { mode: 'json' }).$type<{
    category?: string;
    confidence?: number;
    since?: string;
    strength?: number;
    [key: string]: any;
  }>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
}, (table) => ({
  subjectIdx: index('relations_subject_idx').on(table.subjectId),
  objectIdx: index('relations_object_idx').on(table.objectId),
  typeIdx: index('relations_type_idx').on(table.relationType),
}));

// Or specific tables for each relation type (more type-safe)
export const likes = sqliteTable('likes', {
  id: text('id').primaryKey(),
  personId: text('person_id').notNull().references(() => people.id),
  category: text('category', {
    enum: ['food', 'activity', 'travel', 'entertainment', 'other'],
  }).notNull(),
  item: text('item').notNull(),
  confidence: real('confidence').notNull(),
  intensity: text('intensity', {
    enum: ['mild', 'moderate', 'strong', 'passionate'],
  }),
  verified: integer('verified', { mode: 'boolean' }).default(false),
  sourceStoryId: text('source_story_id').references(() => stories.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const knows = sqliteTable('knows', {
  id: text('id').primaryKey(),
  person1Id: text('person_1_id').notNull().references(() => people.id),
  person2Id: text('person_2_id').notNull().references(() => people.id),
  relationshipType: text('relationship_type', {
    enum: ['friend', 'family', 'colleague', 'acquaintance', 'partner'],
  }),
  since: integer('since', { mode: 'timestamp' }),
  strength: real('strength').default(0.5),
  context: text('context'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

---

## 🤖 AI Extraction Strategy

### Prompt Template for Relation Extraction

```typescript
const extractionPrompt = `
You are an AI that extracts relationship data from personal stories.

Extract the following relation types:
1. KNOWS: Social relationships between people
2. LIKES: Things people enjoy or prefer
3. DISLIKES: Things people avoid or dislike
4. HAS_SKILL: Competencies or expertise
5. OWNS: Possessions
6. ASSOCIATED_WITH: Location connections
7. EXPERIENCED: Events and activities
8. HAS_IMPORTANT_DATE: Important dates to remember
9. IS: Identity attributes (profession, religion, nationality, lifestyle, etc.)
10. BELIEVES: Opinions, beliefs, values, and perspectives

Story: "${storyText}"

Return JSON with this structure:
{
  "people": [
    { "name": "Ola", "mentioned": true }
  ],
  "relations": [
    {
      "type": "KNOWS",
      "subject": "User",
      "object": "Ola",
      "metadata": {
        "since": "2015-11-07",
        "relationshipType": "friend",
        "confidence": 1.0
      }
    },
    {
      "type": "LIKES",
      "subject": "Ola",
      "object": "ice cream",
      "metadata": {
        "category": "food",
        "confidence": 0.95,
        "intensity": "strong",
        "evidence": "we always eat ice cream"
      }
    },
    {
      "type": "ASSOCIATED_WITH",
      "subject": "Ola",
      "object": "Italy",
      "metadata": {
        "type": "visited",
        "frequency": "multiple",
        "count": 10,
        "shared_with": ["User"],
        "confidence": 1.0
      }
    }
  ]
}
`;
```

### Confidence Scoring

```typescript
// High confidence (0.9-1.0): Explicit statements
"Ola loves ice cream" → LIKES(ice cream, confidence: 1.0)

// Medium confidence (0.7-0.89): Implied
"Ola always orders vanilla" → LIKES(vanilla, confidence: 0.8)

// Low confidence (0.5-0.69): Inferred
"Ola smiled at the dessert menu" → LIKES(desserts, confidence: 0.6)
```

---

## 🎯 Recommended Minimal Set for MVP

### Core 5 Relations (Start Here)

1. **KNOWS** - Social graph
2. **LIKES** - Positive preferences
3. **DISLIKES** - Negative preferences (dietary restrictions)
4. **ASSOCIATED_WITH** - Places
5. **EXPERIENCED** - Shared activities

**Why these 5?**
- ✅ Cover 90% of use cases
- ✅ AI can extract reliably
- ✅ Enable meal planning & gift recommendations
- ✅ Simple to explain to users

### Add Later (Phase 2)

6. **HAS_SKILL** - For task delegation
7. **OWNS** - For resource sharing
8. **HAS_IMPORTANT_DATE** - For reminders

---

## 🔍 Edge Cases & Considerations

### 1. Temporal Relations
**Problem:** Preferences change over time

**Solution:** Add `valid_from` and `valid_to` timestamps
```typescript
Sarah → LIKES → meat
  valid_from: 2010-01-01
  valid_to: 2024-01-01

Sarah → DISLIKES → meat
  valid_from: 2024-01-01
  valid_to: null (current)
  reason: "became vegetarian"
```

### 2. Intensity/Degree
**Problem:** "likes" vs "loves" vs "obsessed with"

**Solution:** Use intensity qualifier
```typescript
intensity: 'mild' | 'moderate' | 'strong' | 'passionate'
```

### 3. Negation
**Problem:** "Sarah used to like meat but is now vegetarian"

**Solution:** Store both with temporal info
```typescript
LIKES(meat, valid_to: 2024-01-01)
DISLIKES(meat, valid_from: 2024-01-01, reason: 'ethical')
```

### 4. Conditional Preferences
**Problem:** "John likes pizza but only with thin crust"

**Solution:** Hierarchical items or qualifiers
```typescript
LIKES(pizza, qualifier: 'thin_crust_only')
// Or separate:
LIKES(thin_crust_pizza)
DISLIKES(thick_crust_pizza)
```

### 5. Shared Relations
**Problem:** "Ola and I both love Italy"

**Solution:** Link to shared experiences
```typescript
Ola → LIKES → Italy
User → LIKES → Italy
Both → EXPERIENCED → italy_trips(count: 10)
```

---

## 📊 Comparison Table

| Relation | Subject | Object | Use Case | AI Extract | Priority |
|----------|---------|--------|----------|------------|----------|
| **KNOWS** | Person | Person | Social graph, intros | ⭐⭐⭐⭐⭐ | 🔴 MVP |
| **LIKES** | Person | Thing | Gifts, meals, activities | ⭐⭐⭐⭐⭐ | 🔴 MVP |
| **DISLIKES** | Person | Thing | Avoid mistakes, allergies | ⭐⭐⭐⭐⭐ | 🔴 MVP |
| **ASSOCIATED_WITH** | Person | Place | Travel tips, meetups | ⭐⭐⭐⭐ | 🔴 MVP |
| **EXPERIENCED** | Person | Event | Shared memories, context | ⭐⭐⭐⭐ | 🔴 MVP |
| **HAS_SKILL** | Person | Skill | Ask for help, delegation | ⭐⭐⭐⭐ | 🟡 Phase 2 |
| **OWNS** | Person | Thing | Resource sharing | ⭐⭐⭐ | 🟡 Phase 2 |
| **HAS_IMPORTANT_DATE** | Person | Date | Reminders, celebrations | ⭐⭐⭐ | 🟡 Phase 2 |
| **IS** | Person | Identity | Professional context, background | ⭐⭐⭐⭐⭐ | 🟢 Phase 1.5 |
| **BELIEVES** | Person | Belief | Conversation topics, gift ideas, values | ⭐⭐⭐⭐ | 🟢 Phase 1.5 |
| **FEARS** | Person | Fear | Avoid triggers, emotional support | ⭐⭐⭐⭐⭐ | 🟢 Phase 1.5 |
| **WANTS_TO_ACHIEVE** | Person | Goal | Support journey, encouragement | ⭐⭐⭐⭐ | 🟢 Phase 1.5 |
| **STRUGGLES_WITH** | Person | Challenge | Emotional support, sensitivity | ⭐⭐⭐⭐ | 🟢 Phase 1.5 |
| **CARES_FOR** | Person | Person | Availability constraints, respect responsibilities | ⭐⭐⭐⭐⭐ | 🟢 Phase 1.5 |
| **DEPENDS_ON** | Person | Person/Thing | Understanding constraints, practical planning | ⭐⭐⭐⭐ | 🟢 Phase 1.5 |
| **REGULARLY_DOES** | Person | Activity | Event planning, respect routines | ⭐⭐⭐⭐⭐ | 🟢 Phase 1.5 |
| **PREFERS_OVER** | Person | Preference | Better recommendations, nuanced understanding | ⭐⭐⭐⭐ | 🟢 Phase 1.5 |
| **USED_TO_BE** | Person | Past State | Avoid assumptions, understand change | ⭐⭐⭐⭐⭐ | 🟢 Phase 1.5 |
| **SENSITIVE_TO** | Person | Sensitivity | Venue selection, avoid triggers, accessibility | ⭐⭐⭐⭐⭐ | 🟢 Phase 1.5 |
| **UNCOMFORTABLE_WITH** | Person | Boundary | Social etiquette, respect boundaries | ⭐⭐⭐⭐⭐ | 🟢 Phase 1.5 |

---

## 🎯 Final Recommendation

### Current Implementation: 20 Core Relations

```
Phase 1 (MVP - Essential):
1. KNOWS (person → person) - Social graph
2. LIKES (person → thing) - Positive preferences
3. DISLIKES (person → thing) - Negative preferences, allergies
4. ASSOCIATED_WITH (person → place) - Location connections
5. EXPERIENCED (person → event) - Shared activities

Phase 1.5 (Enhanced - IMPLEMENTED):
6. IS (person → identity) - Identity attributes, professions
7. BELIEVES (person → belief) - Opinions, values, perspectives
8. FEARS (person → fear) - Phobias, anxieties, triggers
9. WANTS_TO_ACHIEVE (person → goal) - Goals, aspirations
10. STRUGGLES_WITH (person → challenge) - Ongoing difficulties
11. CARES_FOR (person → person) - Caregiving relationships
12. DEPENDS_ON (person → thing/person) - Dependencies
13. REGULARLY_DOES (person → activity) - Habits, routines
14. PREFERS_OVER (person → preference) - Comparative choices
15. USED_TO_BE (person → past_state) - Historical changes
16. SENSITIVE_TO (person → sensitivity) - Sensitivities
17. UNCOMFORTABLE_WITH (person → boundary) - Social boundaries

Phase 2 (Advanced - Future):
18. HAS_SKILL (person → skill) - Competencies, expertise
19. OWNS (person → thing) - Possessions
20. HAS_IMPORTANT_DATE (person → date) - Reminders, celebrations
```

### Implementation Approach

**Use Hierarchical Ontology:**
- Fixed core relations (enum in database)
- Flexible metadata (JSON for qualifiers)
- Type-safe in TypeScript
- Extensible for future relations

**Database Schema:**
```typescript
// Option A: Generic relations table (more flexible)
relations(id, subject, type, object, metadata)

// Option B: Specific tables (more type-safe)
likes(id, person_id, category, item, confidence, ...)
knows(id, person1_id, person2_id, relationship_type, ...)
```

**Recommendation:** Start with **Option A** for MVP flexibility, refactor to **Option B** if performance becomes an issue.

---

## 🚀 Next Steps

1. ✅ Agree on MVP relations (5 core types)
2. ✅ Decide: Generic table vs specific tables
3. ✅ Design AI extraction prompts
4. ✅ Implement schema in Drizzle
5. ✅ Build UI for manual relation editing
6. ✅ Test with real stories

---

**Ready to decide? Let's debate!** 🎤
