/**
 * Brain-dump golden corpus.
 *
 * Each case has:
 *   - `note`              the free-text brain-dump
 *   - `personName`        the target (so the AI knows which person)
 *   - `existing?`         optional prior state to test diff classification
 *   - `expected.fields`   patterns the result must contain on each field
 *   - `expected.attributesIncludeAny?` substrings — at least one attribute label must contain each
 *   - `expected.attributesIncludeAll?` substrings — every attribute label must contain one of these
 *   - `expected.diffClass?`           expected diff class for selected fields (idempotency, conflicts, updates)
 *   - `expected.mustNotMention?`      strings forbidden in any field (catches misattribution)
 *
 * Run with: lib/ai/dev-tools/run-brain-dump-tests.ts
 */

import type { BrainDumpResult } from '../brain-dump';
import type { ExistingPersonState, DiffClass } from '../brain-dump-diff';

export type FieldKey =
  | 'metLocation'
  | 'metDate'
  | 'homeLocation'
  | 'phone'
  | 'email'
  | 'partnerName';

export type DiffExpectation = Partial<Record<FieldKey, DiffClass>>;

export type CorpusCase = {
  id: string;
  description: string;
  category:
    | 'baseline'
    | 'idempotency'
    | 'update'
    | 'partner-change'
    | 'misattribution'
    | 'multilingual'
    | 'conflict'
    | 'sparse';
  note: string;
  personName: string;
  existing?: ExistingPersonState;
  expected: {
    fields?: Partial<Record<FieldKey, RegExp>>;
    socialPlatforms?: string[];
    languagesIncludeAny?: string[];
    attributesIncludeAny?: string[];
    attributesIncludeAll?: string[];
    minAttributes?: number;
    maxAttributes?: number;
    diffClass?: DiffExpectation;
    mustNotMention?: string[];
    mentionedOthersIncludeAny?: string[];
  };
};

export const BRAIN_DUMP_CORPUS: CorpusCase[] = [
  /* ───────────────────────── baseline ───────────────────────── */
  {
    id: 'agata-baseline',
    category: 'baseline',
    description: "Original Agata note — meets/lives/partner/parents/dad's campervan/IG",
    personName: 'Agata',
    note: `Met Agata + her partner Tom in Chile during W-trek. Couple from UK, travelled
a lot, met partner in Vietnam years ago. Agata studied in London, parents are
both doctors, dad has a campervan. Instagram @agata.x`,
    expected: {
      fields: {
        metLocation: /chile|w[-\s]?trek/i,
        homeLocation: /uk|united kingdom|england|britain/i,
        partnerName: /^tom$/i,
      },
      socialPlatforms: ['instagram'],
      attributesIncludeAny: ['london', 'doctor', 'campervan'],
      minAttributes: 3,
      mustNotMention: ['Tom is', 'Tom\'s'], // Tom-facts must NOT be on Agata
    },
  },

  /* ───────────────────────── idempotency ───────────────────────── */
  {
    id: 'agata-rerun-after-apply',
    category: 'idempotency',
    description: 'Same note re-extracted with everything already on file → all MATCH',
    personName: 'Agata',
    note: `Met Agata in Chile. She lives in London. Her partner is Tom.`,
    existing: {
      metLocation: 'Chile',
      homeLocation: 'London',
      activePartner: { id: 'c1', partnerName: 'Tom' },
    },
    expected: {
      diffClass: { metLocation: 'MATCH', homeLocation: 'MATCH', partnerName: 'MATCH' },
    },
  },

  /* ───────────────────────── updates ───────────────────────── */
  {
    id: 'agata-moved-to-berlin',
    category: 'update',
    description: 'Agata moved cities — should be UPDATE not silent overwrite',
    personName: 'Agata',
    note: 'Talked to Agata yesterday — she moved to Berlin last month for a new job.',
    existing: { homeLocation: 'London' },
    expected: {
      fields: { homeLocation: /berlin/i },
      diffClass: { homeLocation: 'UPDATE' },
    },
  },

  {
    id: 'agata-changed-instagram',
    category: 'update',
    description: 'Same platform, new handle → UPDATE on socials (handled at apply time)',
    personName: 'Agata',
    note: 'Agata changed her Instagram, now @agata.travels.',
    existing: { socialLinks: [{ platform: 'instagram', handle: '@agata.x' }] },
    expected: {
      socialPlatforms: ['instagram'],
    },
  },

  /* ───────────────────────── partner change ───────────────────────── */
  {
    id: 'agata-broke-up-with-tom-now-with-mark',
    category: 'partner-change',
    description: 'Tom → Mark — must NOT keep Tom as partner; must surface as UPDATE',
    personName: 'Agata',
    note: `Agata and Tom split last year. She's now with Mark — they met at a wedding in Krakow.`,
    existing: { activePartner: { id: 'c1', partnerName: 'Tom' } },
    expected: {
      fields: { partnerName: /^mark$/i },
      diffClass: { partnerName: 'UPDATE' },
    },
  },

  {
    id: 'agata-now-single-no-partner',
    category: 'partner-change',
    description: 'Broke up with Tom, currently single — partnerName should NOT be set',
    personName: 'Agata',
    note: `Agata broke up with Tom recently. She's taking a break from dating.`,
    existing: { activePartner: { id: 'c1', partnerName: 'Tom' } },
    expected: {
      fields: { partnerName: undefined as unknown as RegExp }, // assert absence in runner
      attributesIncludeAny: ['ex', 'broke up', 'single'],
    },
  },

  /* ───────────────────────── misattribution traps ───────────────────────── */
  {
    id: 'note-mentions-others',
    category: 'misattribution',
    description:
      "Note about Agata also mentions Lucy and Tom doing things — those facts must NOT land on Agata",
    personName: 'Agata',
    note: `Saw Agata for coffee. Tom was busy at the gym. Lucy just got promoted at her bank.
Agata is excited about her new pottery class.`,
    expected: {
      attributesIncludeAny: ['pottery'],
      mustNotMention: ['Tom', 'Lucy', 'gym', 'bank', 'promoted'],
      mentionedOthersIncludeAny: ['Tom', 'Lucy'],
    },
  },

  {
    id: 'family-fact-stays-on-target',
    category: 'misattribution',
    description: '"Her dad has a campervan" stays as ONE attribute on Agata, not a new dad person',
    personName: 'Agata',
    note: 'Agata told me her dad has a campervan and her mom is a paediatrician.',
    expected: {
      attributesIncludeAll: ['father', 'dad', 'campervan', 'mom', 'mother', 'paediatrician', 'doctor'],
      minAttributes: 2,
    },
  },

  /* ───────────────────────── multilingual ───────────────────────── */
  {
    id: 'polish-note-about-agata',
    category: 'multilingual',
    description: 'Note in Polish — extraction must still produce English-keyed JSON',
    personName: 'Agata',
    note: `Poznałem Agatę w Chile. Mieszka w Londynie, jej partner to Tom. Studiowała w Londynie,
rodzice są lekarzami. Mówi po polsku i angielsku.`,
    expected: {
      fields: {
        metLocation: /chile/i,
        homeLocation: /london|londyn/i,
        partnerName: /^tom$/i,
      },
      languagesIncludeAny: ['polish', 'english'],
      attributesIncludeAny: ['doctor', 'studied'],
    },
  },

  /* ───────────────────────── conflicts ───────────────────────── */
  {
    id: 'vegan-vs-steak-on-agata',
    category: 'conflict',
    description: 'Agata says she is vegan, but the note also says she eats steak',
    personName: 'Agata',
    note: 'Agata told me she is strict vegan but I saw her order a rare steak last weekend.',
    existing: {
      attributes: [{ id: 'r1', relationType: 'IS', objectLabel: 'vegan' }],
    },
    expected: {
      attributesIncludeAny: ['vegan', 'steak'],
    },
  },

  /* ───────────────────────── sparse / off-topic ───────────────────────── */
  {
    id: 'sparse-greeting',
    category: 'sparse',
    description: 'Almost no extractable info → minimal output, no hallucination',
    personName: 'Agata',
    note: 'Saw Agata briefly — she said hi.',
    expected: {
      maxAttributes: 1,
      mustNotMention: ['London', 'Tom', 'doctor'],
    },
  },
];

/**
 * Helper for tests: assert that a result contains all of `needles` somewhere
 * in attribute objectLabels (case-insensitive substring match).
 */
export function attributesIncludeAny(result: BrainDumpResult, needles: string[]): boolean {
  const haystack = result.attributes.map((a) => a.objectLabel.toLowerCase()).join(' ⏎ ');
  return needles.some((n) => haystack.includes(n.toLowerCase()));
}

export function attributesIncludeAll(result: BrainDumpResult, needles: string[]): boolean {
  const haystack = result.attributes.map((a) => a.objectLabel.toLowerCase()).join(' ⏎ ');
  return needles.every((n) => haystack.includes(n.toLowerCase()));
}

/**
 * Quick text dump used for "mustNotMention" checks. Joins every string field
 * the AI returned so we can assert that, e.g. "Tom" never appears in Agata's facts.
 */
export function flattenForbiddenSearch(result: BrainDumpResult): string {
  return [
    result.metLocation,
    result.metDate,
    result.homeLocation,
    result.phone,
    result.email,
    result.partnerName,
    result.notesSummary,
    ...result.socialHandles.map((s) => `${s.platform}:${s.handle}`),
    ...result.languages,
    ...result.attributes.map((a) => `${a.relationType}:${a.objectLabel}`),
  ]
    .filter(Boolean)
    .join(' ⏎ ')
    .toLowerCase();
}
