import type { BrainDumpAttribute, BrainDumpResult } from './brain-dump';
import type { SocialLink } from '@/lib/social/socialLinks';

/**
 * Classification for each fact extracted by the brain-dump.
 *   NEW       — no prior value on file
 *   MATCH     — already known; safe to ignore
 *   UPDATE    — prior value differs; could be a real change OR a correction
 *   CONFLICT  — logically inconsistent with prior value (e.g. "single" ↔ "married to Tom")
 */
export type DiffClass = 'NEW' | 'MATCH' | 'UPDATE' | 'CONFLICT';

export type FieldDiff<T> = {
  class: DiffClass;
  proposed: T;
  existing?: T;
  /** Optional human-readable note for the UI */
  reason?: string;
};

export type AttributeDiff = {
  class: DiffClass;
  proposed: BrainDumpAttribute;
  /** The matching existing relation, if class !== NEW */
  existingRelation?: ExistingRelationLike;
  reason?: string;
};

/** Minimal shape we need from the relations table. */
export type ExistingRelationLike = {
  id: string;
  relationType: string;
  objectLabel: string;
  status?: string | null;
};

/** Minimal shape we need from a connection row. */
export type ExistingConnectionLike = {
  id: string;
  partnerName: string;
  status?: string | null;
};

/** The current state we diff a brain-dump against. */
export type ExistingPersonState = {
  metLocation?: string | null;
  metDate?: Date | string | null;
  homeLocation?: string | null;
  phone?: string | null;
  email?: string | null;
  socialLinks?: SocialLink[];
  languages?: string[];
  /** Active partner connection (if any) — name resolved from connections + people */
  activePartner?: ExistingConnectionLike;
  /** Attributes already on file as `relations` rows */
  attributes?: ExistingRelationLike[];
};

export type BrainDumpDiff = {
  metLocation?: FieldDiff<string>;
  metDate?: FieldDiff<string>;
  homeLocation?: FieldDiff<string>;
  phone?: FieldDiff<string>;
  email?: FieldDiff<string>;
  partner?: FieldDiff<string>;
  socials: FieldDiff<SocialLink>[];
  languages: FieldDiff<string>[];
  attributes: AttributeDiff[];
  /** Names of other people the AI noticed but didn't attribute facts to. */
  mentionedOthers: string[];
  /** Counts for the UI summary line */
  summary: {
    new: number;
    match: number;
    update: number;
    conflict: number;
  };
};

/* ----- helpers ----- */

const norm = (v: string | null | undefined) => v?.trim().toLowerCase() ?? '';

function classifyString(
  proposed: string | undefined,
  existing: string | null | undefined
): FieldDiff<string> | undefined {
  if (!proposed) return undefined;
  if (!existing || !existing.trim()) {
    return { class: 'NEW', proposed };
  }
  if (norm(proposed) === norm(existing)) {
    return { class: 'MATCH', proposed, existing };
  }
  return {
    class: 'UPDATE',
    proposed,
    existing,
    reason: `Currently on file: "${existing}"`,
  };
}

function classifyDate(
  proposed: string | undefined,
  existing: Date | string | null | undefined
): FieldDiff<string> | undefined {
  if (!proposed) return undefined;
  if (!existing) return { class: 'NEW', proposed };
  const existingStr =
    existing instanceof Date ? existing.toISOString().split('T')[0] : String(existing);
  return classifyString(proposed, existingStr);
}

function classifySocial(
  proposed: SocialLink,
  existing: SocialLink[] = []
): FieldDiff<SocialLink> {
  const matchSamePlatformSameHandle = existing.find(
    (e) =>
      e.platform === proposed.platform && norm(e.handle) === norm(proposed.handle)
  );
  if (matchSamePlatformSameHandle) {
    return { class: 'MATCH', proposed, existing: matchSamePlatformSameHandle };
  }
  const samePlatformDifferentHandle = existing.find(
    (e) => e.platform === proposed.platform
  );
  if (samePlatformDifferentHandle) {
    return {
      class: 'UPDATE',
      proposed,
      existing: samePlatformDifferentHandle,
      reason: `Currently: ${samePlatformDifferentHandle.handle}`,
    };
  }
  return { class: 'NEW', proposed };
}

function classifyLanguage(
  proposed: string,
  existing: string[] = []
): FieldDiff<string> {
  const exists = existing.some((e) => norm(e) === norm(proposed));
  return exists
    ? { class: 'MATCH', proposed, existing: proposed }
    : { class: 'NEW', proposed };
}

function classifyPartner(
  proposed: string | undefined,
  active: ExistingConnectionLike | undefined
): FieldDiff<string> | undefined {
  if (!proposed) return undefined;
  if (!active) return { class: 'NEW', proposed };
  if (norm(active.partnerName) === norm(proposed)) {
    return { class: 'MATCH', proposed, existing: active.partnerName };
  }
  // Different name — UPDATE means: end old, create new. The UI must surface this.
  return {
    class: 'UPDATE',
    proposed,
    existing: active.partnerName,
    reason: `Currently partnered with "${active.partnerName}". Accepting will end that connection.`,
  };
}

function classifyAttribute(
  proposed: BrainDumpAttribute,
  existing: ExistingRelationLike[] = []
): AttributeDiff {
  const exact = existing.find(
    (e) =>
      e.relationType === proposed.relationType && norm(e.objectLabel) === norm(proposed.objectLabel)
  );
  if (exact) return { class: 'MATCH', proposed, existingRelation: exact };

  // Conflict heuristics — opposite predicates
  const conflict = findContradiction(proposed, existing);
  if (conflict) {
    return {
      class: 'CONFLICT',
      proposed,
      existingRelation: conflict,
      reason: `Conflicts with: ${conflict.relationType} "${conflict.objectLabel}"`,
    };
  }

  // Soft-update: same relation type + similar object (e.g. studied subject) — flag as UPDATE
  const softUpdate = existing.find(
    (e) =>
      e.relationType === proposed.relationType &&
      sharesStem(proposed.objectLabel, e.objectLabel)
  );
  if (softUpdate) {
    return {
      class: 'UPDATE',
      proposed,
      existingRelation: softUpdate,
      reason: `Existing: "${softUpdate.objectLabel}"`,
    };
  }

  return { class: 'NEW', proposed };
}

const OPPOSING_PAIRS: Array<readonly [string, string]> = [
  ['LIKES', 'DISLIKES'],
  ['DISLIKES', 'LIKES'],
];

function findContradiction(
  proposed: BrainDumpAttribute,
  existing: ExistingRelationLike[]
): ExistingRelationLike | undefined {
  // Direct opposite predicate over same object (LIKES pasta vs DISLIKES pasta)
  for (const e of existing) {
    for (const [a, b] of OPPOSING_PAIRS) {
      if (proposed.relationType === a && e.relationType === b && norm(proposed.objectLabel) === norm(e.objectLabel)) {
        return e;
      }
    }
  }
  // IS-state contradiction — naive: "is single" vs "is married"
  if (proposed.relationType === 'IS' && /\bsingle\b/i.test(proposed.objectLabel)) {
    const married = existing.find(
      (e) => e.relationType === 'IS' && /\bmarried\b/i.test(e.objectLabel)
    );
    if (married) return married;
  }
  if (proposed.relationType === 'IS' && /\bmarried\b/i.test(proposed.objectLabel)) {
    const single = existing.find(
      (e) => e.relationType === 'IS' && /\bsingle\b/i.test(e.objectLabel)
    );
    if (single) return single;
  }
  return undefined;
}

function sharesStem(a: string, b: string): boolean {
  // Very rough: do the first 4 chars of a non-trivial token overlap?
  const tokensA = a.toLowerCase().split(/\s+/).filter((t) => t.length >= 4);
  const tokensB = b.toLowerCase().split(/\s+/).filter((t) => t.length >= 4);
  for (const ta of tokensA) {
    for (const tb of tokensB) {
      if (ta.slice(0, 4) === tb.slice(0, 4)) return true;
    }
  }
  return false;
}

/* ----- main entry point ----- */

export function diffBrainDump(
  result: BrainDumpResult,
  existing: ExistingPersonState = {}
): BrainDumpDiff {
  const metLocation = classifyString(result.metLocation, existing.metLocation);
  const metDate = classifyDate(result.metDate, existing.metDate ?? null);
  const homeLocation = classifyString(result.homeLocation, existing.homeLocation);
  const phone = classifyString(result.phone, existing.phone);
  const email = classifyString(result.email, existing.email);
  const partner = classifyPartner(result.partnerName, existing.activePartner);

  const socials = result.socialHandles.map((s) => classifySocial(s, existing.socialLinks));
  const languages = result.languages.map((l) => classifyLanguage(l, existing.languages));
  const attributes = result.attributes.map((a) =>
    classifyAttribute(a, existing.attributes)
  );

  const candidates: Array<{ class: DiffClass } | undefined> = [
    metLocation,
    metDate,
    homeLocation,
    phone,
    email,
    partner,
    ...socials,
    ...languages,
    ...attributes,
  ];
  const all = candidates.filter((x): x is { class: DiffClass } => !!x);

  const summary = {
    new: all.filter((x) => x.class === 'NEW').length,
    match: all.filter((x) => x.class === 'MATCH').length,
    update: all.filter((x) => x.class === 'UPDATE').length,
    conflict: all.filter((x) => x.class === 'CONFLICT').length,
  };

  return {
    metLocation,
    metDate,
    homeLocation,
    phone,
    email,
    partner,
    socials,
    languages,
    attributes,
    mentionedOthers: [], // populated by extractor in a follow-up; placeholder for now
    summary,
  };
}
