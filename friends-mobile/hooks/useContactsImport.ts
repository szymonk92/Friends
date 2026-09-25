import * as Contacts from 'expo-contacts';
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
  birthday?: Contacts.Date;
  address?: Contacts.Address;
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

function projectContact(c: Contacts.ExistingContact): ContactRow | null {
  const name = c.name || [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
  if (!name) return null;
  const phone = c.phoneNumbers?.[0]?.number;
  const email = c.emails?.[0]?.email;
  return {
    id: c.id,
    name,
    phone: phone ? normalizePhone(phone) : undefined,
    email: email?.trim() || undefined,
    birthday: c.birthday,
    address: c.addresses?.[0],
    imageUri: c.image?.uri,
  };
}

/**
 * Bulk-read the address book. Requires contacts permission — call
 * `requestContactsPermission()` first. This is the path the single-record
 * `contactsPicker.ts` deliberately avoided; this hook opts into it for import.
 */
export async function loadContacts(): Promise<ContactRow[]> {
  const { data } = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.Name,
      Contacts.Fields.PhoneNumbers,
      Contacts.Fields.Emails,
      Contacts.Fields.Birthday,
      Contacts.Fields.Addresses,
      Contacts.Fields.Image,
    ],
  });
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

function birthdayToDate(b: Contacts.Date): Date {
  // expo-contacts month is already 0-indexed for `new Date`.
  return new Date(b.year!, b.month, b.day);
}

function addressToString(a: Contacts.Address): string {
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