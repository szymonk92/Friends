import { callAI, parseExtractionResponse, type AIServiceConfig } from './ai-service';
import type { SocialLink, SocialPlatform } from '@/lib/social/socialLinks';

// LIVES_IN is deliberately excluded — current residence is already a
// top-level structured field (homeLocation), not a free-form attribute.
export const BRAIN_DUMP_RELATION_TYPES = [
  'IS',
  'CAN',
  'HAS',
  'LIKES',
  'DISLIKES',
  'AVOIDS',
  'WANTS',
  'STRUGGLES_WITH',
  'DOES',
  'KNOWS',
  'DID',
] as const;

export type BrainDumpRelationType = (typeof BRAIN_DUMP_RELATION_TYPES)[number];

export const BRAIN_DUMP_ASSERTION_TYPES = [
  'asserted',
  'speculation',
  'reported',
  'aspiration',
] as const;

export type BrainDumpAssertion = (typeof BRAIN_DUMP_ASSERTION_TYPES)[number];

export type BrainDumpAttribute = {
  relationType: BrainDumpRelationType;
  objectLabel: string;
  confidence: number; // 0..1
  assertion: BrainDumpAssertion;
};

export type BrainDumpResult = {
  metLocation?: string;
  metDate?: string; // YYYY | YYYY-MM | YYYY-MM-DD
  homeLocation?: string;
  phone?: string;
  email?: string;
  partnerName?: string;
  socialHandles: SocialLink[];
  languages: string[];
  attributes: BrainDumpAttribute[];
  /** Other people the AI noticed in the text but did NOT attribute facts to. */
  mentionedOthers: string[];
  notesSummary?: string;
};

const SYSTEM = `You extract structured personal-CRM facts from a free-text note about ONE specific named person (the TARGET).
Return ONLY valid JSON matching the schema. No prose, no markdown.
If a field is not clearly present in the text, omit it (or use an empty array). NEVER invent.
Confidence is a number from 0 to 1 reflecting how strongly the text supports the fact.
Dates may be partial: prefer "YYYY", "YYYY-MM", or "YYYY-MM-DD".

Schema:
{
  "metLocation": string?,
  "metDate":    string?,
  "homeLocation": string?,
  "phone": string?,
  "email": string?,
  "partnerName": string?,
  "socialHandles": [
    { "platform": "instagram"|"facebook"|"tiktok"|"twitter"|"linkedin"|"threads"|"other",
      "handle": string,
      "url": string?
    }
  ],
  "languages": [string],
  "attributes": [
    { "relationType": "IS"|"CAN"|"HAS"|"LIKES"|"DISLIKES"|"AVOIDS"|"WANTS"|"STRUGGLES_WITH"|"DOES"|"KNOWS"|"DID",
      "objectLabel": string,
      "confidence": number,
      "assertion": "asserted"|"speculation"|"reported"|"aspiration"
    }
  ],
  "mentionedOthers": [string],
  "notesSummary": string?
}

EXTRACTION CHECKLIST — scan the note in this order before writing the JSON:
1. Any @handle, IG/TW/LinkedIn/FB/TikTok reference, or URL? → socialHandles
2. Where did I (the note-taker) meet the TARGET? → metLocation
3. Where does the TARGET live, come from, or is based? → homeLocation
4. Is a romantic partner named? ("couple", "partner", "boyfriend", "girlfriend", "husband", "wife", "fiancé") → partnerName
5. Any date, year, or relative time reference? → metDate
6. Any named person besides the TARGET? → mentionedOthers (minimum)
7. Remaining facts → attributes (use the most specific relationType possible)

ATTRIBUTE RELATION TYPES — use the MOST specific one:
- IS          identity, role, trait, or belief: "is a doctor", "is Polish", "parents are doctors"
- CAN         ability, skill, or education: "studied biology in London", "speaks French", "is a programmer"
- HAS         possession or physical trait: "has a campervan", "owns a flat", "has a dog named Rex", "wears glasses"
- LIKES       enjoyment / preference: "loves hiking", "is into jazz"
- DISLIKES    aversion that's a taste, not a rule: "hates flying", "dislikes crowds"
- AVOIDS      a hard rule, not a taste — allergy, diet, sobriety, ethics, or policy: "allergic to nuts", "vegan", "doesn't drink"
- WANTS       goal / ambition: "wants to move to Berlin", "hoping to retrain as a nurse"
- STRUGGLES_WITH   ongoing difficulty, health condition, or hardship: "dealing with burnout", "has back problems"
- DOES        recurring habit / activity: "runs marathons", "goes to the gym daily", "looks after her mum"
- KNOWS       an unquantified connection, not romantic: "knows Tom from uni", "knows the CEO", "family has a farm"
- DID         a one-off past event or experience: "did the W-trek in Patagonia", "lived in Tokyo for a year", "interned at Google"

ATTRIBUTION RULES (most important):
- Every fact in the output MUST be about the TARGET.
- If a sentence describes another named person, do NOT attribute it to the TARGET.
  Add that person's name to "mentionedOthers" and skip the fact.
- Family facts about the TARGET's relatives ("her dad has a campervan") go on the TARGET as a HAS attribute with a label naming the relative ("father has a campervan"). Do NOT create separate entries.
- If you cannot confidently attribute a fact to the TARGET, drop it.

FIELD-SPECIFIC RULES:
- metLocation: where the note-taker first met or most recently saw the TARGET ("Chile", "a conference in Berlin").
- homeLocation: where the TARGET lives, is from, or is currently based ("UK", "Warsaw", "moved to NYC").
- partnerName: set if the text explicitly or strongly implies the TARGET has a romantic partner and names them.
  Trigger words: "couple", "partner", "boyfriend", "girlfriend", "husband", "wife", "fiancé", "together with", "dating".
  If they broke up / are an ex, do NOT set partnerName; record "ex-partner NAME" as KNOWS instead.
- socialHandles: extract ANY @handle or social-platform reference, even if the platform is inferred from context (e.g. "IG @agata.x" → instagram).
- languages: explicit language mentions only ("speaks Polish", "fluent in French").
- DO NOT extract phone/email unless the text contains a literal digit string or email address.
- mentionedOthers: every named person who appeared in the note but is NOT the TARGET.

ASSERTION:
- "asserted"    direct statement: "She is a doctor" / "Studied in London".
- "speculation" hedged: "I think she...", "maybe", "probably", "I'm not sure but".
                Cap confidence at 0.5.
- "reported"    indirect/second-hand: "She told me", "her mum said", "according to Tom".
- "aspiration"  wants/plans/hopes: "She wants to move to Berlin".
Default to "asserted". Never invent hedging.

WORKED EXAMPLE:
Note (TARGET = "Agata"):
  "Met Agata + Tom in Chile during W-trek. Couple from UK, met in Vietnam. Agata studied in London, parents are doctors, dad has a campervan. IG @agata.x"

Expected JSON:
{
  "metLocation": "Chile",
  "homeLocation": "UK",
  "partnerName": "Tom",
  "socialHandles": [{ "platform": "instagram", "handle": "@agata.x" }],
  "attributes": [
    { "relationType": "DID", "objectLabel": "W-trek in Chile", "confidence": 0.95, "assertion": "asserted" },
    { "relationType": "CAN", "objectLabel": "studied in London", "confidence": 0.9, "assertion": "asserted" },
    { "relationType": "IS",  "objectLabel": "parents are doctors", "confidence": 0.9, "assertion": "asserted" },
    { "relationType": "HAS", "objectLabel": "father has a campervan", "confidence": 0.9, "assertion": "asserted" }
  ],
  "mentionedOthers": ["Tom"],
  "notesSummary": "Met in Chile on a W-trek. UK couple. Agata studied in London; parents are doctors. Dad has a campervan. IG @agata.x."
}
`;

function buildPrompt(personName: string | null | undefined, brainDump: string): string {
  const target = personName?.trim() ? `"${personName.trim()}"` : 'the single subject of this note';
  return `TARGET: ${target}\n\nNOTE:\n"""${brainDump.trim()}"""\n\nReturn ONLY the JSON object.`;
}

export async function extractPersonBrainDump(
  config: AIServiceConfig,
  brainDump: string,
  personName?: string | null
): Promise<BrainDumpResult> {
  const prompt = buildPrompt(personName, brainDump);
  const { response } = await callAI(
    { ...config, systemPrompt: SYSTEM },
    prompt
  );
  const parsed = parseExtractionResponse(response);
  return normalizeResult(parsed);
}

function normalizeResult(raw: unknown): BrainDumpResult {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const trim = (v: unknown): string | undefined => {
    if (typeof v !== 'string') return undefined;
    const t = v.trim();
    return t.length > 0 ? t : undefined;
  };

  const socialHandles: SocialLink[] = Array.isArray(r.socialHandles)
    ? (r.socialHandles as unknown[]).flatMap((h) => {
        if (!h || typeof h !== 'object') return [];
        const obj = h as Record<string, unknown>;
        const platform = String(obj.platform ?? 'other') as SocialPlatform;
        const handle = trim(obj.handle);
        if (!handle) return [];
        const url = trim(obj.url);
        return [{ platform, handle: handle.startsWith('@') ? handle : `@${handle}`, url }];
      })
    : [];

  const languages: string[] = Array.isArray(r.languages)
    ? (r.languages as unknown[])
        .map((l) => trim(l))
        .filter((v): v is string => typeof v === 'string')
        .slice(0, 20)
    : [];

  const allowedTypes = new Set<string>(BRAIN_DUMP_RELATION_TYPES as readonly string[]);
  const allowedAssertions = new Set<string>(BRAIN_DUMP_ASSERTION_TYPES as readonly string[]);
  const attributes: BrainDumpAttribute[] = Array.isArray(r.attributes)
    ? (r.attributes as unknown[]).flatMap((a) => {
        if (!a || typeof a !== 'object') return [];
        const obj = a as Record<string, unknown>;
        const relationType = typeof obj.relationType === 'string' ? obj.relationType : '';
        const objectLabel = trim(obj.objectLabel);
        if (!allowedTypes.has(relationType) || !objectLabel) return [];
        const confidenceRaw = typeof obj.confidence === 'number' ? obj.confidence : 0.6;
        let confidence = Math.min(Math.max(confidenceRaw, 0), 1);
        const assertionRaw = typeof obj.assertion === 'string' ? obj.assertion : 'asserted';
        const assertion: BrainDumpAssertion = allowedAssertions.has(assertionRaw)
          ? (assertionRaw as BrainDumpAssertion)
          : 'asserted';
        // Defensive: cap confidence for speculation per the prompt rule.
        if (assertion === 'speculation' && confidence > 0.5) confidence = 0.5;
        return [
          {
            relationType: relationType as BrainDumpRelationType,
            objectLabel,
            confidence,
            assertion,
          },
        ];
      })
    : [];

  const mentionedOthers: string[] = Array.isArray(r.mentionedOthers)
    ? (r.mentionedOthers as unknown[])
        .map((v) => trim(v))
        .filter((v): v is string => typeof v === 'string')
        .slice(0, 20)
    : [];

  return {
    metLocation: trim(r.metLocation),
    metDate: trim(r.metDate),
    homeLocation: trim(r.homeLocation),
    phone: trim(r.phone),
    email: trim(r.email),
    partnerName: trim(r.partnerName),
    socialHandles,
    languages,
    attributes,
    mentionedOthers,
    notesSummary: trim(r.notesSummary),
  };
}
