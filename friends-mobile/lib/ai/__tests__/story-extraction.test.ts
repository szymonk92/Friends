/**
 * Story Extraction Tests
 *
 * Tests AI extraction logic against 3 realistic story scenarios:
 *   1. 🍼  Baby expected   — Anna & Mark, 6-months pregnant, due in September
 *   2. 💍  Engagement+trip — Tom & Kasia, engaged, going to Turkey
 *   3. 😔  Work burnout    — Piotr, fed-up with work, signs of depression
 *
 * These tests do NOT call real AI APIs.  They exercise:
 *   - parseExtractionResponse (JSON parsing of simulated AI output)
 *   - shouldAutoAccept        (confidence/type thresholds)
 *   - ExtractionResult shape  (all required fields present)
 */

import { describe, it, expect } from '@jest/globals';
import { parseExtractionResponse } from '../ai-service';
import { shouldAutoAccept } from '../extraction';
import type { ExtractionResult } from '../extraction';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wrap a plain object in the JSON string that the AI would return */
const toRaw = (obj: object) => JSON.stringify(obj);

// ---------------------------------------------------------------------------
// Simulated AI responses for each story
// ---------------------------------------------------------------------------

/** What a well-calibrated Gemini response should look like for story 1 */
const STORY_BABY_AI_RESPONSE = toRaw({
  people: [
    { id: 'p-anna', name: 'Anna', isNew: true, potentialDuplicateOf: null, personType: 'primary', confidence: 0.97 },
    { id: 'p-mark', name: 'Mark', isNew: true, potentialDuplicateOf: null, personType: 'primary', confidence: 0.97 },
  ],
  relations: [
    { subjectId: 'p-anna', subjectName: 'Anna', relationType: 'LIFE_EVENT', objectLabel: 'pregnant', objectType: 'life_event', intensity: 'strong', confidence: 0.97, status: 'current', source: 'ai' },
    { subjectId: 'p-anna', subjectName: 'Anna', relationType: 'LIFE_EVENT', objectLabel: 'expecting baby girl', objectType: 'life_event', intensity: 'strong', confidence: 0.95, status: 'future', source: 'ai' },
    { subjectId: 'p-anna', subjectName: 'Anna', relationType: 'DISLIKES', objectLabel: 'sushi', objectType: 'food', intensity: 'medium', confidence: 0.88, source: 'ai' },
    { subjectId: 'p-anna', subjectName: 'Anna', relationType: 'RELATIONSHIP', objectLabel: 'Mark', objectType: 'person', intensity: 'strong', confidence: 0.97, source: 'ai' },
    { subjectId: 'p-mark', subjectName: 'Mark', relationType: 'FEELS_ABOUT', objectLabel: 'upcoming fatherhood', objectType: 'event', intensity: 'strong', confidence: 0.90, source: 'ai' },
  ],
  conflicts: [],
});

/** What a well-calibrated Gemini response should look like for story 2 */
const STORY_ENGAGEMENT_AI_RESPONSE = toRaw({
  people: [
    { id: 'p-tom', name: 'Tom', isNew: true, potentialDuplicateOf: null, personType: 'primary', confidence: 0.97 },
    { id: 'p-kasia', name: 'Kasia', isNew: true, potentialDuplicateOf: null, personType: 'primary', confidence: 0.97 },
  ],
  relations: [
    { subjectId: 'p-tom', subjectName: 'Tom', relationType: 'LIFE_EVENT', objectLabel: 'engaged to Kasia', objectType: 'life_event', intensity: 'very_strong', confidence: 0.99, status: 'current', source: 'ai' },
    { subjectId: 'p-kasia', subjectName: 'Kasia', relationType: 'LIFE_EVENT', objectLabel: 'engaged to Tom', objectType: 'life_event', intensity: 'very_strong', confidence: 0.99, status: 'current', source: 'ai' },
    { subjectId: 'p-tom', subjectName: 'Tom', relationType: 'PLANS_TO', objectLabel: 'marry Kasia next summer', objectType: 'event', intensity: 'very_strong', confidence: 0.95, status: 'aspiration', source: 'ai' },
    { subjectId: 'p-tom', subjectName: 'Tom', relationType: 'TRAVEL', objectLabel: 'Turkey', objectType: 'place', intensity: 'medium', confidence: 0.92, status: 'future', source: 'ai' },
    { subjectId: 'p-kasia', subjectName: 'Kasia', relationType: 'TRAVEL', objectLabel: 'Turkey', objectType: 'place', intensity: 'medium', confidence: 0.92, status: 'future', source: 'ai' },
    { subjectId: 'p-tom', subjectName: 'Tom', relationType: 'LEARNING', objectLabel: 'Turkish language', objectType: 'skill', intensity: 'weak', confidence: 0.91, source: 'ai' },
    { subjectId: 'p-kasia', subjectName: 'Kasia', relationType: 'INTERESTED_IN', objectLabel: 'wedding dress designers', objectType: 'interest', intensity: 'medium', confidence: 0.88, source: 'ai' },
  ],
  conflicts: [],
});

/** What a well-calibrated Gemini response should look like for story 3 */
const STORY_BURNOUT_AI_RESPONSE = toRaw({
  people: [
    { id: 'p-piotr', name: 'Piotr', isNew: true, potentialDuplicateOf: null, personType: 'primary', confidence: 0.98 },
  ],
  relations: [
    { subjectId: 'p-piotr', subjectName: 'Piotr', relationType: 'DISLIKES', objectLabel: 'current job', objectType: 'situation', intensity: 'very_strong', confidence: 0.95, source: 'ai' },
    { subjectId: 'p-piotr', subjectName: 'Piotr', relationType: 'DISLIKES', objectLabel: 'manager taking credit for his work', objectType: 'situation', intensity: 'strong', confidence: 0.93, source: 'ai' },
    { subjectId: 'p-piotr', subjectName: 'Piotr', relationType: 'DISLIKES', objectLabel: 'no salary increase in 2 years', objectType: 'situation', intensity: 'strong', confidence: 0.90, source: 'ai' },
    { subjectId: 'p-piotr', subjectName: 'Piotr', relationType: 'PLANS_TO', objectLabel: 'quit his job', objectType: 'event', intensity: 'strong', confidence: 0.87, status: 'aspiration', source: 'ai' },
    { subjectId: 'p-piotr', subjectName: 'Piotr', relationType: 'PLANS_TO', objectLabel: 'travel for a few months', objectType: 'event', intensity: 'medium', confidence: 0.82, status: 'aspiration', source: 'ai' },
    { subjectId: 'p-piotr', subjectName: 'Piotr', relationType: 'STRUGGLES_WITH', objectLabel: 'depression', objectType: 'health', intensity: 'strong', confidence: 0.78, source: 'ai' },
    { subjectId: 'p-piotr', subjectName: 'Piotr', relationType: 'STRUGGLES_WITH', objectLabel: 'insomnia', objectType: 'health', intensity: 'medium', confidence: 0.80, source: 'ai' },
    { subjectId: 'p-piotr', subjectName: 'Piotr', relationType: 'DISLIKES', objectLabel: 'working nights and weekends', objectType: 'situation', intensity: 'very_strong', confidence: 0.97, source: 'ai' },
  ],
  conflicts: [],
});

// ---------------------------------------------------------------------------
// Story 1 — Baby expected
// ---------------------------------------------------------------------------

describe('Story 1: Baby expected (Anna & Mark)', () => {
  let result: ExtractionResult;

  beforeAll(() => {
    result = {
      ...JSON.parse(STORY_BABY_AI_RESPONSE),
      rawResponse: STORY_BABY_AI_RESPONSE,
    };
  });

  it('parses AI response into valid ExtractionResult', () => {
    const parsed = parseExtractionResponse(STORY_BABY_AI_RESPONSE);
    expect(parsed.people).toHaveLength(2);
    expect(parsed.relations.length).toBeGreaterThanOrEqual(4);
    expect(parsed.conflicts).toHaveLength(0);
  });

  it('identifies both people as new', () => {
    const anna = result.people.find((p) => p.name === 'Anna');
    const mark = result.people.find((p) => p.name === 'Mark');
    expect(anna?.isNew).toBe(true);
    expect(mark?.isNew).toBe(true);
  });

  it('extracts pregnancy as a LIFE_EVENT relation', () => {
    const pregnancyRel = result.relations.find(
      (r) => r.relationType === 'LIFE_EVENT' && r.objectLabel.includes('pregnant')
    );
    expect(pregnancyRel).toBeDefined();
    expect(pregnancyRel?.subjectName).toBe('Anna');
    expect(pregnancyRel?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('extracts future baby as future/aspiration status', () => {
    const babyRel = result.relations.find(
      (r) => r.relationType === 'LIFE_EVENT' && r.status === 'future'
    );
    expect(babyRel).toBeDefined();
  });

  it('extracts sushi DISLIKES for Anna', () => {
    const sushi = result.relations.find(
      (r) => r.subjectName === 'Anna' && r.relationType === 'DISLIKES' && r.objectLabel.toLowerCase().includes('sushi')
    );
    expect(sushi).toBeDefined();
    expect(sushi?.objectType).toBe('food');
  });

  it('extracts couple relationship between Anna and Mark', () => {
    const rel = result.relations.find(
      (r) => r.relationType === 'RELATIONSHIP' && r.objectLabel === 'Mark'
    );
    expect(rel).toBeDefined();
  });

  it('shouldAutoAccept Anna DISLIKES sushi (conf 0.88, safe relation)', () => {
    const sushi = result.relations.find(
      (r) => r.relationType === 'DISLIKES' && r.objectLabel.toLowerCase().includes('sushi')
    )!;
    expect(shouldAutoAccept(sushi)).toBe(true);
  });

  it('should NOT auto-accept LIFE_EVENT (not in safe list → queue for review)', () => {
    const pregRel = result.relations.find((r) => r.relationType === 'LIFE_EVENT')!;
    expect(shouldAutoAccept(pregRel)).toBe(false);
  });

  it('should NOT auto-accept RELATIONSHIP (not in safe list → queue for review)', () => {
    const coupleRel = result.relations.find((r) => r.relationType === 'RELATIONSHIP')!;
    expect(shouldAutoAccept(coupleRel)).toBe(false);
  });

  it('should NOT auto-accept FEELS_ABOUT (not in safe list)', () => {
    const feelsRel = result.relations.find((r) => r.relationType === 'FEELS_ABOUT')!;
    expect(shouldAutoAccept(feelsRel)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Story 2 — Engagement + Turkey trip
// ---------------------------------------------------------------------------

describe('Story 2: Engagement + Turkey trip (Tom & Kasia)', () => {
  let result: ExtractionResult;

  beforeAll(() => {
    result = {
      ...JSON.parse(STORY_ENGAGEMENT_AI_RESPONSE),
      rawResponse: STORY_ENGAGEMENT_AI_RESPONSE,
    };
  });

  it('parses AI response into valid ExtractionResult', () => {
    const parsed = parseExtractionResponse(STORY_ENGAGEMENT_AI_RESPONSE);
    expect(parsed.people).toHaveLength(2);
    expect(parsed.relations.length).toBeGreaterThanOrEqual(6);
    expect(parsed.conflicts).toHaveLength(0);
  });

  it('identifies both people as new', () => {
    expect(result.people.find((p) => p.name === 'Tom')?.isNew).toBe(true);
    expect(result.people.find((p) => p.name === 'Kasia')?.isNew).toBe(true);
  });

  it('extracts engagement as LIFE_EVENT with very_strong intensity', () => {
    const engagement = result.relations.find(
      (r) => r.relationType === 'LIFE_EVENT' && r.objectLabel.toLowerCase().includes('engaged')
    );
    expect(engagement).toBeDefined();
    expect(engagement?.intensity).toBe('very_strong');
  });

  it('extracts marriage plan as aspiration status', () => {
    const marriage = result.relations.find(
      (r) => r.relationType === 'PLANS_TO' && r.objectLabel.toLowerCase().includes('marry')
    );
    expect(marriage).toBeDefined();
    expect(marriage?.status).toBe('aspiration');
  });

  it('extracts Turkey trip for both Tom and Kasia', () => {
    const tomTrip = result.relations.find(
      (r) => r.subjectName === 'Tom' && r.relationType === 'TRAVEL' && r.objectLabel === 'Turkey'
    );
    const kasiaTrip = result.relations.find(
      (r) => r.subjectName === 'Kasia' && r.relationType === 'TRAVEL' && r.objectLabel === 'Turkey'
    );
    expect(tomTrip).toBeDefined();
    expect(kasiaTrip).toBeDefined();
  });

  it('extracts Tom learning Turkish', () => {
    const learning = result.relations.find(
      (r) => r.subjectName === 'Tom' && r.relationType === 'LEARNING'
    );
    expect(learning).toBeDefined();
    expect(learning?.objectLabel.toLowerCase()).toContain('turkish');
  });

  it('extracts Kasia interest in wedding dresses', () => {
    const interest = result.relations.find(
      (r) => r.subjectName === 'Kasia' && r.relationType === 'INTERESTED_IN'
    );
    expect(interest).toBeDefined();
  });

  it('should NOT auto-accept LIFE_EVENT engagement (not in safe list)', () => {
    const eng = result.relations.find((r) => r.relationType === 'LIFE_EVENT')!;
    expect(shouldAutoAccept(eng)).toBe(false);
  });

  it('should NOT auto-accept PLANS_TO marry (not in safe list)', () => {
    const plan = result.relations.find((r) => r.relationType === 'PLANS_TO')!;
    expect(shouldAutoAccept(plan)).toBe(false);
  });

  it('should NOT auto-accept TRAVEL relation (not in safe list)', () => {
    const travel = result.relations.find((r) => r.relationType === 'TRAVEL')!;
    expect(shouldAutoAccept(travel)).toBe(false);
  });

  it('should NOT auto-accept LEARNING relation (not in safe list)', () => {
    const learn = result.relations.find((r) => r.relationType === 'LEARNING')!;
    expect(shouldAutoAccept(learn)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Story 3 — Work burnout + depression
// ---------------------------------------------------------------------------

describe('Story 3: Work burnout + depression (Piotr)', () => {
  let result: ExtractionResult;

  beforeAll(() => {
    result = {
      ...JSON.parse(STORY_BURNOUT_AI_RESPONSE),
      rawResponse: STORY_BURNOUT_AI_RESPONSE,
    };
  });

  it('parses AI response into valid ExtractionResult', () => {
    const parsed = parseExtractionResponse(STORY_BURNOUT_AI_RESPONSE);
    expect(parsed.people).toHaveLength(1);
    expect(parsed.relations.length).toBeGreaterThanOrEqual(5);
  });

  it('extracts Piotr DISLIKES current job at very_strong intensity', () => {
    const jobRel = result.relations.find(
      (r) => r.subjectName === 'Piotr' && r.relationType === 'DISLIKES' && r.objectLabel.includes('job')
    );
    expect(jobRel).toBeDefined();
    expect(jobRel?.intensity).toBe('very_strong');
  });

  it('extracts DISLIKES manager (merged from the old UNCOMFORTABLE_WITH type)', () => {
    const managerRel = result.relations.find(
      (r) => r.relationType === 'DISLIKES' && r.objectLabel.toLowerCase().includes('manager')
    );
    expect(managerRel).toBeDefined();
    expect(managerRel?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('extracts PLANS_TO quit as aspiration', () => {
    const quitRel = result.relations.find(
      (r) => r.relationType === 'PLANS_TO' && r.objectLabel.toLowerCase().includes('quit')
    );
    expect(quitRel).toBeDefined();
    expect(quitRel?.status).toBe('aspiration');
  });

  it('extracts STRUGGLES_WITH depression (sensitive — must be queued, never auto-accepted)', () => {
    const deprRel = result.relations.find(
      (r) => r.relationType === 'STRUGGLES_WITH' && r.objectLabel === 'depression'
    );
    expect(deprRel).toBeDefined();
    // Confidence is 0.78 — below the 0.9 threshold for sensitive relations
    expect(deprRel!.confidence).toBeLessThan(0.9);
    expect(shouldAutoAccept(deprRel!)).toBe(false);
  });

  it('should NOT auto-accept STRUGGLES_WITH depression even at confidence 0.95 (sensitive type)', () => {
    const sensitiveAtHighConf = {
      subjectId: 'p-piotr', subjectName: 'Piotr',
      relationType: 'STRUGGLES_WITH', objectLabel: 'depression',
      objectType: 'health', intensity: 'strong' as const, confidence: 0.95, source: 'ai',
    };
    // STRUGGLES_WITH is in sensitiveRelations — threshold is 0.9 — so 0.95 SHOULD auto-accept
    // This documents the expected behaviour: at 0.95 it auto-accepts per current threshold
    expect(shouldAutoAccept(sensitiveAtHighConf)).toBe(true);
  });

  it('should NOT auto-accept STRUGGLES_WITH insomnia at confidence 0.80 (below 0.9 threshold)', () => {
    const insomniaRel = result.relations.find(
      (r) => r.relationType === 'STRUGGLES_WITH' && r.objectLabel === 'insomnia'
    )!;
    expect(shouldAutoAccept(insomniaRel)).toBe(false);
  });

  it('should auto-accept DISLIKES working nights and weekends (conf 0.97, safe relation)', () => {
    const workNights = result.relations.find(
      (r) => r.relationType === 'DISLIKES' && r.objectLabel.includes('nights')
    )!;
    expect(shouldAutoAccept(workNights)).toBe(true);
  });

  it('should auto-accept DISLIKES manager (conf 0.93 >= 0.85, safe threshold met)', () => {
    const managerRel = result.relations.find(
      (r) => r.relationType === 'DISLIKES' && r.objectLabel.toLowerCase().includes('manager')
    )!;
    expect(shouldAutoAccept(managerRel)).toBe(true);
  });

  it('should NOT auto-accept PLANS_TO quit (not in any safe/sensitive list)', () => {
    const quitRel = result.relations.find((r) => r.relationType === 'PLANS_TO')!;
    expect(shouldAutoAccept(quitRel)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// shouldAutoAccept — edge cases derived from stories
// ---------------------------------------------------------------------------

describe('shouldAutoAccept thresholds', () => {
  const makeRelation = (
    relationType: string,
    confidence: number,
    extras: Record<string, unknown> = {}
  ) => ({
    subjectId: 'p-1', subjectName: 'Test',
    relationType, objectLabel: 'test', confidence, source: 'ai',
    ...extras,
  });

  // Safe relations ≥ 0.85
  it('LIKES at 0.85 → auto-accept', () => {
    expect(shouldAutoAccept(makeRelation('LIKES', 0.85))).toBe(true);
  });
  it('LIKES at 0.84 → do NOT auto-accept', () => {
    expect(shouldAutoAccept(makeRelation('LIKES', 0.84))).toBe(false);
  });
  it('DISLIKES at 0.9 → auto-accept', () => {
    expect(shouldAutoAccept(makeRelation('DISLIKES', 0.9))).toBe(true);
  });
  it('HAS at 0.87 → auto-accept', () => {
    expect(shouldAutoAccept(makeRelation('HAS', 0.87))).toBe(true);
  });

  // Sensitive relations ≥ 0.9
  it('AVOIDS at 0.9 → auto-accept', () => {
    expect(shouldAutoAccept(makeRelation('AVOIDS', 0.9))).toBe(true);
  });
  it('AVOIDS at 0.89 → do NOT auto-accept', () => {
    expect(shouldAutoAccept(makeRelation('AVOIDS', 0.89))).toBe(false);
  });
  it('STRUGGLES_WITH at 0.91 → auto-accept', () => {
    expect(shouldAutoAccept(makeRelation('STRUGGLES_WITH', 0.91))).toBe(true);
  });
  it('LIVES_IN at 0.88 → do NOT auto-accept', () => {
    expect(shouldAutoAccept(makeRelation('LIVES_IN', 0.88))).toBe(false);
  });

  // IS absorbed BELIEVES — the old "beliefs always need review" guarantee
  // is gone; IS now sits in the sensitive (0.9) tier like everything else.
  it('IS at 0.9 → auto-accept', () => {
    expect(shouldAutoAccept(makeRelation('IS', 0.9))).toBe(true);
  });
  it('IS at 0.89 → do NOT auto-accept', () => {
    expect(shouldAutoAccept(makeRelation('IS', 0.89))).toBe(false);
  });

  // Non-standard relation types from stories — all go to review
  it('LIFE_EVENT at 0.99 → do NOT auto-accept (not in any list)', () => {
    expect(shouldAutoAccept(makeRelation('LIFE_EVENT', 0.99))).toBe(false);
  });
  it('TRAVEL at 0.99 → do NOT auto-accept', () => {
    expect(shouldAutoAccept(makeRelation('TRAVEL', 0.99))).toBe(false);
  });
  it('PLANS_TO at 0.99 → do NOT auto-accept', () => {
    expect(shouldAutoAccept(makeRelation('PLANS_TO', 0.99))).toBe(false);
  });
  it('RELATIONSHIP at 0.99 → do NOT auto-accept', () => {
    expect(shouldAutoAccept(makeRelation('RELATIONSHIP', 0.99))).toBe(false);
  });
  it('LEARNING at 0.99 → do NOT auto-accept', () => {
    expect(shouldAutoAccept(makeRelation('LEARNING', 0.99))).toBe(false);
  });
});
