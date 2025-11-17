# Relation Metadata Schemas

**Purpose:** Define expected metadata structure for each of the 20 relation types to ensure consistency in AI extraction and manual entry.

**Updated:** November 7, 2025

---

## 🎯 Why Metadata Schemas Matter

**Problem:** Without schemas, metadata becomes inconsistent:
```typescript
// Inconsistent - hard to query
FEARS(John, heights, { trigger: ['buildings'] })
FEARS(Sarah, spiders, { triggers: 'webs' })
FEARS(Tom, dogs, { what_triggers_it: ['barking', 'big dogs'] })
```

**Solution:** Strict schemas ensure consistency:
```typescript
// Consistent - easy to query
FEARS(John, heights, { triggers: ['buildings'], intensity: 'very_strong' })
FEARS(Sarah, spiders, { triggers: ['webs'], intensity: 'moderate' })
FEARS(Tom, dogs, { triggers: ['barking', 'big_dogs'], intensity: 'strong' })
```

---

## 📋 Metadata Schema Format

Each relation type has:
1. **Required fields** - Must be present
2. **Optional fields** - Can be omitted
3. **Enum values** - Limited choices
4. **Field types** - string, number, boolean, array

---

## 🔷 Phase 1 (MVP) - Core Relations

### 1. KNOWS (Person ↔ Person)

**Note:** Person-to-person KNOWS should use the `connections` table, NOT `relations` table.

**If using relations table for KNOWS:**
```typescript
interface KnowsMetadata {
  // Context
  met_at?: string;              // "conference", "school", "work"
  since?: string;                // ISO date or "2015-01"
  strength?: number;             // 0.0 to 1.0

  // Relationship quality
  bond_quality?: 'acquaintance' | 'friend' | 'close_friend' | 'best_friend';
  contact_frequency?: 'daily' | 'weekly' | 'monthly' | 'rarely';

  // Special accommodations
  special_notes?: string;        // "Don't discuss food ethics"
  boundaries?: string[];         // ["avoid_politics", "no_surprise_visits"]
}
```

**Recommended:** Use `connections` table instead for better person-person relationship tracking.

---

### 2. LIKES (Person → Thing)

```typescript
interface LikesMetadata {
  // REQUIRED
  category: 'food' | 'activity' | 'travel' | 'entertainment' | 'music' | 'sport' | 'art' | 'other';

  // OPTIONAL
  intensity?: 'weak' | 'medium' | 'strong' | 'very_strong';
  confidence?: number;           // 0.0 to 1.0 (AI confidence)
  frequency?: 'rarely' | 'sometimes' | 'often' | 'always';

  // Context
  context?: string;              // "Loves Italian food" or "Always orders this"
  since?: string;                // When they started liking it

  // Evidence
  evidence?: string;             // "Mentioned 3 times in stories"
  source_story?: string;         // Story ID or quote

  // Specifics
  subcategory?: string;          // For food: "italian", "desserts", "spicy"
  specific_items?: string[];     // ["pepperoni_pizza", "margherita"]
}
```

**Examples:**
```typescript
LIKES(Sarah, italian_food, {
  category: 'food',
  intensity: 'very_strong',
  confidence: 0.95,
  frequency: 'often',
  subcategory: 'italian',
  specific_items: ['pasta', 'tiramisu'],
  evidence: 'Orders Italian 2x per month'
})
```

---

### 3. DISLIKES (Person → Thing)

```typescript
interface DislikesMetadata {
  // REQUIRED
  category: 'food' | 'activity' | 'travel' | 'entertainment' | 'music' | 'sport' | 'art' | 'other';

  // OPTIONAL
  severity?: 'mild' | 'moderate' | 'strong' | 'extreme';
  reason?: 'allergy' | 'intolerance' | 'preference' | 'ethical' | 'religious' | 'trauma' | 'other';

  // Critical for safety
  allergy_severity?: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  medical_notes?: string;        // "EpiPen required", "Anaphylaxis risk"

  // Context
  since?: string;
  context?: string;
  avoidance_level?: 'avoid_if_possible' | 'never_consume' | 'medical_emergency';
}
```

**Examples:**
```typescript
DISLIKES(Emma, nuts, {
  category: 'food',
  severity: 'extreme',
  reason: 'allergy',
  allergy_severity: 'life_threatening',
  medical_notes: 'EpiPen required, anaphylaxis risk',
  avoidance_level: 'medical_emergency'
})

DISLIKES(Sarah, meat, {
  category: 'food',
  severity: 'strong',
  reason: 'ethical',
  since: '2024-01',
  context: 'Became vegetarian for animal rights',
  avoidance_level: 'never_consume'
})
```

---

### 4. ASSOCIATED_WITH (Person → Place)

```typescript
interface AssociatedWithMetadata {
  // REQUIRED
  association_type: 'lives' | 'lived' | 'works_at' | 'worked_at' | 'studied_at' |
                   'visited' | 'born_in' | 'dreams_of' | 'family_from';

  // OPTIONAL
  timeframe?: string;            // "2015-2024", "childhood", "currently"
  frequency?: 'once' | 'multiple' | 'regular' | 'ongoing';
  visit_count?: number;          // For 'visited' type

  // For current associations
  current?: boolean;
  since?: string;
  until?: string;

  // Context
  significance?: 'low' | 'medium' | 'high' | 'very_high';
  shared_with?: string[];        // Person names or IDs
  memories?: string;             // "We went 10 times together"
}
```

**Examples:**
```typescript
ASSOCIATED_WITH(Ola, Italy, {
  association_type: 'visited',
  frequency: 'multiple',
  visit_count: 10,
  timeframe: '2015-2024',
  significance: 'very_high',
  shared_with: ['User'],
  memories: 'Always talk about Italian trips'
})

ASSOCIATED_WITH(Sarah, San_Francisco, {
  association_type: 'lives',
  current: true,
  since: '2019-03',
  significance: 'very_high'
})
```

---

### 5. EXPERIENCED (Person → Event)

```typescript
interface ExperiencedMetadata {
  // REQUIRED
  event_type: 'activity' | 'milestone' | 'celebration' | 'achievement' | 'travel' | 'other';

  // OPTIONAL
  date?: string;                 // ISO date or range
  location?: string;
  with?: string[];               // Other people involved
  role?: 'participant' | 'organizer' | 'attendee' | 'observer';

  // Details
  duration?: string;             // "2 weeks", "one day"
  activities?: string[];         // ["hiking", "sightseeing", "dining"]
  significance?: 'low' | 'medium' | 'high' | 'life_changing';

  // Memory
  memorable_moments?: string;
  photos?: string[];             // File IDs
  would_repeat?: boolean;
}
```

---

## 🔷 Phase 1.5 - Enhanced Relations

### 6. IS (Person → Identity)

```typescript
interface IsMetadata {
  // REQUIRED
  category: 'profession' | 'religion' | 'nationality' | 'identity' |
           'lifestyle' | 'condition' | 'role';

  // OPTIONAL
  since?: string;                // When this became true
  verified?: boolean;            // User confirmed vs AI inferred
  confidence?: number;           // 0.0 to 1.0 (AI confidence)

  // Context
  context?: string;              // "Pediatrician" for doctor, "Type 2" for diabetic
  primary?: boolean;             // Is this their primary identity in this category?

  // For profession
  workplace?: string;
  position?: string;
  years_experience?: number;

  // For conditions
  severity?: 'mild' | 'moderate' | 'severe';
  treatment?: string;
  impact_on_daily_life?: 'minimal' | 'moderate' | 'significant' | 'severe';
}
```

**Examples:**
```typescript
IS(Sarah, doctor, {
  category: 'profession',
  since: '2018-06',
  verified: true,
  confidence: 1.0,
  context: 'pediatrician',
  workplace: 'Children\'s Hospital',
  primary: true
})

IS(John, diabetic, {
  category: 'condition',
  since: '2020-01',
  verified: true,
  context: 'Type 2',
  severity: 'moderate',
  treatment: 'medication + diet',
  impact_on_daily_life: 'moderate'
})
```

---

### 7. BELIEVES (Person → Belief)

```typescript
interface BelievesMetadata {
  // REQUIRED
  category: 'political' | 'social' | 'environmental' | 'philosophical' |
           'personal' | 'value' | 'religious';

  // OPTIONAL
  intensity?: 'weak' | 'moderate' | 'strong' | 'very_strong';
  confidence?: number;           // AI confidence in extraction

  // Context
  since?: string;                // When mentioned or adopted
  context?: string;              // Supporting evidence
  public?: boolean;              // Do they share this publicly?

  // Behavior
  acts_on?: boolean;             // Do they act on this belief?
  action_examples?: string[];    // ["volunteers", "donates", "advocates"]

  // Sensitivity
  open_to_discussion?: boolean;
  touchy_subject?: boolean;      // Avoid bringing up
}
```

**Examples:**
```typescript
BELIEVES(Sarah, climate_action_important, {
  category: 'environmental',
  intensity: 'very_strong',
  confidence: 0.95,
  context: 'Passionate about reducing carbon footprint',
  public: true,
  acts_on: true,
  action_examples: ['bikes_to_work', 'solar_panels', 'vegan'],
  open_to_discussion: true
})

BELIEVES(Mark, privacy_rights, {
  category: 'political',
  intensity: 'strong',
  context: 'Concerned about data collection',
  public: false,
  touchy_subject: true  // Don't debate this
})
```

---

### 8. FEARS (Person → Fear)

```typescript
interface FearsMetadata {
  // REQUIRED
  category: 'phobia' | 'anxiety' | 'trigger' | 'trauma_related' | 'social_fear';
  intensity: 'weak' | 'moderate' | 'strong' | 'very_strong' | 'extreme';

  // OPTIONAL
  triggers?: string[];           // What activates this fear
  reactions?: string[];          // Physical/emotional responses

  // Management
  coping_mechanism?: string;     // "breathing exercises", "therapy"
  working_on?: boolean;          // Actively addressing it
  treatment?: 'therapy' | 'medication' | 'exposure_therapy' | 'coping_strategies' | 'none';

  // Impact
  avoidance_behaviors?: string[]; // "Won't fly", "Avoids crowds"
  impact_on_life?: 'minimal' | 'moderate' | 'significant' | 'severe';

  // Timeline
  since?: string;
  trigger_event?: string;        // "Car accident 2020", "Childhood trauma"

  // Sensitivity
  sensitive_topic?: boolean;     // Don't joke about it
}
```

**Examples:**
```typescript
FEARS(John, heights, {
  category: 'phobia',
  intensity: 'very_strong',
  triggers: ['tall_buildings', 'balconies', 'airplanes'],
  reactions: ['sweating', 'rapid_heartbeat', 'panic'],
  coping_mechanism: 'breathing_exercises',
  working_on: true,
  treatment: 'exposure_therapy',
  avoidance_behaviors: ['wont_hike_mountains', 'avoids_high_floors'],
  impact_on_life: 'moderate',
  sensitive_topic: false
})

FEARS(Lisa, car_accidents, {
  category: 'trauma_related',
  intensity: 'extreme',
  triggers: ['highway_driving', 'intersections', 'hearing_sirens'],
  reactions: ['panic_attack', 'flashbacks'],
  since: '2020-03',
  trigger_event: 'Car accident March 2020, PTSD',
  working_on: true,
  treatment: 'therapy',
  avoidance_behaviors: ['avoids_highways', 'rarely_drives'],
  impact_on_life: 'significant',
  sensitive_topic: true  // Don't joke about car accidents
})
```

---

### 9. WANTS_TO_ACHIEVE (Person → Goal)

```typescript
interface WantsToAchieveMetadata {
  // REQUIRED
  category: 'career' | 'fitness' | 'skill' | 'travel' | 'personal_growth' |
           'relationship' | 'financial' | 'creative' | 'other';
  status: 'aspiration' | 'planning' | 'in_progress' | 'achieved' | 'abandoned' | 'on_hold';

  // OPTIONAL
  priority?: 'low' | 'medium' | 'high' | 'critical';
  timeline?: string;             // "2025-10", "5 years", "someday"

  // Progress tracking
  progress?: string;             // "Training 3x per week", "50% complete"
  progress_percentage?: number;  // 0-100
  milestones?: string[];
  next_step?: string;

  // Challenges
  obstacles?: string[];          // What's blocking them
  support_needed?: string[];     // What help they need

  // Motivation
  why?: string;                  // Reason for goal
  motivated_by?: string[];       // ["kids", "health", "career"]

  // Accountability
  shared_with?: string[];        // Who knows about this goal
  accountability_partner?: string;

  // Sensitivity
  sensitive?: boolean;           // Failed attempts, touchy subject
  encourage?: boolean;           // Should friends encourage?
}
```

**Examples:**
```typescript
WANTS_TO_ACHIEVE(Sarah, run_marathon, {
  category: 'fitness',
  status: 'in_progress',
  priority: 'high',
  timeline: '2025-10',
  progress: 'Training 3x per week, up to 15 miles',
  progress_percentage: 60,
  milestones: ['completed_10k', 'completed_half_marathon', 'marathon_pending'],
  next_step: 'Increase long run to 18 miles',
  obstacles: ['knee_pain', 'time_management'],
  support_needed: ['running_partner', 'physical_therapy'],
  why: 'Prove to myself I can do hard things',
  motivated_by: ['health', 'personal_growth'],
  shared_with: ['best_friend', 'running_group'],
  encourage: true
})

WANTS_TO_ACHIEVE(David, start_bakery, {
  category: 'career',
  status: 'aspiration',
  priority: 'high',
  timeline: 'someday',
  progress: 'Just dreaming, too scared to start',
  progress_percentage: 5,
  obstacles: ['fear_of_leaving_stable_job', 'financial_risk', 'parents_expectations'],
  why: 'Baking is my passion, want to escape corporate stress',
  motivated_by: ['passion', 'work_life_balance'],
  sensitive: true,  // Internal conflict, touchy subject
  encourage: true
})
```

---

### 10. STRUGGLES_WITH (Person → Challenge)

```typescript
interface StrugglesWithMetadata {
  // REQUIRED
  category: 'habit' | 'health' | 'mental_health' | 'skill' |
           'relationship' | 'work' | 'personal' | 'addiction';
  intensity: 'weak' | 'moderate' | 'strong' | 'very_strong';

  // OPTIONAL
  since?: string;                // When it started
  duration?: string;             // "2 years", "always"

  // Status
  trying_to_change?: boolean;
  progress?: 'none' | 'minimal' | 'moderate' | 'significant' | 'almost_there';
  attempts?: number;             // Number of times tried to change

  // Support
  support_needed?: string[];     // ["therapy", "accountability", "medication"]
  currently_getting_help?: boolean;
  help_type?: string[];          // ["therapy", "AA", "medication"]

  // Impact
  manifestations?: string[];     // How it shows up
  impact_on_life?: 'minimal' | 'moderate' | 'significant' | 'severe';
  impact_areas?: string[];       // ["work", "relationships", "health"]

  // Sensitivity
  sensitive?: boolean;           // Touchy subject
  open_to_support?: boolean;     // Do they want help?
  avoid_topic?: boolean;         // Don't bring it up
}
```

**Examples:**
```typescript
STRUGGLES_WITH(John, procrastination, {
  category: 'habit',
  intensity: 'strong',
  since: 'always',
  duration: 'lifelong',
  trying_to_change: true,
  progress: 'minimal',
  attempts: 5,
  support_needed: ['accountability', 'time_management_tools'],
  currently_getting_help: false,
  manifestations: ['misses_deadlines', 'last_minute_panic', 'stress'],
  impact_on_life: 'moderate',
  impact_areas: ['work', 'relationships'],
  sensitive: false,
  open_to_support: true
})

STRUGGLES_WITH(Tom, alcoholism, {
  category: 'addiction',
  intensity: 'very_strong',
  since: '2013-01',
  duration: '10 years',
  trying_to_change: true,
  progress: 'significant',  // 2 years sober
  attempts: 4,
  support_needed: ['AA', 'therapy', 'sober_friends'],
  currently_getting_help: true,
  help_type: ['AA_meetings_3x_week', 'therapy_weekly'],
  manifestations: ['trigger_sensitivity', 'anxiety_in_social_settings'],
  impact_on_life: 'severe',
  impact_areas: ['health', 'relationships', 'work', 'social_life'],
  sensitive: true,  // Very touchy subject
  open_to_support: true,
  avoid_topic: false  // Actually okay discussing in supportive context
})
```

---

### 11. CARES_FOR (Person → Person/Pet)

```typescript
interface CaresForMetadata {
  // REQUIRED
  care_type: 'elderly_parent' | 'child' | 'disabled_sibling' | 'spouse' |
            'pet' | 'friend' | 'grandparent' | 'other';
  level: 'full_time' | 'part_time' | 'occasional' | 'financial_only' | 'emotional_only';

  // OPTIONAL
  since?: string;

  // Responsibilities
  responsibilities?: ('daily_care' | 'medical' | 'financial' | 'emotional' |
                     'transportation' | 'meals' | 'housekeeping')[];
  hours_per_week?: number;

  // For children/elderly
  age?: number;
  ages?: number[];               // For multiple children
  condition?: string;            // "dementia", "autism", "cancer"

  // Impact
  impact_on_availability: 'low' | 'medium' | 'high' | 'very_high';
  impact_on_work?: string;       // "Had to quit", "Work from home"
  impact_on_social_life?: 'minimal' | 'moderate' | 'significant' | 'severe';

  // Support system
  support_system?: string[];     // Who helps them
  respite_care?: boolean;
  needs_more_support?: boolean;

  // Emotional state
  caregiver_burnout?: boolean;
  emotional_state?: 'coping' | 'stressed' | 'overwhelmed' | 'exhausted' | 'at_breaking_point';

  // Attitudes
  willing_to_accept_help?: boolean;
  proud?: boolean;               // Won't accept help due to pride
}
```

**Examples:**
```typescript
CARES_FOR(Sarah, aging_mother, {
  care_type: 'elderly_parent',
  level: 'part_time',
  since: '2022-03',
  responsibilities: ['medical', 'financial', 'transportation'],
  hours_per_week: 15,
  age: 75,
  condition: 'dementia',
  impact_on_availability: 'high',
  impact_on_social_life: 'significant',
  support_system: ['brother_helps_occasionally'],
  respite_care: false,
  needs_more_support: true,
  emotional_state: 'stressed',
  willing_to_accept_help: true
})

CARES_FOR(Lisa, three_children, {
  care_type: 'child',
  level: 'full_time',
  since: '2015-01',
  responsibilities: ['daily_care', 'meals', 'transportation', 'emotional', 'financial'],
  hours_per_week: 120,  // Full-time parenting
  ages: [10, 7, 4],
  impact_on_availability: 'very_high',
  impact_on_work: 'Full-time nurse but exhausted',
  impact_on_social_life: 'severe',
  support_system: ['mother_helps_2_nights_week'],
  respite_care: false,
  needs_more_support: true,
  caregiver_burnout: true,
  emotional_state: 'exhausted',
  willing_to_accept_help: false,  // Too proud
  proud: true
})
```

---

### 12. DEPENDS_ON (Person → Person/Thing)

```typescript
interface DependsOnMetadata {
  // REQUIRED
  dependency_type: 'care' | 'financial' | 'emotional' | 'housing' |
                  'transportation' | 'medical' | 'recovery' | 'other';
  level: 'critical' | 'high' | 'moderate' | 'low';

  // OPTIONAL
  since?: string;

  // Details
  frequency?: string;            // "daily", "3x per week"
  specific_need?: string;        // "Childcare", "Income", "Rides to work"

  // Consequences
  consequence_if_lost?: string;  // "Would have to quit job", "Can't function"
  critical_reason?: string;      // Why so critical

  // Independence
  working_to_reduce?: boolean;
  timeline_to_independence?: string;
  plan_to_reduce?: string;

  // For medication dependencies
  medication?: string;
  dosage?: string;
  side_effects?: string;

  // For financial dependencies
  percentage_of_income?: number;  // If depending on someone for income

  // For recovery dependencies (AA, therapy, etc.)
  non_negotiable?: boolean;
  skip_consequence?: string;     // "Relapse risk" if skipped
}
```

**Examples:**
```typescript
DEPENDS_ON(Lisa, mother_for_childcare, {
  dependency_type: 'care',
  level: 'critical',
  since: '2023-01',
  frequency: '2_nights_per_week',
  specific_need: 'Childcare while working night shifts',
  consequence_if_lost: 'Would have to quit nursing job',
  critical_reason: 'Cannot afford alternative childcare',
  working_to_reduce: false
})

DEPENDS_ON(Tom, AA_meetings, {
  dependency_type: 'recovery',
  level: 'critical',
  since: '2023-01',
  frequency: '3x_per_week',
  specific_need: 'Maintain sobriety',
  consequence_if_lost: 'High relapse risk',
  non_negotiable: true,
  skip_consequence: 'Relapse risk increases significantly',
  working_to_reduce: false  // Will always need support
})

DEPENDS_ON(Emma, anxiety_medication, {
  dependency_type: 'medical',
  level: 'critical',
  since: '2019-06',
  medication: 'Sertraline 100mg',
  frequency: 'daily',
  consequence_if_lost: 'Panic attacks return',
  working_to_reduce: false
})
```

---

### 13. REGULARLY_DOES (Person → Activity)

```typescript
interface RegularlyDoesMetadata {
  // REQUIRED
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'varies';
  importance: 'low' | 'medium' | 'high' | 'critical';

  // OPTIONAL
  time_of_day?: string;          // "morning", "Tuesday evening", "5 AM"
  day_of_week?: string;          // "Friday", "Sunday morning"
  since?: string;

  // Impact
  disruption_impact?: 'low' | 'moderate' | 'high' | 'extreme';
  consequence_if_disrupted?: string;  // "Grumpy all day", "Anxiety spike"
  non_negotiable?: boolean;

  // Social
  with?: string[];               // Other people involved
  solo?: boolean;

  // Purpose/Benefit
  purpose?: string[];            // ["stress_relief", "health", "social", "meditation"]
  benefit?: string;              // "Keeps me sane", "Only time I feel calm"

  // Category for organization
  activity_category?: 'exercise' | 'spiritual' | 'social' | 'medical' | 'hobby' | 'self_care';

  // For medical/recovery activities
  medical_necessity?: boolean;
  prescribed?: boolean;
}
```

**Examples:**
```typescript
REGULARLY_DOES(Sarah, morning_yoga, {
  frequency: 'daily',
  time_of_day: 'morning',
  since: '2022-01',
  importance: 'high',
  disruption_impact: 'moderate',
  consequence_if_disrupted: 'Grumpy and anxious all day',
  solo: true,
  purpose: ['stress_relief', 'physical_health', 'mental_health'],
  benefit: 'Starts day right, manages anxiety',
  activity_category: 'exercise'
})

REGULARLY_DOES(Tom, AA_meetings, {
  frequency: 'weekly',
  time_of_day: 'varies',
  since: '2023-01',
  importance: 'critical',
  disruption_impact: 'extreme',
  non_negotiable: true,
  consequence_if_disrupted: 'Sobriety at risk',
  with: ['AA_group'],
  purpose: ['recovery', 'support', 'accountability'],
  benefit: 'Keeps me sober, saved my life',
  activity_category: 'medical',
  medical_necessity: true
})

REGULARLY_DOES(Mark+Emma, game_night, {
  frequency: 'weekly',
  day_of_week: 'Friday evening',
  time_of_day: 'evening',
  since: '2010-01',
  importance: 'critical',
  disruption_impact: 'high',
  non_negotiable: false,
  with: ['Emma'],  // or ['Mark'] depending on whose record
  purpose: ['social', 'friendship', 'fun'],
  benefit: '15-year tradition, sacred friend time',
  activity_category: 'social'
})
```

---

### 14. PREFERS_OVER (Person → Preference)

```typescript
interface PrefersOverMetadata {
  // REQUIRED
  prefers: string;               // What they prefer
  over: string;                  // What they prefer it over
  category: 'food' | 'beverage' | 'activity' | 'communication' | 'environment' |
           'social' | 'travel' | 'media' | 'other';

  // OPTIONAL
  strength?: 'weak' | 'moderate' | 'strong' | 'very_strong';
  context?: string;              // When this applies
  always?: boolean;              // Always true or conditional?

  // Reasoning
  reason?: string;               // Why they prefer it

  // Multiple alternatives
  ranked_preferences?: string[]; // ["tea", "water", "coffee"] in order

  // Behavioral
  will_accept_alternative?: boolean;
  strong_aversion_to_alternative?: boolean;
}
```

**Examples:**
```typescript
PREFERS_OVER(Sarah, tea_over_coffee, {
  prefers: 'tea',
  over: 'coffee',
  category: 'beverage',
  strength: 'very_strong',
  always: true,
  reason: 'Coffee makes her jittery',
  ranked_preferences: ['green_tea', 'herbal_tea', 'black_tea', 'water', 'coffee'],
  will_accept_alternative: false,  // Never orders coffee
  strong_aversion_to_alternative: true
})

PREFERS_OVER(Tom, small_groups_over_parties, {
  prefers: 'small_gatherings',
  over: 'large_parties',
  category: 'social',
  strength: 'very_strong',
  context: 'Introvert, anxious in crowds',
  reason: 'Feels overwhelmed in large groups',
  will_accept_alternative: true,  // Will attend parties if necessary
  strong_aversion_to_alternative: true  // But really dislikes them
})
```

---

### 15. USED_TO_BE (Person → Past State)

```typescript
interface UsedToBeMetadata {
  // REQUIRED
  category: 'identity' | 'profession' | 'lifestyle' | 'belief' |
           'location' | 'activity' | 'relationship_status';

  // Timeline (required for past states)
  validFrom: string;             // When it started
  validTo: string;               // When it ended

  // OPTIONAL
  changed_to?: string;           // What they are now
  reason_for_change?: string;    // Why it changed

  // Emotional weight
  sensitive?: boolean;           // Is this a touchy subject?
  regret?: boolean;              // Do they regret the change?
  proud_of_change?: boolean;
  miss_it?: boolean;

  // Context
  duration?: string;             // "10 years", "brief period"
  significance?: 'low' | 'medium' | 'high' | 'life_defining';

  // Communication
  okay_to_discuss?: boolean;
  avoid_mentioning?: boolean;
}
```

**Examples:**
```typescript
USED_TO_BE(Sarah, meat_eater, {
  category: 'lifestyle',
  validFrom: '1990-01',
  validTo: '2024-01',
  changed_to: 'vegetarian',
  reason_for_change: 'Ethical reasons, animal rights',
  sensitive: false,
  regret: false,
  proud_of_change: true,
  miss_it: false,
  duration: '34 years',
  significance: 'high',
  okay_to_discuss: true
})

USED_TO_BE(Lisa, competitive_runner, {
  category: 'activity',
  validFrom: '2010-01',
  validTo: '2021-03',
  changed_to: 'occasional_walker',
  reason_for_change: 'Knee injury, can no longer run',
  sensitive: true,  // Sad about it
  regret: false,
  proud_of_change: false,
  miss_it: true,  // Really misses it
  duration: '11 years',
  significance: 'life_defining',  // Running was huge part of identity
  okay_to_discuss: true,
  avoid_mentioning: false  // She'll talk about it but sad
})

USED_TO_BE(Tom, alcoholic, {
  category: 'identity',
  validFrom: '2013-01',
  validTo: '2023-01',
  changed_to: 'recovering_alcoholic_2_years_sober',
  reason_for_change: 'Hit rock bottom, entered recovery',
  sensitive: true,
  regret: true,  // Regrets lost years
  proud_of_change: true,  // Proud of recovery
  miss_it: false,
  duration: '10 years',
  significance: 'life_defining',
  okay_to_discuss: true,  // Open about recovery
  avoid_mentioning: false  // Actually helps him to discuss
})
```

---

### 16. SENSITIVE_TO (Person → Sensitivity)

```typescript
interface SensitiveToMetadata {
  // REQUIRED
  category: 'sensory' | 'emotional' | 'environmental' | 'topic' | 'physical';
  severity: 'mild' | 'moderate' | 'severe' | 'extreme';

  // OPTIONAL
  reaction?: string;             // How they react
  reactions?: string[];          // Multiple reactions

  // Triggers (more specific)
  triggers?: string[];           // Specific things that trigger it

  // Accommodation
  accommodation_needed?: string;
  accommodation_examples?: string[];

  // Medical
  medical_condition?: string;    // "PTSD", "Autism", "Migraines"
  diagnosed?: boolean;

  // Timeline
  since?: string;
  trigger_event?: string;        // What caused sensitivity

  // Management
  coping_strategies?: string[];
  medication?: string;
  avoidance_necessary?: boolean;
}
```

**Examples:**
```typescript
SENSITIVE_TO(David, loud_noises, {
  category: 'sensory',
  severity: 'severe',
  reactions: ['headaches', 'anxiety', 'panic'],
  triggers: ['sirens', 'construction', 'crowded_restaurants', 'concerts'],
  accommodation_needed: 'Quiet environments',
  accommodation_examples: ['dimly_lit_quiet_restaurants', 'noise_canceling_headphones'],
  medical_condition: 'Sensory processing disorder',
  diagnosed: true,
  since: 'childhood',
  coping_strategies: ['noise_canceling_headphones', 'avoid_loud_places'],
  avoidance_necessary: true
})

SENSITIVE_TO(Emma, discussion_of_divorce, {
  category: 'emotional',
  severity: 'very_strong',
  reactions: ['tears', 'shuts_down', 'leaves_conversation'],
  triggers: ['divorce_talk', 'relationship_failure_stories', 'marriage_jokes'],
  accommodation_needed: 'Avoid topic entirely',
  since: '2019-11',
  trigger_event: 'Own divorce in 2019, traumatic',
  coping_strategies: ['therapy', 'changes_subject'],
  avoidance_necessary: true
})
```

---

### 17. UNCOMFORTABLE_WITH (Person → Boundary)

```typescript
interface UncomfortableWithMetadata {
  // REQUIRED
  category: 'topic' | 'social_situation' | 'physical' | 'communication' | 'surprise';
  intensity: 'weak' | 'moderate' | 'strong' | 'very_strong';

  // OPTIONAL
  why?: string;                  // Reason for discomfort
  since?: string;
  trigger_event?: string;

  // Accommodation
  accommodation: string;         // What to do instead
  accommodation_details?: string[];

  // Reactions
  reaction?: string;             // How they respond
  warning_needed?: boolean;      // Need advance warning?

  // Flexibility
  will_tolerate_if_necessary?: boolean;
  hard_boundary?: boolean;       // Absolutely won't do this
}
```

**Examples:**
```typescript
UNCOMFORTABLE_WITH(Sarah, surprise_visits, {
  category: 'surprise',
  intensity: 'very_strong',
  why: 'Anxiety, needs preparation time',
  accommodation: 'Text before coming over',
  accommodation_details: ['24_hour_notice_preferred', 'minimum_2_hour_warning'],
  reaction: 'Panic, can\'t enjoy visit if surprised',
  warning_needed: true,
  will_tolerate_if_necessary: false,  // Please don't
  hard_boundary: true
})

UNCOMFORTABLE_WITH(Mark, discussing_politics, {
  category: 'topic',
  intensity: 'strong',
  why: 'Causes conflict, stresses him out',
  accommodation: 'Avoid political topics',
  reaction: 'Gets tense, changes subject',
  will_tolerate_if_necessary: true,  // At family dinners, has to
  hard_boundary: false
})

UNCOMFORTABLE_WITH(Emma, physical_touch, {
  category: 'physical',
  intensity: 'moderate',
  why: 'Trauma history',
  since: '2019-11',
  trigger_event: 'Divorce trauma',
  accommodation: 'Ask before hugging',
  accommodation_details: ['verbal_consent', 'personal_space', 'no_surprise_hugs'],
  reaction: 'Tenses up, steps back',
  will_tolerate_if_necessary: true,  // With close family/friends
  hard_boundary: false
})
```

---

## 🔷 Phase 2 - Advanced Relations

### 18. HAS_SKILL (Person → Skill)

```typescript
interface HasSkillMetadata {
  // REQUIRED
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';
  domain: 'cooking' | 'programming' | 'sports' | 'arts' | 'languages' |
         'music' | 'crafts' | 'professional' | 'other';

  // OPTIONAL
  years_experience?: number;
  since?: string;

  // Context
  how_acquired?: 'self_taught' | 'formal_training' | 'on_the_job' | 'hobby' | 'professional';
  certificates?: string[];

  // Usage
  currently_practicing?: boolean;
  frequency_of_use?: 'daily' | 'weekly' | 'monthly' | 'rarely';

  // Willingness to help
  willing_to_teach?: boolean;
  willing_to_help?: boolean;
  expertise_acknowledged?: boolean;  // Do they consider themselves skilled?
}
```

---

### 19. OWNS (Person → Thing)

```typescript
interface OwnsMetadata {
  // REQUIRED
  category: 'vehicle' | 'pet' | 'property' | 'business' | 'collection' | 'equipment' | 'other';

  // OPTIONAL
  since?: string;
  status?: 'current' | 'past' | 'planning_to_acquire';

  // Details
  quantity?: number;
  specific_items?: string[];

  // For pets
  pet_type?: string;
  pet_name?: string;

  // Sharing
  willing_to_lend?: boolean;
  precious?: boolean;            // Emotionally important
}
```

---

### 20. HAS_IMPORTANT_DATE (Person → Date)

```typescript
interface HasImportantDateMetadata {
  // REQUIRED
  date: string;                  // ISO date or MM-DD for recurring
  type: 'birthday' | 'anniversary' | 'work_anniversary' | 'memorial' | 'sobriety_date' | 'other';
  recurring: boolean;

  // OPTIONAL
  send_reminder?: boolean;
  reminder_days_before?: number;

  // Celebration preferences
  how_they_celebrate?: string;
  celebration_importance?: 'low' | 'medium' | 'high' | 'critical';
  preferences?: {
    likes?: string[];
    dislikes?: string[];
    traditions?: string[];
  };

  // Context
  significance?: string;
  first_occurrence?: string;     // For anniversaries
  person_related?: string;       // "Met my spouse", "Lost my father"
}
```

---

## 🎯 Validation Rules

### Required Field Validation

```typescript
// Every relation MUST have:
- relationType (enum)
- objectLabel (string)
- status (default: 'current')
- confidence (default: 1.0)
- createdAt (auto)

// Temporal relations MUST have:
if (status === 'past') {
  require(validTo !== null)
}
if (status === 'current') {
  require(validTo === null)
}
```

### Metadata Validation

```typescript
// Validate against schema for relation type
function validateMetadata(relationType, metadata) {
  const schema = METADATA_SCHEMAS[relationType];

  // Check required fields
  for (const field of schema.required) {
    if (!metadata[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Check enum values
  for (const [field, value] of Object.entries(metadata)) {
    if (schema.enums[field] && !schema.enums[field].includes(value)) {
      throw new Error(`Invalid value for ${field}: ${value}`);
    }
  }

  return true;
}
```

---

## 📖 Usage Examples

See `EXAMPLE_STORIES_AND_RELATIONS.md` for comprehensive real-world examples of these metadata schemas in action.

---

**Next:** See `DATABASE_CONSTRAINTS.md` for temporal rules and `RELATION_USAGE_GUIDE.md` for decision trees.
