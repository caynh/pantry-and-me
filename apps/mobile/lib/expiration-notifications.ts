import { Platform } from 'react-native';
import type { ExpirationLeadDays, Ingredient } from '@pantry-and-me/shared';
import { reminderFireDate } from '@/lib/expiration';

const NOTIFICATION_ID_PREFIX = 'exp-';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null | undefined;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (Platform.OS === 'web') return null;
  if (notificationsModule !== undefined) return notificationsModule;

  try {
    notificationsModule = await import('expo-notifications');
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    return notificationsModule;
  } catch {
    notificationsModule = null;
    return null;
  }
}

function notificationIdForIngredient(ingredientId: string): string {
  return `${NOTIFICATION_ID_PREFIX}${ingredientId}`;
}

export async function ensureReminderPermissions(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return (
    requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

/**
 * Cancel all expiration reminders and reschedule from the current pantry.
 * No-op on web, when disabled, or when permission is denied.
 */
export async function syncExpirationNotifications(options: {
  enabled: boolean;
  leadDays: ExpirationLeadDays;
  ingredients: Ingredient[];
}): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith(NOTIFICATION_ID_PREFIX))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );

  if (!options.enabled) return;

  const allowed = await ensureReminderPermissions();
  if (!allowed) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('expiration-reminders', {
      name: 'Expiration reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const now = new Date();

  for (const ingredient of options.ingredients) {
    if (!ingredient.expirationDate) continue;
    const fireAt = reminderFireDate(ingredient.expirationDate, options.leadDays, now);
    if (!fireAt) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: notificationIdForIngredient(ingredient.id),
      content: {
        title: 'Expiring soon',
        body: `${ingredient.name} expires on ${ingredient.expirationDate}.`,
        data: { ingredientId: ingredient.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        channelId: Platform.OS === 'android' ? 'expiration-reminders' : undefined,
      },
    });
  }
}
