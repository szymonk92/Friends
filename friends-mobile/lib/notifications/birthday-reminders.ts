import * as Notifications from 'expo-notifications';
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, getCurrentUserId } from '@/lib/db';
import { people } from '@/lib/db/schema';
import { eq, and, isNull, ne, isNotNull } from 'drizzle-orm';
import { parseJsonObject } from '@/lib/utils/json';
import { tr } from '@/lib/i18n/labels';

const BIRTHDAY_SETTINGS_KEY = 'birthday_reminder_settings';

// Global timing only — who gets reminded is per person (people.birthday_reminder).
export interface BirthdayReminderSettings {
  daysBefore: number; // Remind X days before birthday
  remindOnDay: boolean; // Remind on the actual birthday
}

export const DEFAULT_SETTINGS: BirthdayReminderSettings = {
  daysBefore: 7,
  remindOnDay: true,
};

/** Hour of day the notifications fire (local time). */
export const BEFORE_HOUR = 9;
export const ON_DAY_HOUR = 8;

export async function getBirthdayReminderSettings(): Promise<BirthdayReminderSettings> {
  try {
    const stored = await AsyncStorage.getItem(BIRTHDAY_SETTINGS_KEY);
    return parseJsonObject(stored, DEFAULT_SETTINGS);
  } catch (error) {
    console.error('Failed to load birthday settings:', error);
  }
  return DEFAULT_SETTINGS;
}

export async function saveBirthdayReminderSettings(
  settings: BirthdayReminderSettings
): Promise<void> {
  try {
    await AsyncStorage.setItem(BIRTHDAY_SETTINGS_KEY, JSON.stringify(settings));

    await scheduleBirthdayReminders();
  } catch (error) {
    console.error('Failed to save birthday settings:', error);
    throw error;
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

type WithBirthday = { dateOfBirth: Date | null; dateOfBirthPrecision: string | null };

/** True when the birthday has a real day (month/year-only dates are never guessed). */
export function hasExactBirthday(person: WithBirthday): boolean {
  return !!person.dateOfBirth && (!person.dateOfBirthPrecision || person.dateOfBirthPrecision === 'day');
}

export function getNextBirthday(dateOfBirth: Date, now: Date = new Date()): Date {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0); // a birthday today is still "this year", not next
  const dob = new Date(dateOfBirth);
  // Built from parts so Feb 29 doesn't roll into Mar 1 in non-leap years.
  const atYear = (y: number) => {
    const isLeap = new Date(y, 1, 29).getMonth() === 1;
    const day = dob.getMonth() === 1 && dob.getDate() === 29 && !isLeap ? 28 : dob.getDate();
    return new Date(y, dob.getMonth(), day);
  };
  const thisYear = atYear(today.getFullYear());
  return thisYear < today ? atYear(today.getFullYear() + 1) : thisYear;
}

export function getDaysUntilBirthday(dateOfBirth: Date, now: Date = new Date()): number {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round((getNextBirthday(dateOfBirth, now).getTime() - today.getTime()) / 86400000);
}

/** Everyone with an exact birthday, soonest first. */
export function sortByNextBirthday<P extends WithBirthday>(list: P[], now: Date = new Date()) {
  return list
    .filter((p) => hasExactBirthday(p))
    .map((person) => {
      const nextBirthday = getNextBirthday(person.dateOfBirth!, now);
      return {
        person,
        nextBirthday,
        daysUntil: getDaysUntilBirthday(person.dateOfBirth!, now),
        age: nextBirthday.getFullYear() - new Date(person.dateOfBirth!).getFullYear(),
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

type ReminderPerson = WithBirthday & { id: string; name: string; birthdayReminder: boolean | null };

/**
 * The notifications one person should have. Yearly triggers repeat on their own, so
 * reminders keep firing every year without the app re-scheduling them. Feb 29 is
 * reminded on Feb 28 so it fires in non-leap years too.
 */
export function birthdayNotifications(
  person: ReminderPerson,
  settings: BirthdayReminderSettings
): Notifications.NotificationRequestInput[] {
  if (!person.birthdayReminder || !hasExactBirthday(person)) return [];
  const dob = new Date(person.dateOfBirth!);
  const leapDay = dob.getMonth() === 1 && dob.getDate() === 29;
  // 2001 is not a leap year, so "N days before" is counted on a real calendar.
  const birthday = new Date(2001, dob.getMonth(), leapDay ? 28 : dob.getDate());
  const yearly = (d: Date, hour: number) => ({
    type: Notifications.SchedulableTriggerInputTypes.YEARLY as const,
    month: d.getMonth(),
    day: d.getDate(),
    hour,
    minute: 0,
  });

  const out: Notifications.NotificationRequestInput[] = [];
  if (settings.daysBefore > 0) {
    const before = new Date(birthday);
    before.setDate(before.getDate() - settings.daysBefore);
    out.push({
      identifier: `birthday-before-${person.id}`,
      content: {
        title: tr('birthdayReminders.notifyBeforeTitle', '🎂 Upcoming birthday'),
        body: tr('birthdayReminders.notifyBeforeBody', `${person.name}'s birthday is in ${settings.daysBefore} days`, {
          name: person.name,
          count: settings.daysBefore,
        }),
        data: { personId: person.id, type: 'birthday_reminder' },
      },
      trigger: yearly(before, BEFORE_HOUR),
    });
  }
  if (settings.remindOnDay) {
    out.push({
      identifier: `birthday-day-${person.id}`,
      content: {
        title: tr('birthdayReminders.notifyTodayTitle', '🎉 Birthday today'),
        body: tr('birthdayReminders.notifyTodayBody', `Today is ${person.name}'s birthday!`, {
          name: person.name,
        }),
        data: { personId: person.id, type: 'birthday_today' },
      },
      trigger: yearly(birthday, ON_DAY_HOUR),
    });
  }
  return out;
}

export async function scheduleBirthdayReminders(): Promise<number> {
  const settings = await getBirthdayReminderSettings();

  // Cancel existing birthday reminders first
  await cancelAllBirthdayReminders();

  const userId = await getCurrentUserId();
  const rows = await db
    .select()
    .from(people)
    .where(
      and(
        eq(people.userId, userId),
        isNotNull(people.dateOfBirth),
        isNull(people.deletedAt),
        ne(people.status, 'merged')
      )
    );

  const requests = (rows as ReminderPerson[]).flatMap((person) =>
    birthdayNotifications(person, settings)
  );
  if (requests.length === 0) return 0;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.log('Notification permissions not granted');
    return 0;
  }

  for (const request of requests) {
    await Notifications.scheduleNotificationAsync(request);
  }

  console.log(`Scheduled ${requests.length} birthday reminders`);
  return requests.length;
}

export async function cancelAllBirthdayReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduled) {
    if (notification.identifier?.startsWith('birthday-')) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

/**
 * Start/end of the all-day calendar event for the next birthday.
 * Android's CalendarContract requires all-day events at UTC midnight; iOS (EventKit)
 * reads the date in local time, so UTC midnight would land a day early west of UTC.
 */
export function birthdayEventRange(
  dateOfBirth: Date,
  os: string = Platform.OS,
  now: Date = new Date()
): { startDate: Date; endDate: Date } {
  const next = getNextBirthday(dateOfBirth, now);
  const [y, m, d] = [next.getFullYear(), next.getMonth(), next.getDate()];
  if (os === 'android') {
    return { startDate: new Date(Date.UTC(y, m, d)), endDate: new Date(Date.UTC(y, m, d + 1)) };
  }
  return { startDate: new Date(y, m, d), endDate: new Date(y, m, d + 1) };
}

/**
 * Opens the system "new event" screen pre-filled with a yearly all-day birthday.
 * Uses the OS dialog, so no calendar permission is needed; the user confirms there.
 */
export async function addBirthdayToCalendar(dateOfBirth: Date, title: string): Promise<void> {
  await Calendar.createEventInCalendarAsync({
    title,
    ...birthdayEventRange(dateOfBirth),
    allDay: true,
    recurrenceRule: { frequency: Calendar.Frequency.YEARLY },
  });
}
