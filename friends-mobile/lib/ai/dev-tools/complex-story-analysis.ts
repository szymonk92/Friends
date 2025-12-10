/**
 * Complex Story Test Case - Edge Cases & Ambiguity
 * This tests: duplicate names, cross-references, conflicting info, temporal changes
 */

import { createPromptV2 as _createPromptV2 } from './prompt-variants';
import { createExtractionPrompt as _createExtractionPrompt } from '../prompts';

// Existing database state
const _existingPeople = [
  { id: 'sarah-001', name: 'Sarah Miller' },
  { id: 'mike-002', name: 'Mike Thompson' },
  { id: 'sarah-003', name: 'Sarah Chen' },
  { id: 'tom-004', name: 'Tom Wilson' },
];

const _existingRelations = [
  {
    relationType: 'LIKES',
    objectLabel: 'sushi',
    subjectId: 'sarah-001',
    subjectName: 'Sarah Miller',
  },
  {
    relationType: 'IS',
    objectLabel: 'vegetarian',
    subjectId: 'sarah-003',
    subjectName: 'Sarah Chen',
  },
  {
    relationType: 'LIKES',
    objectLabel: 'hiking',
    subjectId: 'mike-002',
    subjectName: 'Mike Thompson',
  },
  {
    relationType: 'SENSITIVE_TO',
    objectLabel: 'peanuts',
    subjectId: 'tom-004',
    subjectName: 'Tom Wilson',
  },
  {
    relationType: 'LIKES',
    objectLabel: 'Thai food',
    subjectId: 'tom-004',
    subjectName: 'Tom Wilson',
  },
];

// The complex story
const _complexStory = `
Last weekend was wild. Sarah (Mike's girlfriend) organized a surprise party for Tom at the new Thai place downtown.
She knows Tom loves Thai food. Mike brought his sister Sarah who just flew in from Boston - she's the one studying
medicine at Harvard.

Here's where it got complicated: Mike's sister Sarah mentioned she recently went vegan after watching some documentary.
But then she ordered the Pad Thai with tofu, which Tom warned her has peanuts in it. She said she's fine with peanuts,
it's her brother Mike who has the severe peanut allergy - not Tom! I always thought Tom was allergic.

Tom's ex-girlfriend Sarah (different Sarah, the one who works at Google) showed up unexpectedly. She brought her new
boyfriend, also named Mike (Mike Rodriguez, not Mike Thompson). This Mike is a professional chef who specializes in
French cuisine and he's definitely not vegan - he was talking about his famous beef bourguignon recipe.

Original Sarah (Mike Thompson's girlfriend) got upset because she'd been planning this party for weeks and didn't
want any drama. She stress-ate a whole plate of spring rolls, which surprised me because I thought she was on that
strict keto diet she started last month.

The funniest part: Tom mentioned he's actually giving up Thai food because he's training for a marathon and his
nutritionist said it's too high in sodium. He's now really into meal prepping bland chicken and rice. Sarah Chen
(the vegetarian one, different from all the other Sarahs) was there too and offered to share her vegetarian meal
prep recipes with him.

Oh, and Mike Thompson finally admitted he's terrified of dogs, which is awkward because his girlfriend Sarah just
adopted a golden retriever last week.
`;

// console.log('=== COMPLEX STORY ANALYSIS ===\n');
// console.log('STORY:');
// console.log(complexStory);
// console.log('\n=== CHALLENGES IDENTIFIED ===\n');

const challenges = [
  {
    type: 'DUPLICATE NAMES - SARAH',
    instances: [
      "Sarah Miller (mike-002's girlfriend, ID: sarah-001)",
      'Sarah Chen (vegetarian, ID: sarah-003)',
      "Mike Thompson's sister Sarah (NEW - studying medicine at Harvard)",
      "Tom's ex-girlfriend Sarah (NEW - works at Google)",
    ],
    problem: '4 different Sarahs! Need context clues to distinguish them.',
    solution:
      'Use relationship context: "Mike\'s girlfriend", "Mike\'s sister", "Tom\'s ex", profession/location hints',
  },
  {
    type: 'DUPLICATE NAMES - MIKE',
    instances: [
      'Mike Thompson (ID: mike-002)',
      "Mike Rodriguez (NEW - chef, Sarah's new boyfriend)",
    ],
    problem: '2 Mikes with different professions and relationships',
    solution: 'Full name when available, otherwise relationship context',
  },
  {
    type: 'CONFLICTING INFORMATION',
    cases: [
      {
        conflict: 'Who has peanut allergy?',
        existing: 'Tom Wilson: SENSITIVE_TO peanuts',
        newInfo: 'Story says Mike Thompson has peanut allergy, NOT Tom',
        confidence: 0.85,
        recommendation: 'Flag for user review - contradicts existing data',
      },
      {
        conflict: "Tom's food preferences changing",
        existing: 'Tom Wilson: LIKES Thai food',
        newInfo: 'Tom is giving up Thai food for marathon training',
        confidence: 0.9,
        recommendation: 'Mark old relation as PAST, add new preference',
      },
      {
        conflict: 'Sarah Miller diet inconsistency',
        newInfo: 'Was on keto but ate spring rolls (high carb)',
        confidence: 0.75,
        recommendation: 'Could be diet ended, or lapse - flag for review',
      },
    ],
  },
  {
    type: 'INFERRED RELATIONSHIPS',
    inferences: [
      {
        relation: 'Sarah Miller KNOWS Tom Wilson',
        evidence: 'Organized his party, knows his food preferences',
        confidence: 0.95,
      },
      {
        relation: "Mike Thompson's sister Sarah IS vegan",
        evidence: 'Explicitly stated "went vegan"',
        confidence: 0.95,
      },
      {
        relation: 'Mike Rodriguez HAS_SKILL French cuisine',
        evidence: '"professional chef who specializes in French cuisine"',
        confidence: 0.95,
      },
      {
        relation: 'Mike Thompson FEARS dogs',
        evidence: '"finally admitted he\'s terrified of dogs"',
        confidence: 0.95,
      },
      {
        relation: 'Sarah Miller OWNS golden retriever',
        evidence: '"just adopted a golden retriever last week"',
        confidence: 0.9,
      },
    ],
  },
];

challenges.forEach((challenge) => {
  // console.log(`### ${challenge.type} ###`);
  if (challenge.instances) {
    // console.log('Instances:');
    challenge.instances.forEach((_i) => {
      // console.log(`  - ${_i}`);
    });
  }
  if (challenge.cases) {
    challenge.cases.forEach((c) => {
      // console.log(`\nConflict: ${c.conflict}`);
      if (c.existing) {
        // console.log(`  Existing: ${c.existing}`);
      }
      // console.log(`  New Info: ${c.newInfo}`);
      // console.log(`  Confidence: ${c.confidence}`);
      // console.log(`  Recommendation: ${c.recommendation}`);
    });
  }
  if (challenge.inferences) {
    // console.log('Inferences:');
    challenge.inferences.forEach((_inf) => {
      // console.log(`  - ${_inf.relation}`);
      // console.log(`    Evidence: ${_inf.evidence}`);
      // console.log(`    Confidence: ${_inf.confidence}`);
    });
  }
  if (challenge.problem) {
    // console.log(`Problem: ${challenge.problem}`);
  }
  if (challenge.solution) {
    // console.log(`Solution: ${challenge.solution}`);
  }
  // console.log('');
});

// console.log('=== EXPECTED EXTRACTION OUTPUT ===\n');

const _expectedOutput = {
  people: [
    // Existing people (matched)
    {
      id: 'sarah-001',
      name: 'Sarah Miller',
      isNew: false,
      personType: 'primary',
      confidence: 0.95,
      context: "Mike Thompson's girlfriend, party organizer",
    },
    {
      id: 'mike-002',
      name: 'Mike Thompson',
      isNew: false,
      personType: 'primary',
      confidence: 1.0,
      context: "Sarah Miller's boyfriend, has sister",
    },
    {
      id: 'sarah-003',
      name: 'Sarah Chen',
      isNew: false,
      personType: 'mentioned',
      confidence: 0.9,
      context: 'The vegetarian one',
    },
    {
      id: 'tom-004',
      name: 'Tom Wilson',
      isNew: false,
      personType: 'primary',
      confidence: 1.0,
      context: 'Party was for him',
    },

    // New people
    {
      id: 'NEW-sarah-sister',
      name: 'Sarah Thompson',
      isNew: true,
      personType: 'mentioned',
      confidence: 0.85,
      context: "Mike Thompson's sister, Harvard med student",
      potentialDuplicateOf: null,
    },
    {
      id: 'NEW-sarah-ex',
      name: "Sarah (Tom's ex)",
      isNew: true,
      personType: 'mentioned',
      confidence: 0.8,
      context: "Tom's ex-girlfriend, works at Google",
      potentialDuplicateOf: 'sarah-001 OR sarah-003 - NEEDS REVIEW',
    },
    {
      id: 'NEW-mike-chef',
      name: 'Mike Rodriguez',
      isNew: true,
      personType: 'mentioned',
      confidence: 0.9,
      context: "Professional chef, Sarah (Tom's ex) boyfriend",
    },
  ],
  relations: [
    // Sarah Miller (sarah-001)
    {
      subjectId: 'sarah-001',
      subjectName: 'Sarah Miller',
      relationType: 'KNOWS',
      objectLabel: 'Tom Wilson',
      intensity: 'strong',
      confidence: 0.95,
      category: 'person',
    },
    {
      subjectId: 'sarah-001',
      subjectName: 'Sarah Miller',
      relationType: 'OWNS',
      objectLabel: 'golden retriever',
      intensity: 'strong',
      confidence: 0.9,
      category: 'pet',
    },
    {
      subjectId: 'sarah-001',
      subjectName: 'Sarah Miller',
      relationType: 'USED_TO_BE',
      objectLabel: 'on keto diet',
      intensity: 'medium',
      confidence: 0.75,
      category: 'diet',
      status: 'past',
    },

    // Mike Thompson (mike-002)
    {
      subjectId: 'mike-002',
      subjectName: 'Mike Thompson',
      relationType: 'SENSITIVE_TO',
      objectLabel: 'peanuts',
      intensity: 'very_strong',
      confidence: 0.85,
      category: 'allergy',
    },
    {
      subjectId: 'mike-002',
      subjectName: 'Mike Thompson',
      relationType: 'FEARS',
      objectLabel: 'dogs',
      intensity: 'strong',
      confidence: 0.95,
      category: 'phobia',
    },
    {
      subjectId: 'mike-002',
      subjectName: 'Mike Thompson',
      relationType: 'KNOWS',
      objectLabel: 'Sarah Miller',
      intensity: 'very_strong',
      confidence: 1.0,
      category: 'person',
    },

    // Tom Wilson (tom-004)
    {
      subjectId: 'tom-004',
      subjectName: 'Tom Wilson',
      relationType: 'USED_TO_BE',
      objectLabel: 'Thai food lover',
      intensity: 'strong',
      confidence: 0.9,
      category: 'food',
      status: 'past',
    },
    {
      subjectId: 'tom-004',
      subjectName: 'Tom Wilson',
      relationType: 'REGULARLY_DOES',
      objectLabel: 'marathon training',
      intensity: 'strong',
      confidence: 0.9,
      category: 'activity',
    },
    {
      subjectId: 'tom-004',
      subjectName: 'Tom Wilson',
      relationType: 'LIKES',
      objectLabel: 'bland chicken and rice meal prep',
      intensity: 'medium',
      confidence: 0.8,
      category: 'food',
    },

    // Sarah Thompson (NEW - sister)
    {
      subjectId: 'NEW-sarah-sister',
      subjectName: 'Sarah Thompson',
      relationType: 'IS',
      objectLabel: 'vegan',
      intensity: 'strong',
      confidence: 0.95,
      category: 'diet',
    },
    {
      subjectId: 'NEW-sarah-sister',
      subjectName: 'Sarah Thompson',
      relationType: 'IS',
      objectLabel: 'medical student at Harvard',
      intensity: 'strong',
      confidence: 0.95,
      category: 'education',
    },
    {
      subjectId: 'NEW-sarah-sister',
      subjectName: 'Sarah Thompson',
      relationType: 'KNOWS',
      objectLabel: 'Mike Thompson',
      intensity: 'very_strong',
      confidence: 1.0,
      category: 'person',
    },

    // Mike Rodriguez (NEW - chef)
    {
      subjectId: 'NEW-mike-chef',
      subjectName: 'Mike Rodriguez',
      relationType: 'IS',
      objectLabel: 'professional chef',
      intensity: 'strong',
      confidence: 0.95,
      category: 'profession',
    },
    {
      subjectId: 'NEW-mike-chef',
      subjectName: 'Mike Rodriguez',
      relationType: 'HAS_SKILL',
      objectLabel: 'French cuisine',
      intensity: 'strong',
      confidence: 0.95,
      category: 'cooking',
    },
    {
      subjectId: 'NEW-mike-chef',
      subjectName: 'Mike Rodriguez',
      relationType: 'DISLIKES',
      objectLabel: 'vegan diet',
      intensity: 'medium',
      confidence: 0.7,
      category: 'diet',
    },
  ],
  conflicts: [
    {
      type: 'direct_contradiction',
      description: 'Peanut allergy attribution conflict',
      existingInfo: 'Tom Wilson was marked as SENSITIVE_TO peanuts',
      newInfo: 'Story explicitly states Mike Thompson has the peanut allergy, not Tom',
      reasoning:
        'Story says "it\'s her brother Mike who has the severe peanut allergy - not Tom! I always thought Tom was allergic" - directly corrects previous assumption',
      severity: 'HIGH',
      recommendation: "REQUIRES USER REVIEW: Remove Tom's peanut sensitivity, add Mike's instead",
      confidence: 0.85,
    },
    {
      type: 'temporal_update',
      description: 'Tom Wilson food preference change',
      existingInfo: 'Tom Wilson LIKES Thai food',
      newInfo: 'Tom is giving up Thai food due to marathon training',
      reasoning: 'Nutritionist advice for marathon training led to dietary change',
      severity: 'MEDIUM',
      recommendation: 'Mark existing LIKES Thai food as status=past, add new preference',
      confidence: 0.9,
    },
    {
      type: 'lifestyle_conflict',
      description: 'Mike Thompson fears dogs but girlfriend has dog',
      existingInfo: 'None',
      newInfo: 'Mike FEARS dogs + Sarah Miller OWNS golden retriever',
      reasoning: 'This is a noted interpersonal tension, not a data conflict',
      severity: 'LOW',
      recommendation: 'Store both facts, this is real-world complexity not data error',
      confidence: 0.95,
    },
    {
      type: 'potential_duplicate',
      description: "Sarah (Tom's ex) may match existing Sarah",
      existingInfo: 'Sarah Miller (sarah-001) or Sarah Chen (sarah-003)',
      newInfo: 'New Sarah who works at Google and dated Tom',
      reasoning: "We have limited info about existing Sarahs' dating history",
      severity: 'MEDIUM',
      recommendation: 'Create as new person but flag potential duplicate for user review',
      confidence: 0.7,
    },
  ],
};

// console.log(JSON.stringify(expectedOutput, null, 2));

// console.log('\n=== RECOMMENDED ACTIONS ===\n');

const _actions = [
  {
    priority: 'HIGH',
    action: 'Review peanut allergy conflict',
    reason: 'Medical information must be accurate',
    userPrompt:
      'Story says Mike Thompson has peanut allergy, not Tom Wilson. We have Tom marked as allergic. Which is correct?',
  },
  {
    priority: 'HIGH',
    action: 'Disambiguate duplicate people',
    reason: 'Multiple Sarahs and Mikes - need to maintain separate profiles',
    userPrompt:
      "We found 4 different Sarahs mentioned. Please confirm: Sarah Miller (girlfriend), Sarah Chen (vegetarian), Sarah Thompson (Mike's sister), Sarah from Google (Tom's ex). Are these all different people?",
  },
  {
    priority: 'MEDIUM',
    action: 'Update temporal relations',
    reason: "Tom's preferences changed - need to preserve history",
    implementation:
      'Set old LIKES Thai food to status=past, validTo=now. Add new preferences with status=current',
  },
  {
    priority: 'LOW',
    action: 'Add new people with context',
    reason: 'New people need full context for future deduplication',
    implementation:
      'Store extraction context: "Mike Thompson\'s sister Sarah" to distinguish from other Sarahs',
  },
];

_actions.forEach((_action) => {
  // console.log(`[${_action.priority}] ${_action.action}`);
  // console.log(`  Reason: ${_action.reason}`);
  if (_action.userPrompt) {
    // console.log(`  Ask User: "${_action.userPrompt}"`);
  }
  if (_action.implementation) {
    // console.log(`  Implementation: ${_action.implementation}`);
  }
  // console.log('');
});

// console.log('=== KEY INSIGHTS FOR SYSTEM DESIGN ===\n');

const _insights = [
  '1. CONTEXT IS KING: "Sarah" alone is ambiguous. Need relationship context (whose girlfriend/sister/ex)',
  '2. CONTRADICTIONS HAPPEN: Real conversations correct previous assumptions. System must handle gracefully.',
  '3. TEMPORAL TRACKING: Preferences change. "Used to like" vs "currently likes" must be distinguished.',
  '4. CONFIDENCE SCORING: High confidence (0.9+) for explicit statements, lower (0.7-0.8) for inferences.',
  '5. USER REVIEW QUEUE: Some decisions (medical info corrections) MUST have human verification.',
  '6. DUPLICATE SCORING: Same name ≠ same person. Use multiple signals: relationship, profession, location.',
  "7. RELATIONSHIP MAPPING: Person-to-person connections help disambiguate (Mike's sister ≠ Mike's girlfriend)",
];

_insights.forEach((_insight) => {
  // console.log(_insight);
});

// console.log('\n=== SYSTEM RECOMMENDATIONS ===\n');

// console.log('1. ADD "DISAMBIGUATION CONTEXT" FIELD');
// console.log('   Store: "Mike Thompson\'s sister" with the person record');
// console.log('   Helps future extraction match the right person\n');

// console.log('2. IMPLEMENT CONFLICT RESOLUTION QUEUE');
// console.log('   High-severity conflicts (medical info) → Require user approval');
// console.log('   Medium-severity (preference changes) → Auto-accept with notification');
// console.log('   Low-severity (lifestyle observations) → Auto-accept silently\n');

// console.log('3. ADD RELATIONSHIP HISTORY');
// console.log('   Track: "Tom dated Sarah (Google)" as past relationship');
// console.log('   Helps contextualize future mentions\n');

// console.log('4. USE COMPOUND IDENTIFIERS');
// console.log('   Instead of just "Sarah", store "Sarah Miller (Mike Thompson\'s girlfriend)"');
// console.log('   Makes disambiguation explicit\n');

// console.log('5. CONFIDENCE THRESHOLDS');
// console.log('   0.95+ → Auto-accept');
// console.log('   0.85-0.95 → Auto-accept with audit log');
// console.log('   0.70-0.85 → Queue for review');
// console.log('   <0.70 → Reject or require immediate clarification\n');
