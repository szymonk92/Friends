/**
 * AI Prompt Testing Script
 * Run this to evaluate different prompt variants
 */

import {
  createPromptV1,
  createPromptV2,
  createPromptV3,
  createPromptV4,
  testCases,
  evaluateExtraction,
} from './prompt-variants';
import { createExtractionPrompt } from '../prompts';

// interface TestResult {
//   promptVersion: string;
//   testCase: string;
//   passed: boolean;
//   issues: string[];
//   tokenCount: number;
//   parseSuccess: boolean;
//   rawOutput?: string;
// }

/**
 * Estimate token count (rough approximation)
 */
function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4);
}

/**
 * Test all prompt variants without calling the API
 * This generates the prompts and checks they're well-formed
 */
export function testPromptGeneration(): void {
  // console.log('=== PROMPT GENERATION TEST ===\n');

  const promptGenerators = [
    { name: 'Original (comprehensive)', fn: createExtractionPrompt },
    { name: 'V1 (concise)', fn: createPromptV1 },
    { name: 'V2 (chain-of-thought)', fn: createPromptV2 },
    { name: 'V3 (few-shot)', fn: createPromptV3 },
    { name: 'V4 (structured)', fn: createPromptV4 },
  ];

  const testContext = {
    existingPeople: [
      { id: 'john-123', name: 'John Smith' },
      { id: 'sarah-456', name: 'Sarah Johnson' },
    ],
    existingRelations: [
      {
        relationType: 'LIKES',
        objectLabel: 'coffee',
        subjectId: 'john-123',
        subjectName: 'John Smith',
      },
      {
        relationType: 'IS',
        objectLabel: 'vegetarian',
        subjectId: 'sarah-456',
        subjectName: 'Sarah Johnson',
      },
    ],
    storyText:
      'Met up with John at the new Italian place. He ordered the margherita pizza and loved it. Sarah joined us later - she mentioned she started doing yoga and is trying to cut down on sugar.',
  };

  for (const generator of promptGenerators) {
    const prompt = generator.fn(testContext);
    const _tokenCount = estimateTokens(prompt);

    // console.log(`${generator.name}:`);
    // console.log(`  Token estimate: ${_tokenCount}`);
    // console.log(`  Prompt length: ${prompt.length} chars`);
    // console.log(`  Has JSON schema: ${prompt.includes('"people"') && prompt.includes('"relations"')}`);
    // console.log(`  Mentions conflicts: ${prompt.toLowerCase().includes('conflict')}`);
    // console.log(`  Has relation types: ${prompt.includes('LIKES') && prompt.includes('DISLIKES')}`);
    // console.log('');
  }

  // Token efficiency comparison
  // console.log('=== TOKEN EFFICIENCY RANKING ===\n');
  const rankings = promptGenerators
    .map((g) => ({
      name: g.name,
      tokens: estimateTokens(g.fn(testContext)),
    }))
    .sort((a, b) => a.tokens - b.tokens);

  rankings.forEach((_r, _i) => {
    // console.log(`${_i + 1}. ${_r.name}: ~${_r.tokens} tokens`);
  });
}

/**
 * Simulate AI responses for testing (mock responses)
 * In production, these would come from actual API calls
 */
export const mockResponses: Record<string, any> = {
  'Simple likes/dislikes': {
    people: [
      { id: 'john-123', name: 'John Smith', isNew: false, personType: 'primary', confidence: 1.0 },
    ],
    relations: [
      {
        subjectId: 'john-123',
        subjectName: 'John Smith',
        relationType: 'LIKES',
        objectLabel: 'carrots',
        intensity: 'strong',
        confidence: 0.9,
        category: 'food',
      },
      {
        subjectId: 'john-123',
        subjectName: 'John Smith',
        relationType: 'DISLIKES',
        objectLabel: 'broccoli',
        intensity: 'very_strong',
        confidence: 0.95,
        category: 'food',
      },
      {
        subjectId: 'john-123',
        subjectName: 'John Smith',
        relationType: 'REGULARLY_DOES',
        objectLabel: 'running every morning',
        intensity: 'medium',
        confidence: 0.85,
        category: 'activity',
      },
    ],
    conflicts: [],
  },
  'Dietary conflict detection': {
    people: [
      { id: 'sarah-456', name: 'Sarah', isNew: false, personType: 'primary', confidence: 1.0 },
    ],
    relations: [
      {
        subjectId: 'sarah-456',
        subjectName: 'Sarah',
        relationType: 'IS',
        objectLabel: 'vegan',
        intensity: 'strong',
        confidence: 0.95,
        category: 'diet',
      },
    ],
    conflicts: [
      {
        type: 'dietary_conflict',
        description: 'Sarah is vegan but previously liked cheese pizza',
        reasoning: 'Vegans do not consume dairy products, and cheese pizza contains cheese (dairy)',
      },
    ],
  },
  'Ingredient conflict': {
    people: [
      { id: 'mike-789', name: 'Mike', isNew: false, personType: 'primary', confidence: 1.0 },
    ],
    relations: [
      {
        subjectId: 'mike-789',
        subjectName: 'Mike',
        relationType: 'SENSITIVE_TO',
        objectLabel: 'potatoes',
        intensity: 'strong',
        confidence: 0.9,
        category: 'allergy',
      },
    ],
    conflicts: [
      {
        type: 'ingredient_conflict',
        description: 'Mike is allergic to potatoes but likes french fries',
        reasoning: 'French fries are made from potatoes, which Mike is allergic to',
      },
    ],
  },
  'Multiple people extraction': {
    people: [
      { id: 'emma-new-001', name: 'Emma', isNew: true, personType: 'primary', confidence: 0.95 },
      { id: 'tom-new-002', name: 'Tom', isNew: true, personType: 'mentioned', confidence: 0.9 },
    ],
    relations: [
      {
        subjectId: 'emma-new-001',
        subjectName: 'Emma',
        relationType: 'IS',
        objectLabel: 'software engineer',
        intensity: 'strong',
        confidence: 0.95,
        category: 'profession',
      },
      {
        subjectId: 'emma-new-001',
        subjectName: 'Emma',
        relationType: 'KNOWS',
        objectLabel: 'Tom',
        intensity: 'strong',
        confidence: 0.9,
        category: 'person',
      },
      {
        subjectId: 'emma-new-001',
        subjectName: 'Emma',
        relationType: 'LIKES',
        objectLabel: 'traveling',
        intensity: 'strong',
        confidence: 0.85,
        category: 'activity',
      },
      {
        subjectId: 'tom-new-002',
        subjectName: 'Tom',
        relationType: 'IS',
        objectLabel: 'chef',
        intensity: 'strong',
        confidence: 0.95,
        category: 'profession',
      },
      {
        subjectId: 'tom-new-002',
        subjectName: 'Tom',
        relationType: 'HAS_SKILL',
        objectLabel: 'Italian cuisine',
        intensity: 'strong',
        confidence: 0.9,
        category: 'cooking',
      },
      {
        subjectId: 'tom-new-002',
        subjectName: 'Tom',
        relationType: 'LIKES',
        objectLabel: 'traveling',
        intensity: 'strong',
        confidence: 0.85,
        category: 'activity',
      },
    ],
    conflicts: [],
  },
  'Complex traits and fears': {
    people: [
      { id: 'lisa-111', name: 'Lisa', isNew: false, personType: 'primary', confidence: 1.0 },
    ],
    relations: [
      {
        subjectId: 'lisa-111',
        subjectName: 'Lisa',
        relationType: 'STRUGGLES_WITH',
        objectLabel: 'anxiety',
        intensity: 'medium',
        confidence: 0.9,
        category: 'mental_health',
      },
      {
        subjectId: 'lisa-111',
        subjectName: 'Lisa',
        relationType: 'FEARS',
        objectLabel: 'flying',
        intensity: 'strong',
        confidence: 0.95,
        category: 'phobia',
      },
      {
        subjectId: 'lisa-111',
        subjectName: 'Lisa',
        relationType: 'WANTS_TO_ACHIEVE',
        objectLabel: 'visit Japan',
        intensity: 'strong',
        confidence: 0.85,
        category: 'travel',
      },
    ],
    conflicts: [],
  },
};

/**
 * Run evaluation with mock responses
 */
export function runMockEvaluation(): void {
  // console.log('\n=== MOCK EVALUATION RESULTS ===\n');

  for (const testCase of testCases) {
    const mockResponse = mockResponses[testCase.name];
    if (!mockResponse) {
      // console.log(`No mock response for: ${testCase.name}`);
      continue;
    }

    const evaluation = evaluateExtraction(mockResponse, testCase);

    // console.log(`Test: ${testCase.name}`);
    // console.log(`  Story: "${testCase.story.substring(0, 60)}..."`);
    // console.log(`  Passed: ${evaluation.passed ? 'YES' : 'NO'}`);
    if (!evaluation.passed) {
      evaluation.issues.forEach((_issue) => {
        // console.log(`    - ${_issue}`);
      });
    }
    // console.log('');
  }
}

/**
 * Generate report comparing prompt versions
 */
export function generateComparisonReport(): string {
  const report: string[] = [
    '# AI Prompt Variant Comparison Report\n',
    '## Summary\n',
    'This report compares different AI prompt strategies for extracting relationship data from stories.\n',
  ];

  const testContext = {
    existingPeople: [{ id: 'john-123', name: 'John Smith' }],
    existingRelations: [
      {
        relationType: 'LIKES',
        objectLabel: 'coffee',
        subjectId: 'john-123',
        subjectName: 'John Smith',
      },
    ],
    storyText: 'John loves carrots but hates broccoli. He started running every morning.',
  };

  const variants = [
    {
      name: 'Original',
      fn: createExtractionPrompt,
      description: 'Comprehensive with detailed conflict detection instructions',
    },
    {
      name: 'V1 Concise',
      fn: createPromptV1,
      description: 'Minimal instructions, lowest token count',
    },
    {
      name: 'V2 Chain-of-Thought',
      fn: createPromptV2,
      description: 'Step-by-step reasoning, good for complex scenarios',
    },
    {
      name: 'V3 Few-Shot',
      fn: createPromptV3,
      description: 'Learns from examples, consistent formatting',
    },
    {
      name: 'V4 Structured',
      fn: createPromptV4,
      description: 'Strict schema definition, easy parsing',
    },
  ];

  report.push('## Prompt Variants\n');

  for (const variant of variants) {
    const prompt = variant.fn(testContext);
    const tokens = estimateTokens(prompt);

    report.push(`### ${variant.name}\n`);
    report.push(`**Description:** ${variant.description}\n`);
    report.push(`**Token Estimate:** ~${tokens} tokens\n`);
    report.push(`**Character Count:** ${prompt.length}\n`);
    report.push('\n---\n');
  }

  report.push('## Recommendations\n');
  report.push('1. **For cost efficiency:** Use V1 (Concise) - lowest token usage\n');
  report.push('2. **For accuracy:** Use V2 (Chain-of-Thought) or Original - explicit reasoning\n');
  report.push('3. **For consistency:** Use V3 (Few-Shot) - learns from examples\n');
  report.push('4. **For parsing reliability:** Use V4 (Structured) - strict schema\n');
  report.push('\n## Best Practice\n');
  report.push(
    'Start with V1 for simple stories, upgrade to V2/Original for complex conflict detection.\n'
  );

  return report.join('');
}

// Run tests when this file is executed directly
if (typeof window === 'undefined') {
  testPromptGeneration();
  runMockEvaluation();
  // console.log('\n' + generateComparisonReport());
}
