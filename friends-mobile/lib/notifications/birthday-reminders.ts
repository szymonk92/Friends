import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { db, getCurrentUserId } from '@/lib/db';
import { people } from '@/lib/db/schema';
import { eq, and, isNull, ne, isNotNull } from 'drizzle-orm';

const BIRTHDAY_SETTINGS_KEY = 'birthday_reminder_settings';

export interface BirthdayReminderSettings {
  enabled: boolean;
  daysBefore: number; // Remind X days before birthday
  remindOnDay: boolean; // Remind on the actual birthday
  onlyImportantPeople: boolean; // Only remind for important+ people
  importanceThreshold: string; // Minimum importance level
}

export const DEFAULT_SETTINGS: BirthdayReminderSettings = {
  enabled: false,
  daysBefore: 7,
  remindOnDay: true,
  onlyImportantPeople: true,
  importanceThreshold: 'important', // important, very_important, critical
};

// Importance levels in order
const IMPORTANCE_ORDER = ['minimal', 'low', 'moderate', 'important', 'very_important', 'critical'];

export async function getBirthdayReminderSettings(): Promise<BirthdayReminderSettings> {
  try {
    const stored = await SecureStore.getItemAsync(BIRTHDAY_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load birthday settings:', error);
  }
  return DEFAULT_SETTINGS;
}

export async function saveBirthdayReminderSettings(settings: BirthdayReminderSettings): Promise<void> {
  try {
    await SecureStore.setItemAsync(BIRTHDAY_SETTINGS_KEY, JSON.stringify(settings));

    // Reschedule notifications based on new settings
    if (settings.enabled) {
      await scheduleBirthdayReminders();
    } else {
      await cancelAllBirthdayReminders();
    }
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

function meetsImportanceThreshold(personImportance: string | null, threshold: string): boolean {
  if (!personImportance) return false;

  const personIndex = IMPORTANCE_ORDER.indexOf(personImportance);
  const thresholdIndex = IMPORTANCE_ORDER.indexOf(threshold);

  return personIndex >= thresholdIndex;
}

function getNextBirthday(dateOfBirth: Date): Date {
  const today = new Date();
  const birthday = new Date(dateOfBirth);

  // Set to this year's birthday
  birthday.setFullYear(today.getFullYear());

  // If birthday has passed this year, set to next year
  if (birthday < today) {
    birthday.setFullYear(today.getFullYear() + 1);
  }

  return birthday;
}

function getDaysUntilBirthday(dateOfBirth: Date): number {
  const nextBirthday = getNextBirthday(dateOfBirth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  nextBirthday.setHours(0, 0, 0, 0);

  const diffTime = nextBirthday.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

export async function scheduleBirthdayReminders(): Promise<number> {
  const settings = await getBirthdayReminderSettings();

  if (!settings.enabled) {
    return 0;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.log('Notification permissions not granted');
    return 0;
  }

  // Cancel existing birthday reminders first
  await cancelAllBirthdayReminders();

  const userId = await getCurrentUserId();

  // Get all people with birthdays
  const peopleWithBirthdays = await db
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

  let scheduledCount = 0;

  for (const person of peopleWithBirthdays) {
    if (!person.dateOfBirth) continue;

    // Check importance threshold
    if (settings.onlyImportantPeople) {
      if (!meetsImportanceThreshold(person.importanceToUser, settings.importanceThreshold)) {
        continue;
      }
    }

    const daysUntil = getDaysUntilBirthday(person.dateOfBirth);
    const nextBirthday = getNextBirthday(person.dateOfBirth);
    const age = nextBirthday.getFullYear() - new Date(person.dateOfBirth).getFullYear();

    // Schedule reminder X days before
    if (settings.daysBefore > 0 && daysUntil <= settings.daysBefore && daysUntil > 0) {
      const reminderDate = new Date(nextBirthday);
      reminderDate.setDate(reminderDate.getDate() - settings.daysBefore);
      reminderDate.setHours(9, 0, 0, 0); // 9 AM

      if (reminderDate > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🎂 Upcoming Birthday',
            body: `${person.name}'s birthday is in ${settings.daysBefore} days (turning ${age})!`,
            data: { personId: person.id, type: 'birthday_reminder' },
          },
          trigger: reminderDate as any,
          identifier: `birthday-before-${person.id}`,
        });
        scheduledCount++;
      }
    }

    // Schedule reminder on the day
    if (settings.remindOnDay && daysUntil <= 365) {
      const onDayDate = new Date(nextBirthday);
      onDayDate.setHours(8, 0, 0, 0); // 8 AM

      if (onDayDate > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🎉 Birthday Today!',
            body: `Today is ${person.name}'s birthday! They're turning ${age}.`,
            data: { personId: person.id, type: 'birthday_today' },
          },
          trigger: onDayDate as any,
          identifier: `birthday-day-${person.id}`,
        });
        scheduledCount++;
      }
    }
  }

  console.log(`Scheduled ${scheduledCount} birthday reminders`);
  return scheduledCount;
}

export async function cancelAllBirthdayReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduled) {
    if (notification.identifier?.startsWith('birthday-')) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

export async function getUpcomingBirthdays(daysAhead: number = 30): Promise<Array<{
  person: any;
  daysUntil: number;
  nextBirthday: Date;
  age: number;
}>> {
  const userId = await getCurrentUserId();

  const peopleWithBirthdays = await db
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

  const upcoming = peopleWithBirthdays
    .map((person) => {
      if (!person.dateOfBirth) return null;

      const daysUntil = getDaysUntilBirthday(person.dateOfBirth);
      const nextBirthday = getNextBirthday(person.dateOfBirth);
      const age = nextBirthday.getFullYear() - new Date(person.dateOfBirth).getFullYear();

      return {
        person,
        daysUntil,
        nextBirthday,
        age,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null && item.daysUntil <= daysAhead)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return upcoming;
}
