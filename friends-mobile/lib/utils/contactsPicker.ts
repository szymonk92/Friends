import { tr } from '@/lib/i18n/labels';
import * as Contacts from 'expo-contacts';
import { Platform } from 'react-native';
import { normalizePhone } from './pii';
import { fzAlert } from '@/lib/utils/confirm';

export type PickedContact = {
  name?: string;
  phone?: string;
  email?: string;
};

/**
 * Whether a one-tap native contact picker is available on this platform.
 * iOS: yes (Apple's permission-free picker).
 * Android: no — `expo-contacts` has no native picker, only a permission-gated
 * `getContactsAsync`. We deliberately hide the button rather than mislead the user.
 */
export function isContactPickerAvailable(): boolean {
  return Platform.OS === 'ios' && typeof Contacts.Contact.presentPicker === 'function';
}

/**
 * Opens the native contact picker (iOS only).
 *
 * SECURITY:
 *   - The OS picker is user-initiated; no contacts permission is requested
 *     because the user explicitly selects the one record they want to share.
 *   - We DO NOT bulk-read the address book.
 *   - PickedContact values must NEVER be logged.
 *
 * Returns null if the user cancels or the platform has no picker.
 * Callers should use `isContactPickerAvailable()` to gate the button.
 */
export async function pickContact(): Promise<PickedContact | null> {
  if (!isContactPickerAvailable()) return null;
  try {
    const picked = await Contacts.Contact.presentPicker();
    if (!picked) return null;
    return projectContact(await picked.getDetails(PICK_FIELDS));
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    if (/cancel/i.test(msg)) return null;
    fzAlert(tr('importContacts.openFailed', 'Could not open contacts'), msg);
    return null;
  }
}

const PICK_FIELDS = [
  Contacts.ContactField.FULL_NAME,
  Contacts.ContactField.PHONES,
  Contacts.ContactField.EMAILS,
] as const;

function projectContact(c: Contacts.PartialContactDetails<typeof PICK_FIELDS>): PickedContact {
  const phone = c.phones?.[0]?.number;
  const email = c.emails?.[0]?.address;
  return {
    name: c.fullName?.trim() || undefined,
    phone: phone ? normalizePhone(phone) : undefined,
    email: email?.trim() || undefined,
  };
}
