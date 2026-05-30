import * as Contacts from 'expo-contacts';
import { Alert, Platform } from 'react-native';
import { normalizePhone } from './pii';

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
  return Platform.OS === 'ios' && typeof Contacts.presentContactPickerAsync === 'function';
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
    const result = await Contacts.presentContactPickerAsync();
    if (!result) return null;
    return projectContact(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    if (/cancel/i.test(msg)) return null;
    Alert.alert('Could not open contacts', msg);
    return null;
  }
}

function projectContact(c: Contacts.Contact): PickedContact {
  const name = c.name || [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
  const phone = c.phoneNumbers?.[0]?.number ?? undefined;
  const email = c.emails?.[0]?.email ?? undefined;
  return {
    name: name || undefined,
    phone: phone ? normalizePhone(phone) : undefined,
    email: email?.trim() || undefined,
  };
}
