import { db, getCurrentUserId } from '@/lib/db';
import { reminders, people } from '@/lib/db/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { and, desc, eq, isNull, gte, lt } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { Platform } from 'react-native';

// Lazy load notifications to avoid crash if not configured
let Notifications: any = null;
let notificationsInitialized = false;

function getNotifications() {
  if (!notificationsInitialized) {
    try {
      Notifications = require('expo-notifications');
      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      notificationsInitialized = true;
    } catch {
      // Silently fail - notifications not available in Expo Go
      notificationsInitialized = true;
    }
  }
  return Notifications;
}

export interface ReminderData {
  id: string;
  personId?: string;
  personName?: string;
  title: string;
  message?: string;
  reminderType: 'contact' | 'birthday' | 'anniversary' | 'custom';
  scheduledFor: Date;
  repeatInterval: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  status: 'pending' | 'sent' | 'cancelled';
  createdAt: Date;
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions() {
  const Notifications = getNotifications();
  if (!Notifications) return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

/**
 * Hook to get all reminders
 */
export function useReminders() {
  return useQuery({
    queryKey: ['reminders', 'all'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const results = await db
        .select({
          reminder: reminders,
          person: people,
        })
        .from(reminders)
        .leftJoin(people, eq(reminders.personId, people.id))
        .where(and(eq(reminders.userId, userId), isNull(reminders.deletedAt)))
        .orderBy(desc(reminders.scheduledFor));

      return results.map((r) => ({
        id: r.reminder.id,
        personId: r.reminder.personId || undefined,
        personName: r.person?.name || undefined,
        title: r.reminder.title,
        message: r.reminder.message || undefined,
        reminderType: r.reminder.reminderType as any,
        scheduledFor: new Date(r.reminder.scheduledFor),
        repeatInterval: r.reminder.repeatInterval as any,
        status: r.reminder.status as any,
        createdAt: new Date(r.reminder.createdAt),
      })) as ReminderData[];
    },
  });
}

/**
 * Hook to get upcoming reminders
 */
export function useUpcomingReminders() {
  return useQuery({
    queryKey: ['reminders', 'upcoming'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const results = await db
        .select({
          reminder: reminders,
          person: people,
        })
        .from(reminders)
        .leftJoin(people, eq(reminders.personId, people.id))
        .where(
          and(
            eq(reminders.userId, userId),
            isNull(reminders.deletedAt),
            eq(reminders.status, 'pending'),
            gte(reminders.scheduledFor, now),
            lt(reminders.scheduledFor, nextWeek)
          )
        )
        .orderBy(reminders.scheduledFor);

      return results.map((r) => ({
        id: r.reminder.id,
        personId: r.reminder.personId || undefined,
        personName: r.person?.name || undefined,
        title: r.reminder.title,
        message: r.reminder.message || undefined,
        reminderType: r.reminder.reminderType as any,
        scheduledFor: new Date(r.reminder.scheduledFor),
        repeatInterval: r.reminder.repeatInterval as any,
        status: r.reminder.status as any,
        createdAt: new Date(r.reminder.createdAt),
      })) as ReminderData[];
    },
  });
}

/**
 * Hook to get reminders for a person
 */
export function usePersonReminders(personId: string) {
  return useQuery({
    queryKey: ['reminders', 'person', personId],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const results = await db
        .select()
        .from(reminders)
        .where(
          and(
            eq(reminders.userId, userId),
            eq(reminders.personId, personId),
            isNull(reminders.deletedAt)
          )
        )
        .orderBy(desc(reminders.scheduledFor));

      return results.map((r) => ({
        id: r.id,
        personId: r.personId || undefined,
        title: r.title,
        message: r.message || undefined,
        reminderType: r.reminderType as any,
        scheduledFor: new Date(r.scheduledFor),
        repeatInterval: r.repeatInterval as any,
        status: r.status as any,
        createdAt: new Date(r.createdAt),
      })) as ReminderData[];
    },
    enabled: !!personId,
  });
}

/**
 * Hook to create a reminder
 */
export function useCreateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      personId?: string;
      title: string;
      message?: string;
      reminderType: 'contact' | 'birthday' | 'anniversary' | 'custom';
      scheduledFor: Date;
      repeatInterval?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    }) => {
      const userId = await getCurrentUserId();
      const reminderId = randomUUID();

      // Schedule the notification
      let notificationId: string | null = null;
      try {
        const hasPermission = await requestNotificationPermissions();
        const Notifications = getNotifications();
        if (Notifications && hasPermission && data.scheduledFor > new Date()) {
          notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: data.title,
              body: data.message || `Reminder: ${data.title}`,
              data: { reminderId, personId: data.personId },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: data.scheduledFor,
            },
          });
        }
      } catch (error) {
        console.error('Failed to schedule notification:', error);
      }

      const result = await db
        .insert(reminders)
        .values({
          id: reminderId,
          userId,
          personId: data.personId || null,
          title: data.title,
          message: data.message || null,
          reminderType: data.reminderType,
          scheduledFor: data.scheduledFor,
          repeatInterval: data.repeatInterval || 'none',
          notificationId,
          status: 'pending',
        })
        .returning();

      return result[0];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      if (data?.personId) {
        queryClient.invalidateQueries({ queryKey: ['reminders', 'person', data.personId] });
      }
    },
  });
}

/**
 * Hook to cancel a reminder
 */
export function useCancelReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      // Get reminder to find notification ID
      const reminder = await db.select().from(reminders).where(eq(reminders.id, reminderId)).limit(1);

      if (reminder.length > 0 && reminder[0].notificationId) {
        try {
          const Notifications = getNotifications();
          if (Notifications) {
            await Notifications.cancelScheduledNotificationAsync(reminder[0].notificationId);
          }
        } catch {
          // Notification may already be sent/cancelled
        }
      }

      await db
        .update(reminders)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(reminders.id, reminderId));

      return reminder[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

/**
 * Hook to delete a reminder
 */
export function useDeleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      // Get reminder to find notification ID
      const reminder = await db.select().from(reminders).where(eq(reminders.id, reminderId)).limit(1);

      if (reminder.length > 0 && reminder[0].notificationId) {
        try {
          const Notifications = getNotifications();
          if (Notifications) {
            await Notifications.cancelScheduledNotificationAsync(reminder[0].notificationId);
          }
        } catch {
          // Notification may already be sent/cancelled
        }
      }

      await db.update(reminders).set({ deletedAt: new Date() }).where(eq(reminders.id, reminderId));

      return reminder[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

/**
 * Hook to create a "contact person" reminder
 */
export function useCreateContactReminder() {
  const createReminder = useCreateReminder();

  return useMutation({
    mutationFn: async (data: {
      personId: string;
      personName: string;
      daysFromNow: number;
    }) => {
      const scheduledFor = new Date();
      scheduledFor.setDate(scheduledFor.getDate() + data.daysFromNow);
      scheduledFor.setHours(10, 0, 0, 0); // 10 AM

      return createReminder.mutateAsync({
        personId: data.personId,
        title: `Reach out to ${data.personName}`,
        message: `It's been a while since you contacted ${data.personName}. Consider reaching out!`,
        reminderType: 'contact',
        scheduledFor,
        repeatInterval: 'none',
      });
    },
  });
}
