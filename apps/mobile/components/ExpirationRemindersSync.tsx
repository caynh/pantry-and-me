import { useEffect, useRef } from 'react';
import { useIngredients } from '@/hooks/useIngredients';
import { usePreferences } from '@/hooks/usePreferences';
import {
  ensureReminderPermissions,
  syncExpirationNotifications,
} from '@/lib/expiration-notifications';

/**
 * Keeps local expiration notifications in sync with the pantry and Settings.
 * Renders nothing.
 */
export function ExpirationRemindersSync() {
  const { ingredients, loading: ingredientsLoading } = useIngredients();
  const { preferences, loading: preferencesLoading } = usePreferences();
  const previousEnabled = useRef(preferences.expirationRemindersEnabled);

  useEffect(() => {
    if (ingredientsLoading || preferencesLoading) return;

    const justEnabled =
      preferences.expirationRemindersEnabled && !previousEnabled.current;
    previousEnabled.current = preferences.expirationRemindersEnabled;

    void (async () => {
      if (justEnabled) {
        const allowed = await ensureReminderPermissions();
        if (!allowed) {
          // Still sync so we cancel any leftovers; schedules need permission.
        }
      }

      await syncExpirationNotifications({
        enabled: preferences.expirationRemindersEnabled,
        leadDays: preferences.expirationLeadDays,
        ingredients,
      });
    })();
  }, [
    ingredients,
    ingredientsLoading,
    preferences.expirationLeadDays,
    preferences.expirationRemindersEnabled,
    preferencesLoading,
  ]);

  return null;
}
