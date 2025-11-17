# Example Stories with Relation Extraction

**Purpose:** Demonstrate how the 20 core relation types work in practice with real-world stories

**Updated:** November 7, 2025

---

## 🎯 How to Use This Document

This document contains:
1. **10 Long Stories** (detailed narratives about people)
2. **10 Short Stories** (quick snippets)
3. **Extracted Relations** for each story
4. **Complex Scenarios** (like the meat-eater vs vegetarian best friends dilemma)
5. **Priority Rules** for handling conflicts

---

## 📖 Long Stories

### Story 1: Sarah - The Career Changer

**Story:**

I met Sarah 5 years ago at a teaching conference. She was a corporate lawyer back then, making great money but absolutely miserable. She'd pull 80-hour weeks and looked exhausted all the time. She used to eat whatever was fast - burgers, pizza, you name it.

Then in January 2024, everything changed. She quit her law job and became an elementary school teacher. Around the same time, she went vegetarian for ethical reasons. She's SO much happier now, even though she makes way less money.

Sarah's mom has dementia, so Sarah takes her to doctor appointments twice a week and manages her finances. It's a lot, but she never complains. She also does yoga every morning religiously - if she misses it, she's grumpy all day.

She's terrified of public speaking though, which is funny since she teaches kids all day. The thought of presenting to adults makes her break out in sweat. She's working on it through therapy every Tuesday evening.

Her big goal is to become a school principal in the next 5 years. She's getting her masters degree now to make it happen. Oh, and she always orders tea, never coffee. She's very specific about that.

**Extracted Relations:**

```typescript
// Identity & Profession
USED_TO_BE(Sarah, corporate_lawyer, {
  category: 'profession',
  validFrom: '2010-06',
  validTo: '2023-12',
  status: 'past',
  changed_to: 'elementary_teacher',
  reason_for_change: 'burnout',
  context: '80-hour weeks, miserable'
})

IS(Sarah, elementary_teacher, {
  category: 'profession',
  since: '2024-01',
  status: 'current',
  context: 'much happier now'
})

// Lifestyle Changes
USED_TO_BE(Sarah, meat_eater, {
  category: 'lifestyle',
  validFrom: '1990-01',
  validTo: '2024-01',
  status: 'past',
  context: 'ate fast food, burgers, pizza'
})

IS(Sarah, vegetarian, {
  category: 'lifestyle',
  since: '2024-01',
  status: 'current',
  reason: 'ethical_reasons',
  intensity: 'strong'
})

// Caregiving
CARES_FOR(Sarah, mother, {
  care_type: 'elderly_parent',
  level: 'part_time',
  since: '2022-03',
  condition: 'dementia',
  responsibilities: ['medical_appointments', 'finances'],
  frequency: 'twice_weekly',
  impact_on_availability: 'high',
  attitude: 'never_complains'
})

// Habits & Routines
REGULARLY_DOES(Sarah, morning_yoga, {
  frequency: 'daily',
  time_of_day: 'morning',
  since: '2022-01',
  importance: 'critical',
  disruption_impact: 'high',
  context: 'grumpy if she misses it'
})

REGULARLY_DOES(Sarah, therapy, {
  frequency: 'weekly',
  time_of_day: 'Tuesday_evening',
  since: '2023-06',
  importance: 'high',
  purpose: 'working on public speaking fear'
})

// Fears
FEARS(Sarah, public_speaking, {
  category: 'social_fear',
  intensity: 'very_strong',
  confidence: 1.0,
  reaction: 'breaks out in sweat',
  context: 'fine with kids, not adults',
  working_on: true,
  coping: 'therapy'
})

// Goals
WANTS_TO_ACHIEVE(Sarah, school_principal, {
  category: 'career',
  status: 'in_progress',
  priority: 'high',
  timeline: '5_years',
  progress: 'getting masters degree',
  confidence: 0.9
})

// Preferences
PREFERS_OVER(Sarah, tea_over_coffee, {
  prefers: 'tea',
  over: 'coffee',
  category: 'beverage',
  strength: 'very_strong',
  context: 'always orders tea, never coffee'
})

// Social Connection
KNOWS(User, Sarah, {
  relationship_type: 'friend',
  met_at: 'teaching_conference',
  since: '2020-01',
  strength: 0.8,
  context: 'met 5 years ago'
})
```

---

### Story 2: Mark & Emma - The Best Friends Dilemma

**Story:**

Mark and Emma have been best friends since college - we're talking 15 years of friendship. They're inseparable. They have game night every Friday without fail, and they've traveled to 12 countries together.

Here's the thing though: Mark is a HARDCORE meat lover. He grills steaks every weekend, goes to BBQ festivals, and his favorite restaurant is a Brazilian steakhouse. He believes humans evolved to eat meat and it's part of our natural diet.

Emma, on the other hand, is a passionate vegan and animal rights activist. She went vegan 3 years ago for ethical reasons and volunteers at animal sanctuaries every Saturday. She gets genuinely upset seeing animals suffer and believes eating meat is morally wrong. She's very vocal about it on social media.

Despite their opposing views, they respect each other deeply and have an unspoken rule: they don't discuss food ethics. Mark knows Emma's vegetarian restaurants, and Emma tolerates his meat-eating without comment when they're together. They've made it work because their friendship matters more than their differences.

When I'm planning dinner parties, this creates a dilemma: Do I put them together (because they're best friends) or separate them (because of the dietary conflict)? The answer is: ALWAYS together. Their friendship bond trumps the food difference. But I need to choose a restaurant that has excellent options for both - like a Thai place with great tofu dishes AND meat options.

Mark also struggles with work-life balance. He works 60 hours a week at a tech startup and barely sees his wife and kids. Emma keeps telling him to set boundaries, but he can't seem to say no to his boss.

**Extracted Relations:**

```typescript
// Mark's Profile

// Identity
IS(Mark, meat_eater, {
  category: 'lifestyle',
  intensity: 'very_strong',
  context: 'HARDCORE meat lover'
})

IS(Mark, tech_worker, {
  category: 'profession',
  workplace: 'startup',
  hours: '60_per_week'
})

// Beliefs
BELIEVES(Mark, humans_evolved_to_eat_meat, {
  category: 'philosophical',
  intensity: 'strong',
  context: 'part of natural diet'
})

// Habits
REGULARLY_DOES(Mark, grilling_steaks, {
  frequency: 'weekly',
  time_of_day: 'weekend',
  importance: 'high'
})

REGULARLY_DOES(Mark, game_night_with_Emma, {
  frequency: 'weekly',
  time_of_day: 'Friday_evening',
  since: '2010-01',
  importance: 'critical',
  with: ['Emma'],
  context: 'without fail'
})

// Likes
LIKES(Mark, brazilian_steakhouse, {
  category: 'restaurant',
  intensity: 'very_strong',
  context: 'favorite restaurant'
})

LIKES(Mark, BBQ_festivals, {
  category: 'activity',
  intensity: 'strong'
})

// Struggles
STRUGGLES_WITH(Mark, work_life_balance, {
  category: 'work',
  intensity: 'very_strong',
  since: '2023-01',
  trying_to_change: false,
  context: '60 hour weeks, barely sees family',
  support_needed: 'boundary_setting'
})

// Relationships
KNOWS(Mark, Emma, {
  relationship_type: 'friend',
  strength: 1.0,
  since: '2010-01',
  context: 'best friends, 15 years, inseparable',
  met_at: 'college',
  bond_quality: 'deep_respect'
})

CARES_FOR(Mark, wife_and_kids, {
  care_type: 'family',
  level: 'struggling',
  context: 'barely sees them due to work'
})

// Experiences
EXPERIENCED(Mark, international_travel_with_Emma, {
  activity: 'travel',
  count: 12,
  countries: 12,
  with: ['Emma'],
  since: '2010-01'
})

// Emma's Profile

// Identity
IS(Emma, vegan, {
  category: 'lifestyle',
  since: '2022-01',
  intensity: 'very_strong',
  context: 'passionate, animal rights activist'
})

IS(Emma, animal_rights_activist, {
  category: 'identity',
  since: '2022-01',
  activity_level: 'high',
  context: 'very vocal on social media'
})

// Beliefs
BELIEVES(Emma, eating_meat_is_morally_wrong, {
  category: 'ethical',
  intensity: 'very_strong',
  context: 'believes animals shouldn't suffer'
})

// Emotional
SENSITIVE_TO(Emma, animal_suffering, {
  category: 'emotional',
  severity: 'very_strong',
  reaction: 'genuinely upset',
  context: 'seeing animals suffer'
})

// Habits
REGULARLY_DOES(Emma, animal_sanctuary_volunteering, {
  frequency: 'weekly',
  time_of_day: 'Saturday',
  since: '2022-01',
  importance: 'critical'
})

REGULARLY_DOES(Emma, game_night_with_Mark, {
  frequency: 'weekly',
  time_of_day: 'Friday_evening',
  since: '2010-01',
  importance: 'critical',
  with: ['Mark'],
  context: 'without fail'
})

// Boundaries
UNCOMFORTABLE_WITH(Emma, discussing_food_ethics_with_Mark, {
  category: 'topic',
  intensity: 'high',
  accommodation: 'unspoken_rule_not_to_discuss',
  context: 'respects Mark despite disagreement'
})

// Relationships
KNOWS(Emma, Mark, {
  relationship_type: 'friend',
  strength: 1.0,
  since: '2010-01',
  context: 'best friends, 15 years, inseparable',
  met_at: 'college',
  bond_quality: 'deep_respect',
  special_accommodation: 'dont_discuss_food_ethics'
})

// Experiences
EXPERIENCED(Emma, international_travel_with_Mark, {
  activity: 'travel',
  count: 12,
  countries: 12,
  with: ['Mark'],
  since: '2010-01'
})

// User's Knowledge
KNOWS(User, Mark, {
  relationship_type: 'friend',
  strength: 0.7
})

KNOWS(User, Emma, {
  relationship_type: 'friend',
  strength: 0.7
})
```

**🎯 RESOLUTION RULES for the Dilemma:**

```typescript
// Priority System for Event Planning

RULE 1: Friendship Bond > Dietary Conflict
Decision: Seat Mark and Emma TOGETHER
Reason: 15-year best friendship (strength: 1.0) trumps lifestyle difference
Evidence: They've made it work for 3 years already

RULE 2: Choose Inclusive Venues
Requirement: Restaurant must have:
  - Excellent vegan options (for Emma)
  - Meat options (for Mark)
  - Examples: Thai, Indian, Mediterranean
Avoid: Steakhouses, vegan-only restaurants

RULE 3: Respect Their Boundary
Don't: Make the dietary difference a conversation topic
Do: Let them manage their dynamic (they have unspoken rules)

RULE 4: Warning Flags (When to Separate)
Only separate if:
  - Emma specifically asks (SENSITIVE_TO animal suffering might be triggered)
  - Mark is going to a BBQ/steakhouse event Emma can't attend
  - Either expresses discomfort
```

**Implementation:**

```typescript
// Event Planning Algorithm
function shouldSeatTogether(person1, person2, event) {
  // Check friendship strength
  const friendship = getConnection(person1, person2);
  if (friendship.strength >= 0.9 && friendship.bond_quality === 'deep_respect') {
    // Check for dietary conflicts
    const p1_diet = getRelation(person1, IS, category='lifestyle');
    const p2_diet = getRelation(person2, IS, category='lifestyle');

    if (hasConflict(p1_diet, p2_diet)) {
      // Check if venue accommodates both
      if (venueHasOptionsFor(event.venue, [p1_diet, p2_diet])) {
        return {
          seat_together: true,
          reason: 'Strong friendship + inclusive venue',
          warnings: ['Avoid discussing food ethics']
        };
      }
      return {
        seat_together: false,
        reason: 'Venue cannot accommodate both diets',
        alternative: 'Find inclusive venue'
      };
    }
    return { seat_together: true };
  }

  // Check for explicit boundaries
  const boundaries = getRelation(person1, UNCOMFORTABLE_WITH);
  if (boundaries.includes(person2)) {
    return { seat_together: false, reason: 'Explicit boundary' };
  }

  return { seat_together: true };
}
```

---

### Story 3: Tom - The Recovering Addict

**Story:**

Tom is one of the bravest people I know. He's been sober for 2 years now after struggling with alcoholism for a decade. He goes to AA meetings three times a week and it's not negotiable - his sobriety depends on it.

He used to be the life of the party, always at bars, always drinking. Now he's a completely different person. He's anxious in social situations without alcohol and uncomfortable with small talk. He much prefers deep one-on-one conversations.

What's amazing is how his best friend Jake has stuck by him through everything. Jake used to be his drinking buddy, but when Tom got sober, Jake stopped drinking around him completely. They now meet for coffee instead of bars, and Jake never pressures him.

Tom also struggles with depression and takes medication daily. He's in therapy every Thursday and says it saved his life. He's terrified of relapsing - it's his biggest fear. But he's working towards becoming a substance abuse counselor to help others. He's taking online classes now.

He can't be around alcohol at all - it's a huge trigger. So when I invite Tom to things, I make sure it's not at bars or events where drinking is the main activity. Coffee shops, hiking, game nights at home - those work great.

**Extracted Relations:**

```typescript
// Past & Present States
USED_TO_BE(Tom, alcoholic, {
  category: 'condition',
  validFrom: '2013-01',
  validTo: '2023-01',
  duration_years: 10,
  status: 'past',
  changed_to: 'sober',
  reason_for_change: 'recovery',
  sensitive: true
})

USED_TO_BE(Tom, life_of_the_party, {
  category: 'identity',
  validFrom: '2010-01',
  validTo: '2023-01',
  context: 'always at bars, always drinking',
  status: 'past',
  changed_to: 'quiet_and_anxious'
})

IS(Tom, recovering_addict, {
  category: 'identity',
  since: '2023-01',
  status: 'current',
  sober_time: '2_years',
  importance: 'critical',
  sensitive: true
})

// Dependencies
DEPENDS_ON(Tom, AA_meetings, {
  dependency_type: 'recovery',
  level: 'critical',
  frequency: '3x_per_week',
  since: '2023-01',
  context: 'sobriety depends on it',
  non_negotiable: true
})

DEPENDS_ON(Tom, medication, {
  dependency_type: 'medical',
  level: 'critical',
  medication: 'antidepressants',
  frequency: 'daily',
  since: '2022-06',
  for: 'depression'
})

DEPENDS_ON(Tom, Jake, {
  dependency_type: 'emotional',
  level: 'high',
  since: '2023-01',
  context: 'best friend who supported recovery'
})

// Routines
REGULARLY_DOES(Tom, AA_meetings, {
  frequency: '3x_per_week',
  since: '2023-01',
  importance: 'critical',
  disruption_impact: 'extreme',
  non_negotiable: true
})

REGULARLY_DOES(Tom, therapy, {
  frequency: 'weekly',
  time_of_day: 'Thursday',
  since: '2022-06',
  importance: 'critical',
  context: 'says it saved his life'
})

// Struggles
STRUGGLES_WITH(Tom, depression, {
  category: 'mental_health',
  intensity: 'strong',
  since: '2020-01',
  trying_to_change: true,
  support_needed: 'therapy, medication',
  sensitive: true
})

STRUGGLES_WITH(Tom, social_anxiety, {
  category: 'mental_health',
  intensity: 'moderate',
  since: '2023-01',
  context: 'anxious in social situations without alcohol',
  trying_to_change: true
})

// Fears
FEARS(Tom, relapsing, {
  category: 'addiction',
  intensity: 'very_strong',
  confidence: 1.0,
  context: 'biggest fear',
  triggers: ['alcohol', 'bars', 'drinking_events'],
  coping: 'AA, therapy, avoiding triggers'
})

// Sensitivities & Triggers
SENSITIVE_TO(Tom, alcohol, {
  category: 'trigger',
  severity: 'extreme',
  reaction: 'relapse_risk',
  accommodation_needed: 'no_alcohol_environments',
  context: 'cant be around it at all'
})

SENSITIVE_TO(Tom, bars_and_drinking_events, {
  category: 'environmental',
  severity: 'extreme',
  reaction: 'triggering',
  accommodation_needed: 'different_venues'
})

// Boundaries
UNCOMFORTABLE_WITH(Tom, small_talk, {
  category: 'social_situation',
  intensity: 'moderate',
  why: 'prefers deep conversations',
  accommodation: 'one_on_one_deep_talks'
})

// Goals
WANTS_TO_ACHIEVE(Tom, substance_abuse_counselor, {
  category: 'career',
  status: 'in_progress',
  priority: 'high',
  timeline: '3_years',
  progress: 'taking online classes',
  motivation: 'help_others'
})

// Preferences
PREFERS_OVER(Tom, one_on_one_over_groups, {
  prefers: 'one_on_one_conversations',
  over: 'group_socializing',
  category: 'social',
  strength: 'strong',
  context: 'uncomfortable in groups'
})

PREFERS_OVER(Tom, coffee_shops_over_bars, {
  prefers: 'coffee_shops',
  over: 'bars',
  category: 'venue',
  strength: 'critical',
  reason: 'sobriety',
  since: '2023-01'
})

// Relationships
KNOWS(Tom, Jake, {
  relationship_type: 'friend',
  strength: 1.0,
  since: '2012-01',
  context: 'best friend, stuck by him through recovery',
  bond_quality: 'unwavering_support'
})

// Jake's Support
USED_TO_BE(Jake, Toms_drinking_buddy, {
  category: 'relationship',
  validFrom: '2012-01',
  validTo: '2023-01',
  status: 'past',
  changed_to: 'sober_support'
})

CARES_FOR(Jake, Tom, {
  care_type: 'emotional_support',
  level: 'high',
  since: '2023-01',
  accommodation: 'stopped_drinking_around_Tom',
  context: 'meets for coffee instead of bars'
})
```

---

### Story 4: Lisa - The Overwhelmed Parent

**Story:**

Lisa is a single mom with three kids under 10. Her husband left 2 years ago, and she's been juggling everything alone since. She works full-time as a nurse (night shifts, which means terrible sleep schedule), takes the kids to school, soccer practice, piano lessons - the works.

She's exhausted. Like, falling-asleep-standing-up exhausted. She struggles with time management and often runs late to everything. But she's trying her best and won't accept help because she's proud.

Her mom helps with the kids two nights a week so Lisa can work, otherwise she couldn't afford childcare. She depends on that completely. Without her mom, she'd have to quit her job.

Lisa has no time for herself. She used to love painting - was actually really good at it - but hasn't touched a brush in 2 years. She wants to start again but can't figure out when. Her goal is just to make it through each day without falling apart.

She's sensitive to any criticism about her parenting. Her ex used to criticize her constantly, and now she's very defensive about it. If someone suggests she's not doing enough, she shuts down completely.

The kids' birthdays are sacred to her though - she goes ALL out. Elaborate parties, homemade cakes, the full deal. It's the one thing she refuses to compromise on. She believes being a good mom means making memories for them.

Oh, and she's terrified of losing her nursing job because then she'd lose health insurance for the kids. It keeps her up at night.

**Extracted Relations:**

```typescript
// Identity & Roles
IS(Lisa, single_mother, {
  category: 'role',
  since: '2023-01',
  number_of_children: 3,
  children_ages: [10, 7, 4],
  intensity: 'all_consuming',
  context: 'husband left 2 years ago'
})

IS(Lisa, nurse, {
  category: 'profession',
  employment: 'full_time',
  shift: 'night',
  since: '2015-01',
  impact: 'terrible sleep schedule'
})

// Caregiving Responsibilities
CARES_FOR(Lisa, three_children, {
  care_type: 'child',
  level: 'full_time',
  ages: [10, 7, 4],
  responsibilities: ['school', 'soccer', 'piano', 'all_daily_care'],
  impact_on_availability: 'extreme',
  context: 'doing it all alone',
  status: 'overwhelmed'
})

// Dependencies
DEPENDS_ON(Lisa, mother_for_childcare, {
  dependency_type: 'care',
  level: 'critical',
  frequency: '2_nights_per_week',
  since: '2023-01',
  context: 'works night shifts',
  critical_reason: 'otherwise_cant_afford_childcare',
  would_quit_job_without: true
})

DEPENDS_ON(Lisa, nursing_job_for_insurance, {
  dependency_type: 'financial',
  level: 'critical',
  since: '2015-01',
  reason: 'health_insurance_for_kids',
  fear_of_losing: 'very_strong'
})

// Struggles
STRUGGLES_WITH(Lisa, time_management, {
  category: 'personal',
  intensity: 'very_strong',
  since: '2023-01',
  trying_to_change: true,
  manifestation: 'runs late to everything',
  context: 'too many responsibilities'
})

STRUGGLES_WITH(Lisa, exhaustion, {
  category: 'health',
  intensity: 'extreme',
  since: '2023-01',
  manifestation: 'falling_asleep_standing_up',
  cause: 'night_shifts_plus_single_parenting'
})

STRUGGLES_WITH(Lisa, accepting_help, {
  category: 'personal',
  intensity: 'strong',
  reason: 'pride',
  trying_to_change: false,
  context: 'wont accept help from others'
})

// Fears
FEARS(Lisa, losing_nursing_job, {
  category: 'financial',
  intensity: 'very_strong',
  confidence: 1.0,
  consequence: 'lose health insurance for kids',
  manifestation: 'keeps her up at night',
  context: 'sole provider'
})

// Sensitivities
SENSITIVE_TO(Lisa, parenting_criticism, {
  category: 'emotional',
  severity: 'very_strong',
  reaction: 'shuts_down_completely',
  since: '2023-01',
  cause: 'ex_husband_used_to_criticize',
  trigger: 'suggestions_shes_not_doing_enough',
  very_defensive: true
})

// Past Activities
USED_TO_BE(Lisa, painter, {
  category: 'activity',
  validFrom: '2010-01',
  validTo: '2023-01',
  skill_level: 'really_good',
  status: 'past',
  reason_for_stopping: 'no_time',
  emotional_impact: 'misses_it'
})

// Goals
WANTS_TO_ACHIEVE(Lisa, start_painting_again, {
  category: 'personal_growth',
  status: 'aspiration',
  priority: 'low',
  timeline: 'unknown',
  obstacle: 'no_time',
  progress: 'none',
  emotional_weight: 'strong'
})

WANTS_TO_ACHIEVE(Lisa, make_it_through_each_day, {
  category: 'personal',
  status: 'in_progress',
  priority: 'critical',
  timeline: 'daily',
  context: 'just_surviving',
  goal: 'without_falling_apart'
})

// Beliefs & Values
BELIEVES(Lisa, being_good_mom_means_making_memories, {
  category: 'value',
  intensity: 'very_strong',
  manifestation: 'elaborate_birthday_parties',
  non_negotiable: true
})

// Regular Activities
REGULARLY_DOES(Lisa, kids_birthdays_ALL_OUT, {
  activity: 'birthday_parties',
  frequency: 'yearly_per_child',
  importance: 'critical',
  style: 'elaborate, homemade cakes',
  context: 'refuses to compromise',
  reason: 'sacred_to_her'
})

// Past Relationship
USED_TO_BE(Lisa, married, {
  category: 'relationship',
  validFrom: '2012-01',
  validTo: '2023-01',
  status: 'past',
  ended: 'divorce',
  reason: 'husband_left',
  sensitive: true
})
```

**EVENT PLANNING CONSIDERATIONS:**

```typescript
// When inviting Lisa:
CONSTRAINTS = {
  availability: 'extremely_limited',
  requires: 'advance_notice (needs to arrange childcare)',
  avoid_times: 'night_shifts (unknown which nights)',
  likely_late: true,
  energy_level: 'low',

  DO: [
    'Give lots of advance notice',
    'Be understanding if she cancels',
    'Kid-friendly events work better',
    'Acknowledge her efforts positively'
  ],

  DONT: [
    'Criticize her parenting',
    'Suggest she's not doing enough',
    'Expect her to stay late',
    'Be surprised if she falls asleep'
  ],

  GIFT_IDEAS: [
    'Childcare gift certificate',
    'Massage/spa gift (self-care)',
    'Painting supplies',
    'Meal delivery service'
  ]
}
```

---

### Story 5: David - The Anxious Perfectionist

**Story:**

David is brilliant but he's his own worst enemy. He's a software engineer at Google, and he's constantly worried he's not good enough. Imposter syndrome big time. He works 70-hour weeks trying to prove himself, even though his performance reviews are always excellent.

He's terrified of failure and making mistakes in front of others. During code reviews, his hands literally shake. He's also afraid of disappointing people, so he never says no to requests, which makes his workload impossible.

He's been in therapy for anxiety for a year now, twice a week. He takes medication for it too. His therapist is trying to get him to set boundaries, but he struggles with it. He wants to achieve work-life balance but doesn't know how.

The funny thing is, outside of work, he's completely different. He's an amazing baker - makes these incredible sourdough loaves and elaborate desserts. Baking is his meditation, his escape. He does it every Sunday morning religiously. It's the one time he feels calm and in control.

He's sensitive to loud noises (sensory processing issues) and bright lights give him migraines. He prefers quiet, dimly-lit spaces. He's also uncomfortable with physical touch - even handshakes make him tense. He needs personal space.

He wants to start his own bakery someday, but he's terrified of leaving the stability of his Google job. His parents immigrated here with nothing, and he feels like he'd be throwing away their sacrifice if he quit a "good job" to bake bread. It's a huge internal conflict for him.

**Extracted Relations:**

```typescript
// Identity & Profession
IS(David, software_engineer, {
  category: 'profession',
  workplace: 'Google',
  performance: 'excellent_reviews',
  hours_per_week: 70,
  since: '2019-01'
})

IS(David, perfectionist, {
  category: 'identity',
  intensity: 'very_strong',
  manifestation: 'overworking',
  negative_impact: true
})

// Struggles
STRUGGLES_WITH(David, imposter_syndrome, {
  category: 'mental_health',
  intensity: 'very_strong',
  since: '2019-01',
  manifestation: 'constantly_worried_not_good_enough',
  despite: 'excellent_performance_reviews',
  trying_to_change: true,
  support_needed: 'therapy'
})

STRUGGLES_WITH(David, anxiety, {
  category: 'mental_health',
  intensity: 'very_strong',
  since: '2018-01',
  manifestations: ['overworking', 'shaking_hands', 'cant_say_no'],
  trying_to_change: true,
  support: 'therapy, medication',
  sensitive: true
})

STRUGGLES_WITH(David, setting_boundaries, {
  category: 'work',
  intensity: 'very_strong',
  since: 'always',
  manifestation: 'never_says_no',
  consequence: 'impossible_workload',
  trying_to_change: true,
  progress: 'minimal'
})

// Fears
FEARS(David, failure, {
  category: 'performance',
  intensity: 'extreme',
  confidence: 1.0,
  manifestation: 'working_70_hour_weeks',
  context: 'trying to prove himself'
})

FEARS(David, making_mistakes_in_front_of_others, {
  category: 'social_fear',
  intensity: 'very_strong',
  triggers: ['code_reviews'],
  physical_reaction: 'hands_shake',
  impact: 'avoidance'
})

FEARS(David, disappointing_people, {
  category: 'anxiety',
  intensity: 'very_strong',
  manifestation: 'cant_say_no',
  consequence: 'overwhelming_workload'
})

FEARS(David, leaving_stable_job, {
  category: 'financial',
  intensity: 'very_strong',
  specific_fear: 'quitting_Google',
  reason: 'parents_sacrificed',
  context: 'wants to start bakery but terrified',
  internal_conflict: true
})

// Dependencies
DEPENDS_ON(David, therapy, {
  dependency_type: 'mental_health',
  level: 'critical',
  frequency: '2x_per_week',
  since: '2024-01',
  for: 'anxiety',
  importance: 'critical'
})

DEPENDS_ON(David, medication, {
  dependency_type: 'medical',
  level: 'critical',
  medication: 'anti_anxiety',
  frequency: 'daily',
  since: '2024-01'
})

// Sensitivities
SENSITIVE_TO(David, loud_noises, {
  category: 'sensory',
  severity: 'strong',
  reason: 'sensory_processing_issues',
  accommodation_needed: 'quiet_spaces'
})

SENSITIVE_TO(David, bright_lights, {
  category: 'sensory',
  severity: 'severe',
  reaction: 'migraines',
  accommodation_needed: 'dimly_lit_spaces'
})

// Boundaries
UNCOMFORTABLE_WITH(David, physical_touch, {
  category: 'physical',
  intensity: 'strong',
  includes: 'handshakes',
  reaction: 'becomes_tense',
  accommodation: 'needs_personal_space'
})

// Skills & Passions
HAS_SKILL(David, baking, {
  skill: 'baking',
  level: 'expert',
  specialty: 'sourdough, elaborate desserts',
  context: 'amazing baker',
  emotional_significance: 'meditation'
})

// Habits
REGULARLY_DOES(David, baking, {
  activity: 'baking',
  frequency: 'weekly',
  time_of_day: 'Sunday_morning',
  since: '2015-01',
  importance: 'critical',
  purpose: 'meditation, escape',
  effect: 'only_time_feels_calm_and_in_control',
  non_negotiable: true
})

REGULARLY_DOES(David, therapy, {
  frequency: '2x_per_week',
  since: '2024-01',
  importance: 'critical',
  focus: 'anxiety, boundary_setting'
})

// Goals
WANTS_TO_ACHIEVE(David, work_life_balance, {
  category: 'personal',
  status: 'aspiration',
  priority: 'high',
  obstacle: 'cant_set_boundaries',
  progress: 'minimal',
  working_on_with: 'therapist'
})

WANTS_TO_ACHIEVE(David, start_own_bakery, {
  category: 'career',
  status: 'aspiration',
  priority: 'high',
  timeline: 'someday',
  obstacle: 'fear_of_leaving_stable_job',
  internal_conflict: 'huge',
  blocking_belief: 'throwing_away_parents_sacrifice'
})

// Preferences
PREFERS_OVER(David, quiet_over_loud, {
  prefers: 'quiet_spaces',
  over: 'loud_environments',
  category: 'environment',
  strength: 'very_strong',
  reason: 'sensory_processing'
})

PREFERS_OVER(David, dim_over_bright, {
  prefers: 'dimly_lit_spaces',
  over: 'bright_lights',
  category: 'environment',
  strength: 'critical',
  reason: 'migraines'
})

// Beliefs
BELIEVES(David, leaving_good_job_is_throwing_away_sacrifice, {
  category: 'value',
  intensity: 'very_strong',
  context: 'parents immigrated with nothing',
  impact: 'blocking dream of bakery',
  conflict: true
})
```

---

## 📝 Short Stories (Quick Extractions)

### Story 6: "Rachel's Dog Phobia"

**Story:** Rachel is terrified of dogs after being bitten as a child. Even small dogs make her panic. She crosses the street to avoid them.

**Relations:**
```typescript
FEARS(Rachel, dogs, {
  category: 'phobia',
  intensity: 'very_strong',
  since: 'childhood',
  trigger: 'dog_bite_trauma',
  reaction: 'panic, crosses_street_to_avoid',
  includes: 'even_small_dogs'
})
```

---

### Story 7: "Mike's Marathon Journey"

**Story:** Mike is training for his first marathon. He runs 5 days a week at 5 AM. He's lost 40 pounds and feels amazing. His goal is to finish in under 4 hours.

**Relations:**
```typescript
WANTS_TO_ACHIEVE(Mike, marathon_under_4_hours, {
  category: 'fitness',
  status: 'in_progress',
  priority: 'high',
  timeline: '2025-10',
  progress: 'training_5_days_per_week'
})

REGULARLY_DOES(Mike, running, {
  frequency: '5x_per_week',
  time_of_day: '5_AM',
  since: '2024-01',
  importance: 'high',
  result: 'lost_40_pounds, feels_amazing'
})
```

---

### Story 8: "Jenny's Therapy Breakthrough"

**Story:** Jenny's been in therapy for 6 months working on her childhood trauma. She used to have panic attacks daily. Now it's down to once a week. She's proud of her progress.

**Relations:**
```typescript
STRUGGLES_WITH(Jenny, panic_attacks, {
  category: 'mental_health',
  intensity: 'strong',
  used_to_be: 'daily',
  now: 'once_per_week',
  trying_to_change: true,
  progress: 'significant',
  feels: 'proud'
})

REGULARLY_DOES(Jenny, therapy, {
  frequency: 'weekly',
  since: '2024-05',
  importance: 'critical',
  focus: 'childhood_trauma',
  effectiveness: 'high'
})
```

---

### Story 9: "Carlos's Tech Startup"

**Story:** Carlos quit his corporate job to start a tech company. He's terrified he made the wrong decision and works 80 hours a week to make it succeed. His wife is worried about him.

**Relations:**
```typescript
USED_TO_BE(Carlos, corporate_employee, {
  category: 'profession',
  validTo: '2024-08',
  changed_to: 'startup_founder',
  decision_confidence: 'low'
})

IS(Carlos, startup_founder, {
  category: 'profession',
  since: '2024-08',
  hours_per_week: 80,
  stress_level: 'extreme'
})

FEARS(Carlos, made_wrong_decision, {
  category: 'career',
  intensity: 'very_strong',
  manifestation: 'working_80_hour_weeks',
  concerning_to: 'wife'
})

CARES_FOR(wife, Carlos, {
  care_type: 'emotional',
  level: 'worried',
  concern: 'overworking'
})
```

---

### Story 10: "Nina's Caregiver Fatigue"

**Story:** Nina takes care of her dad who has Alzheimer's. She quit her job to do it full-time. She's exhausted and depressed but won't put him in a facility. It's been 3 years.

**Relations:**
```typescript
CARES_FOR(Nina, father, {
  care_type: 'elderly_parent',
  level: 'full_time',
  condition: 'Alzheimers',
  since: '2022-01',
  duration: '3_years',
  impact: 'quit_job',
  status: 'exhausted'
})

STRUGGLES_WITH(Nina, caregiver_fatigue, {
  category: 'health',
  intensity: 'extreme',
  since: '2022-01',
  manifestations: ['exhaustion', 'depression'],
  refusing: 'facility_care'
})

BELIEVES(Nina, must_care_for_father_personally, {
  category: 'value',
  intensity: 'very_strong',
  manifestation: 'wont_put_in_facility',
  consequence: 'own_health_declining'
})
```

---

## 🎂 Birthday Handling: Field vs Relation?

**Question:** Should birthdays be a relation (HAS_IMPORTANT_DATE) or a field in the people table?

**Answer: BOTH!**

### Option 1: Birthday as Field (Recommended for Birthdays)

```typescript
// In people table
people = {
  id: UUID,
  name: string,
  dateOfBirth: timestamp,  // <-- Simple, queryable
  // ...
}

// Query upcoming birthdays
SELECT * FROM people
WHERE strftime('%m-%d', dateOfBirth) = strftime('%m-%d', 'now', '+7 days')
```

**Pros:**
- ✅ Fast queries
- ✅ Universal (everyone has one birthday)
- ✅ Simple indexing
- ✅ Built-in date functions

**Cons:**
- ❌ Only stores birth date, not context

### Option 2: Birthday as Relation (Use for Special Dates)

```typescript
HAS_IMPORTANT_DATE(Sarah, birthday, {
  date: '05-15',
  type: 'birthday',
  recurring: true,
  send_reminder: true,
  importance: 'critical',
  context: 'Goes ALL OUT for birthdays'
})
```

**Pros:**
- ✅ Can add rich context
- ✅ Can store HOW they celebrate
- ✅ Flexible metadata

**Cons:**
- ❌ More complex queries
- ❌ Duplicate data

### **RECOMMENDED HYBRID APPROACH:**

```typescript
// people table
people = {
  dateOfBirth: timestamp,  // For queries and age calculation
}

// relations table (optional enrichment)
HAS_IMPORTANT_DATE(person, birthday_celebration, {
  date: dateOfBirth,  // References the field
  type: 'birthday',
  celebration_style: 'elaborate_parties',
  importance: 'critical',
  preferences: {
    likes: ['homemade_cake', 'surprise_parties'],
    dislikes: ['public_singing'],
    traditions: ['family_dinner', 'specific_restaurant']
  }
})
```

**Use the relation for:**
- How they celebrate
- What they like/dislike about birthdays
- Birthday traditions
- Gift preferences
- Celebration style

**Use the field for:**
- Date storage
- Age calculation
- Reminder queries
- Calendar integration

---

## 🎯 Priority Rules for Conflicting Relations

### Rule 1: Explicit Boundaries Trump Everything

```typescript
if (person.UNCOMFORTABLE_WITH.includes(topic)) {
  return 'AVOID_COMPLETELY';
}
```

### Rule 2: Friendship Strength > Lifestyle Differences

```typescript
if (friendship.strength >= 0.9 && venue.accommodates_both) {
  return 'SEAT_TOGETHER';
}
```

### Rule 3: Critical Dependencies Must Be Honored

```typescript
if (person.DEPENDS_ON.level === 'critical') {
  return 'PLAN_AROUND_THIS';
}
```

### Rule 4: Fears & Triggers = Hard Constraints

```typescript
if (person.FEARS.intensity === 'very_strong' && event.contains_trigger) {
  return 'DONT_INVITE_OR_CHANGE_EVENT';
}
```

### Rule 5: Routines with high importance are non-negotiable

```typescript
if (person.REGULARLY_DOES.importance === 'critical' &&
    person.REGULARLY_DOES.disruption_impact === 'high') {
  return 'SCHEDULE_AROUND_THIS';
}
```

---

## 📊 Complex Scenario Matrix

| Scenario | Person 1 | Person 2 | Conflict | Resolution | Priority Logic |
|----------|----------|----------|----------|------------|----------------|
| **Meat vs Vegan** | Mark (meat lover) | Emma (vegan activist) | Dietary/ethical | Seat together, inclusive venue | Friendship (1.0) > Diet |
| **Alcoholic's Friend** | Tom (recovering) | Jake (used to drink) | Alcohol trigger | Jake stopped drinking | Support > Personal preference |
| **Busy Parents** | Lisa (single mom) | Nina (caregiver) | Both exhausted | Flexible scheduling | Accommodate both |
| **Sensory Sensitive** | David (bright lights) | Event at bright venue | Environment | Change venue or excuse David | Health > Convenience |

---

**This document serves as the comprehensive guide for understanding how relations work in practice with real human complexity.**
