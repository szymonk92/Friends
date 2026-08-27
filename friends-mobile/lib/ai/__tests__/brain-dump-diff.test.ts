import { describe, it, expect } from '@jest/globals';
import { diffBrainDump, type ExistingPersonState } from '../brain-dump-diff';
import type { BrainDumpResult } from '../brain-dump';

const empty: BrainDumpResult = {
  socialHandles: [],
  languages: [],
  attributes: [],
  mentionedOthers: [],
};

const make = (overrides: Partial<BrainDumpResult>): BrainDumpResult => ({
  ...empty,
  ...overrides,
});

describe('diffBrainDump', () => {
  describe('empty state', () => {
    it('classifies all proposed values as NEW when no existing data', () => {
      const result = make({
        metLocation: 'Chile',
        homeLocation: 'United Kingdom',
        partnerName: 'Tom',
        languages: ['English', 'Polish'],
        attributes: [
          { relationType: 'IS', objectLabel: 'student', confidence: 0.9, assertion: 'asserted' },
        ],
      });
      const diff = diffBrainDump(result, {});
      expect(diff.metLocation?.class).toBe('NEW');
      expect(diff.homeLocation?.class).toBe('NEW');
      expect(diff.partner?.class).toBe('NEW');
      expect(diff.languages.every((l) => l.class === 'NEW')).toBe(true);
      expect(diff.attributes[0].class).toBe('NEW');
      expect(diff.summary.new).toBe(6);
      expect(diff.summary.update).toBe(0);
    });
  });

  describe('idempotency', () => {
    it('classifies all proposed values as MATCH when re-applying the same data', () => {
      const result = make({
        metLocation: 'Chile',
        homeLocation: 'London',
        partnerName: 'Tom',
        languages: ['English'],
        attributes: [
          { relationType: 'IS', objectLabel: 'doctor', confidence: 0.9, assertion: 'asserted' },
        ],
      });
      const existing: ExistingPersonState = {
        metLocation: 'Chile',
        homeLocation: 'London',
        languages: ['English'],
        activePartner: { id: 'c1', partnerName: 'Tom' },
        attributes: [
          { id: 'r1', relationType: 'IS', objectLabel: 'doctor' },
        ],
      };
      const diff = diffBrainDump(result, existing);
      expect(diff.metLocation?.class).toBe('MATCH');
      expect(diff.homeLocation?.class).toBe('MATCH');
      expect(diff.partner?.class).toBe('MATCH');
      expect(diff.languages[0].class).toBe('MATCH');
      expect(diff.attributes[0].class).toBe('MATCH');
      expect(diff.summary.match).toBe(5);
      expect(diff.summary.update).toBe(0);
      expect(diff.summary.new).toBe(0);
    });

    it('is case-insensitive on string equality', () => {
      const diff = diffBrainDump(make({ homeLocation: 'london' }), {
        homeLocation: 'London',
      });
      expect(diff.homeLocation?.class).toBe('MATCH');
    });
  });

  describe('moved cities', () => {
    it('classifies a different homeLocation as UPDATE, not overwrite', () => {
      const diff = diffBrainDump(make({ homeLocation: 'Berlin' }), {
        homeLocation: 'London',
      });
      expect(diff.homeLocation?.class).toBe('UPDATE');
      expect(diff.homeLocation?.existing).toBe('London');
      expect(diff.homeLocation?.proposed).toBe('Berlin');
    });
  });

  describe('partner change', () => {
    it('flags new partner name as UPDATE with explicit "will end" reason', () => {
      const diff = diffBrainDump(make({ partnerName: 'Mark' }), {
        activePartner: { id: 'c1', partnerName: 'Tom' },
      });
      expect(diff.partner?.class).toBe('UPDATE');
      expect(diff.partner?.reason).toMatch(/will end/i);
    });

    it('treats same partner name as MATCH (case-insensitive)', () => {
      const diff = diffBrainDump(make({ partnerName: 'tom' }), {
        activePartner: { id: 'c1', partnerName: 'Tom' },
      });
      expect(diff.partner?.class).toBe('MATCH');
    });
  });

  describe('contradictions', () => {
    it('detects LIKES vs DISLIKES on same object', () => {
      const diff = diffBrainDump(
        make({
          attributes: [
            { relationType: 'DISLIKES', objectLabel: 'pasta', confidence: 0.9, assertion: 'asserted' },
          ],
        }),
        {
          attributes: [
            { id: 'r1', relationType: 'LIKES', objectLabel: 'pasta' },
          ],
        }
      );
      expect(diff.attributes[0].class).toBe('CONFLICT');
    });

    it('detects single ↔ married contradiction (IS predicate)', () => {
      const diff = diffBrainDump(
        make({
          attributes: [
            { relationType: 'IS', objectLabel: 'single', confidence: 0.9, assertion: 'asserted' },
          ],
        }),
        {
          attributes: [
            { id: 'r1', relationType: 'IS', objectLabel: 'married to Tom' },
          ],
        }
      );
      expect(diff.attributes[0].class).toBe('CONFLICT');
    });
  });

  describe('soft updates on relations', () => {
    it('flags same relation type with overlapping label as UPDATE', () => {
      const diff = diffBrainDump(
        make({
          attributes: [
            { relationType: 'CAN', objectLabel: 'studied chemistry', confidence: 0.9, assertion: 'asserted' },
          ],
        }),
        {
          attributes: [
            { id: 'r1', relationType: 'CAN', objectLabel: 'studied biology' },
          ],
        }
      );
      expect(diff.attributes[0].class).toBe('UPDATE');
    });

    it('treats unrelated objects on same relation type as NEW (not all CAN clashes)', () => {
      const diff = diffBrainDump(
        make({
          attributes: [
            { relationType: 'CAN', objectLabel: 'plays piano', confidence: 0.9, assertion: 'asserted' },
          ],
        }),
        {
          attributes: [
            { id: 'r1', relationType: 'CAN', objectLabel: 'speaks Polish' },
          ],
        }
      );
      expect(diff.attributes[0].class).toBe('NEW');
    });
  });

  describe('socials', () => {
    it('NEW for a brand-new platform', () => {
      const diff = diffBrainDump(
        make({
          socialHandles: [{ platform: 'instagram', handle: '@agata.x' }],
        }),
        { socialLinks: [] }
      );
      expect(diff.socials[0].class).toBe('NEW');
    });

    it('MATCH for same platform same handle', () => {
      const diff = diffBrainDump(
        make({
          socialHandles: [{ platform: 'instagram', handle: '@agata.x' }],
        }),
        { socialLinks: [{ platform: 'instagram', handle: '@agata.x' }] }
      );
      expect(diff.socials[0].class).toBe('MATCH');
    });

    it('UPDATE for same platform different handle (changed username)', () => {
      const diff = diffBrainDump(
        make({
          socialHandles: [{ platform: 'instagram', handle: '@agata.new' }],
        }),
        { socialLinks: [{ platform: 'instagram', handle: '@agata.x' }] }
      );
      expect(diff.socials[0].class).toBe('UPDATE');
    });
  });

  describe('summary counts', () => {
    it('counts each diff class accurately', () => {
      const diff = diffBrainDump(
        make({
          metLocation: 'Chile',                          // NEW
          homeLocation: 'Berlin',                        // UPDATE
          languages: ['English', 'Polish'],              // 1 MATCH, 1 NEW
          attributes: [
            { relationType: 'IS', objectLabel: 'single', confidence: 0.8, assertion: 'asserted' }, // CONFLICT
          ],
        }),
        {
          homeLocation: 'London',
          languages: ['English'],
          attributes: [{ id: 'r1', relationType: 'IS', objectLabel: 'married to Tom' }],
        }
      );
      expect(diff.summary.new).toBe(2);     // metLocation + Polish
      expect(diff.summary.match).toBe(1);   // English
      expect(diff.summary.update).toBe(1);  // homeLocation
      expect(diff.summary.conflict).toBe(1);
    });
  });
});
