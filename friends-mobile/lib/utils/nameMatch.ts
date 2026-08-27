import { normalizePhone } from './pii';

/**
 * Normalize a name for comparison: lowercase, drop punctuation, collapse spaces.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Character-bigram set of a string. */
function bigrams(s: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  return set;
}

/**
 * Sørensen–Dice similarity over name bigrams, in [0, 1].
 * Handles token overlap too: if one name is a token subset of the other
 * (e.g. "Jon" vs "Jon Smith"), boost so short-form nicknames still match.
 *
 * ponytail: Dice bigrams + token-subset boost, good enough for "Jon" vs
 * "Jonathan" and "Bob Smith" vs "Robert Smith". Upgrade to Jaro–Winkler + a
 * nickname dictionary if false negatives show up in real contact lists.
 */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  // Token-subset boost: "jon" ⊆ "jon smith", or "bob" ⊆ "bob smith".
  const ta = na.split(' ');
  const tb = nb.split(' ');
  const shorter = ta.length <= tb.length ? ta : tb;
  const longer = ta.length <= tb.length ? tb : ta;
  const longerSet = new Set(longer);
  const subset = shorter.every((tok) => longerSet.has(tok));
  if (subset && shorter.length < longer.length) return 0.9;

  const ba = bigrams(na);
  const bb = bigrams(nb);
  if (ba.size === 0 || bb.size === 0) {
    // Single-char names: fall back to token equality.
    return ta.some((t) => tb.includes(t)) ? 0.8 : 0;
  }
  let inter = 0;
  for (const g of ba) if (bb.has(g)) inter++;
  return (2 * inter) / (ba.size + bb.size);
}

/**
 * Do two phone strings refer to the same number? Normalizes formatting and
 * also compares the last 9 digits so "+1 (555) 123-4567" matches "5551234567".
 */
export function phoneMatch(contactPhone: string | undefined, personPhone: string | undefined): boolean {
  if (!contactPhone || !personPhone) return false;
  const a = normalizePhone(contactPhone).replace(/\D/g, '');
  const b = normalizePhone(personPhone).replace(/\D/g, '');
  if (!a || !b) return false;
  if (a === b) return true;
  const tail = Math.min(9, a.length, b.length);
  return a.slice(-tail) === b.slice(-tail);
}