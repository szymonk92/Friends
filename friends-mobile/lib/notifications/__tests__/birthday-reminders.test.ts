import * as Notifications from 'expo-notifications';
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '@/lib/i18n/locales/en.json';
import pl from '@/lib/i18n/locales/pl.json';

// ---- native module mocks -------------------------------------------------

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { YEARLY: 'yearly', DATE: 'date' },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
}));

jest.mock('expo-calendar', () => ({
  Frequency: { YEARLY: 'yearly' },
  createEventInCalendarAsync: jest.fn(),
}));

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

// db.select().from().where() resolves to whatever `mockRows` holds.
let mockRows: Record<string, unknown>[] = [];
jest.mock('@/lib/db', () => ({
  getCurrentUserId: jest.fn(async () => 'user-1'),
  db: {
    select: () => ({ from: () => ({ where: async () => mockRows }) }),
  },
}));

import {
  addBirthdayToCalendar,
  birthdayEventRange,
  birthdayNotifications,
  cancelAllBirthdayReminders,
  DEFAULT_SETTINGS,
  getBirthdayReminderSettings,
  getDaysUntilBirthday,
  getNextBirthday,
  hasExactBirthday,
  saveBirthdayReminderSettings,
  scheduleBirthdayReminders,
  sortByNextBirthday,
  BEFORE_HOUR,
  ON_DAY_HOUR,
} from '../birthday-reminders';

const N = Notifications as jest.Mocked<typeof Notifications>;
const C = Calendar as jest.Mocked<typeof Calendar>;
const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const platform = Platform as { OS: string };

const person = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  name: 'Ala',
  dateOfBirth: new Date(1990, 5, 15), // 15 Jun 1990
  dateOfBirthPrecision: null as string | null,
  birthdayReminder: true as boolean | null,
  ...over,
});

const triggerOf = (req: Notifications.NotificationRequestInput) =>
  req.trigger as unknown as { type: string; month: number; day: number; hour: number; minute: number };

const withTZ = (tz: string, fn: () => void) => {
  const prev = process.env.TZ;
  process.env.TZ = tz;
  try {
    fn();
  } finally {
    process.env.TZ = prev;
  }
};

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  mockRows = [];
  platform.OS = 'android';
  storage.getItem.mockResolvedValue(null);
  N.getPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
  N.requestPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
  N.getAllScheduledNotificationsAsync.mockResolvedValue([]);
});

// ---- date helpers --------------------------------------------------------

describe('getNextBirthday / getDaysUntilBirthday', () => {
  const now = new Date(2026, 9, 9, 15, 30); // 9 Oct 2026, mid-afternoon

  it('keeps a birthday that is today in this year (0 days), not next year', () => {
    const dob = new Date(1990, 9, 9);
    expect(getNextBirthday(dob, now)).toEqual(new Date(2026, 9, 9));
    expect(getDaysUntilBirthday(dob, now)).toBe(0);
  });

  it('rolls a passed birthday into next year', () => {
    const dob = new Date(1990, 9, 8);
    expect(getNextBirthday(dob, now)).toEqual(new Date(2027, 9, 8));
    expect(getDaysUntilBirthday(dob, now)).toBe(364);
  });

  it('counts days to a later birthday this year', () => {
    expect(getDaysUntilBirthday(new Date(1990, 10, 1), now)).toBe(23);
  });

  it('puts Feb 29 birthdays on Feb 28 in non-leap years, Feb 29 in leap years', () => {
    const dob = new Date(1996, 1, 29);
    expect(getNextBirthday(dob, now)).toEqual(new Date(2027, 1, 28));
    expect(getNextBirthday(dob, new Date(2027, 5, 1))).toEqual(new Date(2028, 1, 29));
  });

  it('is not shifted by DST (whole days across the March change)', () => {
    withTZ('Europe/Warsaw', () => {
      expect(getDaysUntilBirthday(new Date(1990, 3, 1), new Date(2026, 2, 20, 12))).toBe(12);
    });
  });
});

describe('hasExactBirthday', () => {
  it('accepts exact-day and legacy (null precision) birthdays', () => {
    expect(hasExactBirthday(person())).toBe(true);
    expect(hasExactBirthday(person({ dateOfBirthPrecision: 'day' }))).toBe(true);
  });

  it('rejects partial or missing birthdays — never guess a day', () => {
    expect(hasExactBirthday(person({ dateOfBirthPrecision: 'month' }))).toBe(false);
    expect(hasExactBirthday(person({ dateOfBirthPrecision: 'year' }))).toBe(false);
    expect(hasExactBirthday(person({ dateOfBirth: null }))).toBe(false);
  });
});

describe('sortByNextBirthday', () => {
  const now = new Date(2026, 9, 9);

  it('lists only exact birthdays, soonest first, with age turning', () => {
    const list = sortByNextBirthday(
      [
        person({ id: 'later', dateOfBirth: new Date(1980, 0, 5) }),
        person({ id: 'partial', dateOfBirthPrecision: 'month' }),
        person({ id: 'none', dateOfBirth: null }),
        person({ id: 'today', dateOfBirth: new Date(2000, 9, 9) }),
        person({ id: 'soon', dateOfBirth: new Date(1991, 10, 1) }),
      ],
      now
    );
    expect(list.map((b) => b.person.id)).toEqual(['today', 'soon', 'later']);
    expect(list[0]).toMatchObject({ daysUntil: 0, age: 26 });
    expect(list[1]).toMatchObject({ daysUntil: 23, age: 35 });
    expect(list[2]).toMatchObject({ age: 47 });
  });

  it('is not limited to the next 30 days', () => {
    const list = sortByNextBirthday([person({ dateOfBirth: new Date(1990, 9, 8) })], now);
    expect(list).toHaveLength(1);
    expect(list[0].daysUntil).toBe(364);
  });
});

// ---- notification requests ----------------------------------------------

describe('birthdayNotifications', () => {
  it('builds a yearly "days before" and a yearly "on the day" notification', () => {
    const reqs = birthdayNotifications(person(), { daysBefore: 7, remindOnDay: true });
    expect(reqs.map((r) => r.identifier)).toEqual(['birthday-before-p1', 'birthday-day-p1']);
    expect(triggerOf(reqs[0])).toEqual({ type: 'yearly', month: 5, day: 8, hour: BEFORE_HOUR, minute: 0 });
    expect(triggerOf(reqs[1])).toEqual({ type: 'yearly', month: 5, day: 15, hour: ON_DAY_HOUR, minute: 0 });
  });

  it('never uses a one-shot Date trigger (rejected by expo-notifications ≥0.29, stops after a year)', () => {
    for (const r of birthdayNotifications(person(), DEFAULT_SETTINGS)) {
      expect(r.trigger).not.toBeInstanceOf(Date);
      expect(triggerOf(r).type).toBe('yearly');
    }
  });

  it('schedules the advance reminder even when the birthday is months away', () => {
    // Old code only scheduled it when the birthday was already within N days.
    const reqs = birthdayNotifications(person({ dateOfBirth: new Date(1990, 11, 24) }), {
      daysBefore: 3,
      remindOnDay: false,
    });
    expect(reqs).toHaveLength(1);
    expect(triggerOf(reqs[0])).toMatchObject({ month: 11, day: 21 });
  });

  it('wraps "days before" into the previous month and the previous year', () => {
    const intoFeb = birthdayNotifications(person({ dateOfBirth: new Date(1990, 2, 1) }), {
      daysBefore: 1,
      remindOnDay: false,
    });
    expect(triggerOf(intoFeb[0])).toMatchObject({ month: 1, day: 28 });

    const intoDec = birthdayNotifications(person({ dateOfBirth: new Date(1990, 0, 3) }), {
      daysBefore: 7,
      remindOnDay: false,
    });
    expect(triggerOf(intoDec[0])).toMatchObject({ month: 11, day: 27 });
  });

  it('reminds Feb 29 birthdays on Feb 28 so they fire every year', () => {
    const reqs = birthdayNotifications(person({ dateOfBirth: new Date(1996, 1, 29) }), {
      daysBefore: 7,
      remindOnDay: true,
    });
    expect(triggerOf(reqs[0])).toMatchObject({ month: 1, day: 21 });
    expect(triggerOf(reqs[1])).toMatchObject({ month: 1, day: 28 });
  });

  it('respects the settings: no advance reminder at 0 days, no on-day when off', () => {
    expect(birthdayNotifications(person(), { daysBefore: 0, remindOnDay: true }).map((r) => r.identifier)).toEqual([
      'birthday-day-p1',
    ]);
    expect(birthdayNotifications(person(), { daysBefore: 3, remindOnDay: false }).map((r) => r.identifier)).toEqual([
      'birthday-before-p1',
    ]);
    expect(birthdayNotifications(person(), { daysBefore: 0, remindOnDay: false })).toEqual([]);
  });

  it('returns nothing when the person has not opted in', () => {
    expect(birthdayNotifications(person({ birthdayReminder: false }), DEFAULT_SETTINGS)).toEqual([]);
    expect(birthdayNotifications(person({ birthdayReminder: null }), DEFAULT_SETTINGS)).toEqual([]);
  });

  it('returns nothing for month/year-only birthdays even if opted in', () => {
    expect(birthdayNotifications(person({ dateOfBirthPrecision: 'month' }), DEFAULT_SETTINGS)).toEqual([]);
    expect(birthdayNotifications(person({ dateOfBirthPrecision: 'year' }), DEFAULT_SETTINGS)).toEqual([]);
  });

  it('carries the person id so tapping the notification can open their profile', () => {
    const [before, onDay] = birthdayNotifications(person(), DEFAULT_SETTINGS);
    expect(before.content.data).toEqual({ personId: 'p1', type: 'birthday_reminder' });
    expect(onDay.content.data).toEqual({ personId: 'p1', type: 'birthday_today' });
  });

  it('does not bake an age into a repeating notification', () => {
    for (const r of birthdayNotifications(person(), DEFAULT_SETTINGS)) {
      expect(r.content.body).toContain('Ala');
      expect(r.content.body).not.toMatch(/turning|\d{2}\)/);
    }
  });

  it('uses the stored birthday in local time regardless of timezone', () => {
    withTZ('America/Los_Angeles', () => {
      const [onDay] = birthdayNotifications(person({ dateOfBirth: new Date(1990, 5, 15) }), {
        daysBefore: 0,
        remindOnDay: true,
      });
      expect(triggerOf(onDay)).toMatchObject({ month: 5, day: 15 });
    });
  });
});

// ---- scheduling / toggling ----------------------------------------------

describe('scheduleBirthdayReminders', () => {
  it('schedules both notifications for an opted-in person', async () => {
    mockRows = [person()];
    await expect(scheduleBirthdayReminders()).resolves.toBe(2);
    expect(N.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(N.scheduleNotificationAsync.mock.calls.map(([r]) => r.identifier)).toEqual([
      'birthday-before-p1',
      'birthday-day-p1',
    ]);
  });

  it('only schedules people who are toggled on and have exact dates', async () => {
    mockRows = [
      person({ id: 'on' }),
      person({ id: 'off', birthdayReminder: false }),
      person({ id: 'partial', dateOfBirthPrecision: 'month' }),
    ];
    await scheduleBirthdayReminders();
    const ids = N.scheduleNotificationAsync.mock.calls.map(([r]) => r.identifier);
    expect(ids).toEqual(['birthday-before-on', 'birthday-day-on']);
  });

  it('toggling a person off removes their notifications on the next reschedule', async () => {
    mockRows = [person()];
    await scheduleBirthdayReminders();
    N.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'birthday-before-p1' },
      { identifier: 'birthday-day-p1' },
    ] as never);
    N.scheduleNotificationAsync.mockClear();

    mockRows = [person({ birthdayReminder: false })];
    await expect(scheduleBirthdayReminders()).resolves.toBe(0);
    expect(N.cancelScheduledNotificationAsync).toHaveBeenCalledWith('birthday-before-p1');
    expect(N.cancelScheduledNotificationAsync).toHaveBeenCalledWith('birthday-day-p1');
    expect(N.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('toggling on and off repeatedly never duplicates notifications', async () => {
    let scheduled: string[] = [];
    N.getAllScheduledNotificationsAsync.mockImplementation(
      async () => scheduled.map((identifier) => ({ identifier })) as never
    );
    N.cancelScheduledNotificationAsync.mockImplementation(async (id: string) => {
      scheduled = scheduled.filter((s) => s !== id);
    });
    N.scheduleNotificationAsync.mockImplementation(async (r) => {
      scheduled.push(r.identifier!);
      return r.identifier!;
    });

    for (const on of [true, true, false, true]) {
      mockRows = [person({ birthdayReminder: on })];
      await scheduleBirthdayReminders();
    }
    expect(scheduled.sort()).toEqual(['birthday-before-p1', 'birthday-day-p1']);
  });

  it('leaves non-birthday notifications alone when cancelling', async () => {
    N.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'birthday-day-x' },
      { identifier: 'reminder-123' },
    ] as never);
    await cancelAllBirthdayReminders();
    expect(N.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
    expect(N.cancelScheduledNotificationAsync).toHaveBeenCalledWith('birthday-day-x');
  });

  it('does not ask for notification permission when nobody is opted in', async () => {
    mockRows = [person({ birthdayReminder: false })];
    await expect(scheduleBirthdayReminders()).resolves.toBe(0);
    expect(N.getPermissionsAsync).not.toHaveBeenCalled();
    expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('asks for permission when not yet granted, then schedules', async () => {
    mockRows = [person()];
    N.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' } as never);
    await expect(scheduleBirthdayReminders()).resolves.toBe(2);
    expect(N.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('schedules nothing (and does not throw) when permission is denied', async () => {
    mockRows = [person()];
    N.getPermissionsAsync.mockResolvedValue({ status: 'denied' } as never);
    N.requestPermissionsAsync.mockResolvedValue({ status: 'denied' } as never);
    await expect(scheduleBirthdayReminders()).resolves.toBe(0);
    expect(N.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('uses the saved timing settings', async () => {
    mockRows = [person()];
    storage.getItem.mockResolvedValue(JSON.stringify({ daysBefore: 0, remindOnDay: true }));
    await expect(scheduleBirthdayReminders()).resolves.toBe(1);
    expect(N.scheduleNotificationAsync.mock.calls[0][0].identifier).toBe('birthday-day-p1');
  });

  it('surfaces a native scheduling failure so the UI can report it', async () => {
    mockRows = [person()];
    N.scheduleNotificationAsync.mockRejectedValue(new Error('bad trigger'));
    await expect(scheduleBirthdayReminders()).rejects.toThrow('bad trigger');
  });
});

describe('settings', () => {
  it('defaults when nothing or garbage is stored', async () => {
    await expect(getBirthdayReminderSettings()).resolves.toEqual(DEFAULT_SETTINGS);
    storage.getItem.mockResolvedValue('{not json');
    await expect(getBirthdayReminderSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('ignores legacy global keys (enabled / onlyImportantPeople) from older versions', async () => {
    storage.getItem.mockResolvedValue(
      JSON.stringify({ enabled: false, onlyImportantPeople: true, daysBefore: 3, remindOnDay: false })
    );
    mockRows = [person()];
    await expect(scheduleBirthdayReminders()).resolves.toBe(1); // "enabled: false" no longer blocks
  });

  it('saving persists and reschedules', async () => {
    mockRows = [person()];
    await saveBirthdayReminderSettings({ daysBefore: 1, remindOnDay: false });
    expect(storage.setItem).toHaveBeenCalledWith(
      'birthday_reminder_settings',
      JSON.stringify({ daysBefore: 1, remindOnDay: false })
    );
    expect(N.scheduleNotificationAsync).toHaveBeenCalled();
  });
});

// ---- calendar ------------------------------------------------------------

describe('birthdayEventRange', () => {
  const now = new Date(2026, 9, 9);
  const dob = new Date(1990, 10, 1); // 1 Nov

  it('android: all-day event spans UTC midnight to UTC midnight (CalendarContract rule)', () => {
    const { startDate, endDate } = birthdayEventRange(dob, 'android', now);
    expect(startDate.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(endDate.toISOString()).toBe('2026-11-02T00:00:00.000Z');
  });

  it('ios: all-day event spans local midnight to local midnight', () => {
    const { startDate, endDate } = birthdayEventRange(dob, 'ios', now);
    expect(startDate).toEqual(new Date(2026, 10, 1));
    expect(endDate).toEqual(new Date(2026, 10, 2));
  });

  it('ios west of UTC: still lands on the right local day (UTC midnight would be a day early)', () => {
    withTZ('America/New_York', () => {
      const { startDate } = birthdayEventRange(new Date(1990, 10, 1), 'ios', new Date(2026, 9, 9));
      expect([startDate.getMonth(), startDate.getDate(), startDate.getHours()]).toEqual([10, 1, 0]);
    });
  });

  it('android east of UTC: date is still the birthday in UTC', () => {
    withTZ('Asia/Tokyo', () => {
      const { startDate } = birthdayEventRange(new Date(1990, 10, 1), 'android', new Date(2026, 9, 9));
      expect(startDate.toISOString().slice(0, 10)).toBe('2026-11-01');
    });
  });

  it('a birthday today is put on today, not next year', () => {
    const { startDate } = birthdayEventRange(new Date(1990, 9, 9), 'android', new Date(2026, 9, 9, 18));
    expect(startDate.toISOString().slice(0, 10)).toBe('2026-10-09');
  });

  it('spans exactly one day across the year end', () => {
    const dec31 = new Date(1990, 11, 31);
    const a = birthdayEventRange(dec31, 'android', now);
    expect(a.endDate.getTime() - a.startDate.getTime()).toBe(86400000);
    expect(a.endDate.toISOString().slice(0, 10)).toBe('2027-01-01');
    const i = birthdayEventRange(dec31, 'ios', now);
    expect(i.startDate).toEqual(new Date(2026, 11, 31));
    expect(i.endDate).toEqual(new Date(2027, 0, 1));
  });
});

describe('addBirthdayToCalendar', () => {
  it.each(['android', 'ios'])('%s: opens the OS dialog with a yearly all-day event', async (os) => {
    platform.OS = os;
    await addBirthdayToCalendar(new Date(1990, 10, 1), "🎂 Ala's birthday");
    expect(C.createEventInCalendarAsync).toHaveBeenCalledTimes(1);
    const [event] = C.createEventInCalendarAsync.mock.calls[0];
    expect(event).toMatchObject({
      title: "🎂 Ala's birthday",
      allDay: true,
      recurrenceRule: { frequency: 'yearly' },
    });
    expect(event!.startDate).toEqual(birthdayEventRange(new Date(1990, 10, 1), os).startDate);
    expect(event!.endDate).toEqual(birthdayEventRange(new Date(1990, 10, 1), os).endDate);
  });

  it('propagates a failure (no calendar app) so the UI can show an error', async () => {
    C.createEventInCalendarAsync.mockRejectedValueOnce(new Error('No activity found'));
    await expect(addBirthdayToCalendar(new Date(1990, 10, 1), 'x')).rejects.toThrow('No activity found');
  });
});

// ---- translations --------------------------------------------------------

describe('translations', () => {
  const keys = [
    'notifyBeforeTitle',
    'notifyBeforeBody',
    'notifyTodayTitle',
    'notifyTodayBody',
    'calendarTitle',
    'calendarFailed',
    'addToCalendar',
    'perPersonHint',
    'people',
    'today',
    'inDays_one',
    'inDays_other',
    'ageYears_other',
    'noMatch',
  ];

  it.each([
    ['en', en],
    ['pl', pl],
  ])('%s has every birthday string with the right placeholders', (_lang, dict) => {
    const br = (dict as { birthdayReminders: Record<string, string> }).birthdayReminders;
    for (const k of keys) expect(br[k]).toBeTruthy();
    expect(br.notifyBeforeBody).toContain('{{name}}');
    expect(br.notifyBeforeBody).toContain('{{count}}');
    expect(br.notifyTodayBody).toContain('{{name}}');
    expect(br.calendarTitle).toContain('{{name}}');
    const dates = (dict as { dates: Record<string, string> }).dates;
    for (const k of ['reminderOn', 'reminderOff', 'addToCalendar']) expect(dates[k]).toBeTruthy();
  });
});
