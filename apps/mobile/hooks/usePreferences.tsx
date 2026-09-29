import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DIETARY_OPTIONS,
  type DietaryRestriction,
  type ExpirationLeadDays,
  type UserPreferences,
} from '@pantry-and-me/shared';
import { useAuth } from '@/hooks/useAuth';
import { waitForPendingMerge } from '@/lib/pantry-migration';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'pantry-and-me:preferences';

const ALLOWED_DIETARY = new Set(DIETARY_OPTIONS.map((option) => option.id));
const ALLOWED_LEAD_DAYS = new Set<ExpirationLeadDays>([1, 3, 7]);
const MAX_EXCLUDED_FOODS = 20;

const DEFAULT_PREFERENCES: UserPreferences = {
  dietaryRestrictions: [],
  excludedIngredients: [],
  expirationRemindersEnabled: false,
  expirationLeadDays: 3,
};

function sanitizePreferences(raw: Partial<UserPreferences>): UserPreferences {
  const lead = raw.expirationLeadDays;
  return {
    dietaryRestrictions: (raw.dietaryRestrictions ?? []).filter((item): item is DietaryRestriction =>
      ALLOWED_DIETARY.has(item as DietaryRestriction),
    ),
    excludedIngredients: normalizeExcluded(
      Array.isArray(raw.excludedIngredients) ? raw.excludedIngredients : [],
    ),
    expirationRemindersEnabled: Boolean(raw.expirationRemindersEnabled),
    expirationLeadDays:
      typeof lead === 'number' && ALLOWED_LEAD_DAYS.has(lead as ExpirationLeadDays)
        ? (lead as ExpirationLeadDays)
        : DEFAULT_PREFERENCES.expirationLeadDays,
  };
}

interface PreferencesContextValue {
  preferences: UserPreferences;
  loading: boolean;
  toggleDietary: (restriction: DietaryRestriction) => Promise<void>;
  addExcludedIngredient: (value: string) => Promise<void>;
  removeExcludedIngredient: (value: string) => Promise<void>;
  setExpirationRemindersEnabled: (enabled: boolean) => Promise<void>;
  setExpirationLeadDays: (days: ExpirationLeadDays) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const { userId } = useAuth();
  const useCloud = Boolean(supabase && userId);

  useEffect(() => {
    void (async () => {
      await waitForPendingMerge();

      if (useCloud && supabase && userId) {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (!error && data) {
          const next = sanitizePreferences(mapPreferenceRow(data));
          setPreferences(next);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          setLoading(false);
          return;
        }
      }

      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          setPreferences(sanitizePreferences(JSON.parse(raw) as Partial<UserPreferences>));
        } catch {
          setPreferences(DEFAULT_PREFERENCES);
        }
      }
      setLoading(false);
    })();
  }, [useCloud, userId]);

  const save = useCallback(async (next: UserPreferences) => {
    const sanitized = sanitizePreferences(next);
    setPreferences(sanitized);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));

    if (useCloud && supabase && userId) {
      await supabase.from('user_preferences').upsert({
        user_id: userId,
        dietary_restrictions: sanitized.dietaryRestrictions,
        excluded_ingredients: sanitized.excludedIngredients,
        expiration_reminders_enabled: sanitized.expirationRemindersEnabled,
        expiration_lead_days: sanitized.expirationLeadDays,
        updated_at: new Date().toISOString(),
      });
    }
  }, [useCloud, userId]);

  const toggleDietary = useCallback(
    async (restriction: DietaryRestriction) => {
      const has = preferences.dietaryRestrictions.includes(restriction);
      const dietaryRestrictions = has
        ? preferences.dietaryRestrictions.filter((item) => item !== restriction)
        : [...preferences.dietaryRestrictions, restriction];

      await save({ ...preferences, dietaryRestrictions });
    },
    [preferences, save],
  );

  const addExcludedIngredient = useCallback(
    async (value: string) => {
      const extras = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (extras.length === 0) return;

      await save({
        ...preferences,
        excludedIngredients: normalizeExcluded([...preferences.excludedIngredients, ...extras]),
      });
    },
    [preferences, save],
  );

  const removeExcludedIngredient = useCallback(
    async (value: string) => {
      const key = value.trim().toLowerCase();
      await save({
        ...preferences,
        excludedIngredients: preferences.excludedIngredients.filter(
          (item) => item.trim().toLowerCase() !== key,
        ),
      });
    },
    [preferences, save],
  );

  const setExpirationRemindersEnabled = useCallback(
    async (expirationRemindersEnabled: boolean) => {
      await save({ ...preferences, expirationRemindersEnabled });
    },
    [preferences, save],
  );

  const setExpirationLeadDays = useCallback(
    async (expirationLeadDays: ExpirationLeadDays) => {
      await save({ ...preferences, expirationLeadDays });
    },
    [preferences, save],
  );

  const value = useMemo(
    () => ({
      preferences,
      loading,
      toggleDietary,
      addExcludedIngredient,
      removeExcludedIngredient,
      setExpirationRemindersEnabled,
      setExpirationLeadDays,
    }),
    [
      loading,
      preferences,
      addExcludedIngredient,
      removeExcludedIngredient,
      setExpirationLeadDays,
      setExpirationRemindersEnabled,
      toggleDietary,
    ],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

function mapPreferenceRow(row: Record<string, unknown>): Partial<UserPreferences> {
  return {
    dietaryRestrictions: Array.isArray(row.dietary_restrictions)
      ? (row.dietary_restrictions as DietaryRestriction[])
      : undefined,
    excludedIngredients: Array.isArray(row.excluded_ingredients)
      ? (row.excluded_ingredients as string[])
      : undefined,
    expirationRemindersEnabled:
      row.expiration_reminders_enabled != null
        ? Boolean(row.expiration_reminders_enabled)
        : undefined,
    expirationLeadDays:
      row.expiration_lead_days === 1 || row.expiration_lead_days === 3 || row.expiration_lead_days === 7
        ? row.expiration_lead_days
        : undefined,
  };
}

function normalizeExcluded(items: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];

  for (const raw of items) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    next.push(trimmed);
    if (next.length >= MAX_EXCLUDED_FOODS) break;
  }

  return next;
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error('usePreferences must be used inside a PreferencesProvider.');
  }

  return context;
}
