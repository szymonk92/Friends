import * as Contacts from 'expo-contacts';
import { Platform } from 'react-native';
import { db, getCurrentUserId } from '@/lib/db';
import { people, type Person } from '@/lib/db/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { normalizePhone } from '@/lib/utils/pii';
import { nameSimilarity, phoneMatch } from '@/lib/utils/nameMatch';
import { saveProfileImageFile } from '@/lib/utils/photos';

/** A contact projected down to the fields we actually import. */
export interface ContactRow {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  birthday?: Contacts.ContactDate;
  address?: Contacts.ExistingAddress;
  imageUri?: string;
}

export type MatchKind = 'new' | 'fuzzy' | 'exact';

export interface MatchInfo {
  kind: MatchKind;
  candidate?: Person;
  score: number;
}

export type ImportAction = 'create' | 'skip' | 'update';

export interface ImportDecision {
  contact: ContactRow;
  action: ImportAction;
  candidateId?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  updated: number;
  errors: string[];
}

/** Threshold above which two names are treated as a possible duplicate. */
const FUZZY_THRESHOLD = 0.82;

export async function requestContactsPermission(): Promise<boolean> {
  const { granted } = await Contacts.requestPermissionsAsync();
  return granted;
}

// Android has no `birthday` field (the native enum rejects it); birthdays arrive as a
// "birthday"-labelled entry in `dates`. iOS is the opposite.
const CONTACT_FIELDS = [
  Contacts.ContactField.FULL_NAME,
  Contacts.ContactField.PHONES,
  Contacts.ContactField.EMAILS,
  Platform.OS === 'ios' ? Contacts.ContactField.BIRTHDAY : Contacts.ContactField.DATES,
  Contacts.ContactField.ADDRESSES,
  Contacts.ContactField.IMAGE,
];

type Details = Contacts.PartialContactDetails<typeof CONTACT_FIELDS>;

function birthdayOf(c: Details): Contacts.ContactDate | undefined {
  if (Platform.OS === 'ios') return (c as { birthday?: Contacts.ContactDate | null }).birthday ?? undefined;
  const dates = (c as { dates?: Contacts.ExistingDate[] }).dates ?? [];
  return dates.find((d) => d.label?.toLowerCase() === 'birthday')?.date;
}

function projectContact(c: Details): ContactRow | null {
  const name = c.fullName?.trim();
  if (!name) return null;
  const phone = c.phones?.[0]?.number;
  const email = c.emails?.[0]?.address;
  return {
    id: c.id,
    name,
    phone: phone ? normalizePhone(phone) : undefined,
    email: email?.trim() || undefined,
    birthday: birthdayOf(c),
    address: c.addresses?.[0],
    imageUri: c.image ?? undefined,
  };
}

/**
 * Bulk-read the address book. Requires contacts permission — call
 * `requestContactsPermission()` first. This is the path the single-record
 * `contactsPicker.ts` deliberately avoided; this hook opts into it for import.
 */
export async function loadContacts(): Promise<ContactRow[]> {
  const data = await Contacts.Contact.getAllDetails(CONTACT_FIELDS);
  return data
    .map(projectContact)
    .filter((c): c is ContactRow => c !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Classify each contact against existing people: `exact` (case-insensitive name
 * match), `fuzzy` (name similarity ≥ threshold or phone match), or `new`.
 */
export function matchContacts(
  contacts: ContactRow[],
  existing: Person[]
): Record<string, MatchInfo> {
  const out: Record<string, MatchInfo> = {};
  for (const c of contacts) {
    let best: { person: Person; score: number } | null = null;
    let exactPerson: Person | null = null;
    let phonePerson: Person | null = null;

    for (const p of existing) {
      const score = nameSimilarity(c.name, p.name);
      if (score >= 0.999) exactPerson = p;
      if (phoneMatch(c.phone, p.phone)) phonePerson = p;
      if (!best || score > best.score) best = { person: p, score };
    }

    if (exactPerson) {
      out[c.id] = { kind: 'exact', candidate: exactPerson, score: 1 };
    } else if (phonePerson) {
      out[c.id] = { kind: 'fuzzy', candidate: phonePerson, score: best?.score ?? 0 };
    } else if (best && best.score >= FUZZY_THRESHOLD) {
      out[c.id] = { kind: 'fuzzy', candidate: best.person, score: best.score };
    } else {
      out[c.id] = { kind: 'new', score: best?.score ?? 0 };
    }
  }
  return out;
}

function birthdayToDate(b: Contacts.ContactDate): Date {
  // Class-based expo-contacts API: month is 1-12.
  return new Date(b.year!, b.month - 1, b.day);
}

function addressToString(a: Contacts.ExistingAddress): string {
  return [a.city, a.region, a.country].filter(Boolean).join(', ');
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * Run the import. Each decision is already user-resolved (the UI asks about
 * fuzzy matches before calling this). Creates people (`addedBy: 'import'`),
 * or fills missing fields on an existing person for `update`. Pulls the
 * contact's photo (if any) through the shared `saveProfileImageFile` pipeline.
 *
 * ponytail: per-row sequential inserts. Contact lists are hundreds, not
 * millions — fine. Batch insert if thousands ever matter.
 */
export function useImportContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (decisions: ImportDecision[]): Promise<ImportResult> => {
      const userId = await getCurrentUserId();
      const result: ImportResult = { imported: 0, skipped: 0, updated: 0, errors: [] };

      for (const d of decisions) {
        const c = d.contact;
        try {
          if (d.action === 'skip') {
            result.skipped++;
            continue;
          }

          if (d.action === 'update' && d.candidateId) {
            const [existing] = await db
              .select()
              .from(people)
              .where(eq(people.id, d.candidateId))
              .limit(1);
            if (!existing) {
              result.errors.push(`Update target not found: ${c.name}`);
              continue;
            }
            const updates: Partial<Person> = { updatedAt: new Date() };
            if (!existing.phone && c.phone) updates.phone = c.phone;
            if (!existing.email && c.email) updates.email = c.email;
            if (!existing.homeLocation && c.address)
              updates.homeLocation = addressToString(c.address);
            if (!existing.dateOfBirth && c.birthday?.year)
              updates.dateOfBirth = birthdayToDate(c.birthday);
            if (!existing.photoId && c.imageUri) {
              const photo = await saveProfileImageFile({
                sourceUri: c.imageUri,
                personId: existing.id,
              });
              updates.photoId = photo.id;
            }
            await db.update(people).set(updates).where(eq(people.id, existing.id));
            result.updated++;
            continue;
          }

          // create
          const id = randomUUID();
          const photoId = c.imageUri
            ? (await saveProfileImageFile({ sourceUri: c.imageUri, personId: id })).id
            : null;
          const [created] = (await db
            .insert(people)
            .values({
              id,
              userId,
              name: truncate(c.name, 100),
              phone: c.phone || null,
              email: c.email || null,
              homeLocation: c.address ? addressToString(c.address) : null,
              dateOfBirth: c.birthday?.year ? birthdayToDate(c.birthday) : null,
              personType: 'primary',
              dataCompleteness: 'minimal',
              addedBy: 'import',
              status: 'active',
              importanceToUser: 'unknown',
              photoId,
            })
            .returning()) as Person[];

          result.imported++;
        } catch (e) {
          result.errors.push(`${c.name}: ${(e as Error).message}`);
        }
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}