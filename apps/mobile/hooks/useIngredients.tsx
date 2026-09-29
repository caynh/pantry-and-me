import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Ingredient, IngredientSource, StorageLocation } from '@pantry-and-me/shared';
import { useAuth } from '@/hooks/useAuth';
import { waitForPendingMerge } from '@/lib/pantry-migration';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'pantry-and-me:ingredients';

export interface IngredientInput {
  name: string;
  quantity?: number;
  unit?: string;
  location?: StorageLocation;
  source?: IngredientSource;
  expirationDate?: string;
  notes?: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres stores ingredient ids as `uuid`, so the app has to generate real ones. */
function generateId(): string {
  return Crypto.randomUUID();
}

/** Rewrites ids left over from before ids were UUIDs, so migration can insert them. */
function ensureUuid(id: string): string {
  return UUID_PATTERN.test(id) ? id : Crypto.randomUUID();
}

function createIngredient(input: IngredientInput): Ingredient {
  const now = new Date().toISOString();

  return {
    id: generateId(),
    name: input.name.trim(),
    quantity: input.quantity,
    unit: input.unit,
    location: input.location ?? 'pantry',
    source: input.source ?? 'manual',
    expirationDate: input.expirationDate,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
}

async function loadLocalIngredients(): Promise<Ingredient[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Ingredient[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveLocalIngredients(items: Ingredient[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

async function clearLocalIngredients(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

interface IngredientsContextValue {
  ingredients: Ingredient[];
  loading: boolean;
  error: string | null;
  isCloudSync: boolean;
  refresh: () => Promise<void>;
  addIngredient: (input: IngredientInput) => Promise<void>;
  addIngredients: (inputs: IngredientInput[]) => Promise<void>;
  updateIngredient: (
    id: string,
    updates: Partial<Omit<Ingredient, 'id' | 'createdAt'>>,
  ) => Promise<void>;
  removeIngredient: (id: string) => Promise<void>;
}

const IngredientsContext = createContext<IngredientsContextValue | null>(null);

export function IngredientsProvider({ children }: { children: ReactNode }) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useAuth();

  // Cloud writes require an authenticated user because row level security
  // matches ingredients.user_id against auth.uid().
  const useCloud = Boolean(supabase && userId);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await waitForPendingMerge();
      if (useCloud && supabase) {
        const { data, error: fetchError } = await supabase
          .from('ingredients')
          .select('*')
          .order('updated_at', { ascending: false });

        if (fetchError) throw fetchError;

        setIngredients((data ?? []).map(mapRowToIngredient));
        return;
      }

      setIngredients(await loadLocalIngredients());
    } catch (err) {
      setError('Could not load your ingredients. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  }, [useCloud]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const migrating = useRef(false);

  // The first time a session exists, anything already saved on the device is
  // handed to the account so switching to cloud sync never loses a pantry.
  useEffect(() => {
    if (!useCloud || !supabase || !userId || migrating.current) return;

    migrating.current = true;

    void (async () => {
      try {
        const local = await loadLocalIngredients();

        if (local.length === 0) return;

        const { error: uploadError } = await supabase
          .from('ingredients')
          .upsert(
            local.map((item) => mapIngredientToRow({ ...item, id: ensureUuid(item.id) }, userId)),
            { onConflict: 'id' },
          );

        if (uploadError) throw uploadError;

        await clearLocalIngredients();
        await refresh();
      } catch (err) {
        // Leave the local copy alone and allow another attempt next launch.
        migrating.current = false;
        setError('Could not move your saved items into the cloud. They are still on this device.');
      }
    })();
  }, [refresh, useCloud, userId]);

  const persistLocal = useCallback(async (updater: (current: Ingredient[]) => Ingredient[]) => {
    const current = await loadLocalIngredients();
    const next = updater(current);
    await saveLocalIngredients(next);
    setIngredients(next);
  }, []);

  const addIngredients = useCallback(
    async (inputs: IngredientInput[]) => {
      const items = inputs
        .filter((input) => input.name.trim().length > 0)
        .map((input) => createIngredient(input));

      if (items.length === 0) return;

      if (useCloud && supabase && userId) {
        const { error: insertError } = await supabase
          .from('ingredients')
          .insert(items.map((item) => mapIngredientToRow(item, userId)));
        if (insertError) throw new Error('Could not save those ingredients. Try again.');
        await refresh();
        return;
      }

      await persistLocal((current) => [...items, ...current]);
    },
    [persistLocal, refresh, useCloud, userId],
  );

  const addIngredient = useCallback(
    async (input: IngredientInput) => {
      await addIngredients([input]);
    },
    [addIngredients],
  );

  const updateIngredient = useCallback(
    async (id: string, updates: Partial<Omit<Ingredient, 'id' | 'createdAt'>>) => {
      const updatedAt = new Date().toISOString();

      if (useCloud && supabase) {
        const { error: updateError } = await supabase
          .from('ingredients')
          .update({ ...mapUpdatesToRow(updates), updated_at: updatedAt })
          .eq('id', id);
        if (updateError) throw new Error('Could not save those changes. Try again.');
        await refresh();
        return;
      }

      await persistLocal((current) =>
        current.map((item) => (item.id === id ? { ...item, ...updates, updatedAt } : item)),
      );
    },
    [persistLocal, refresh, useCloud],
  );

  const removeIngredient = useCallback(
    async (id: string) => {
      if (useCloud && supabase) {
        const { error: deleteError } = await supabase.from('ingredients').delete().eq('id', id);
        if (deleteError) throw new Error('Could not remove that ingredient. Try again.');
        await refresh();
        return;
      }

      await persistLocal((current) => current.filter((item) => item.id !== id));
    },
    [persistLocal, refresh, useCloud],
  );

  const value = useMemo<IngredientsContextValue>(
    () => ({
      ingredients,
      loading,
      error,
      isCloudSync: useCloud,
      refresh,
      addIngredient,
      addIngredients,
      updateIngredient,
      removeIngredient,
    }),
    [
      addIngredient,
      addIngredients,
      error,
      ingredients,
      loading,
      refresh,
      removeIngredient,
      updateIngredient,
      useCloud,
    ],
  );

  return <IngredientsContext.Provider value={value}>{children}</IngredientsContext.Provider>;
}

export function useIngredients(): IngredientsContextValue {
  const context = useContext(IngredientsContext);

  if (!context) {
    throw new Error('useIngredients must be used inside an IngredientsProvider.');
  }

  return context;
}

function mapRowToIngredient(row: Record<string, unknown>): Ingredient {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : undefined,
    name: String(row.name),
    quantity: row.quantity != null ? Number(row.quantity) : undefined,
    unit: row.unit ? String(row.unit) : undefined,
    location: (row.location as StorageLocation) ?? 'pantry',
    source: (row.source as IngredientSource) ?? 'manual',
    expirationDate: row.expiration_date ? String(row.expiration_date) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapIngredientToRow(item: Ingredient, userId: string) {
  return {
    id: item.id,
    user_id: userId,
    name: item.name,
    quantity: item.quantity ?? null,
    unit: item.unit ?? null,
    location: item.location,
    source: item.source,
    expiration_date: item.expirationDate ?? null,
    notes: item.notes ?? null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function mapUpdatesToRow(updates: Partial<Omit<Ingredient, 'id' | 'createdAt'>>) {
  const row: Record<string, unknown> = {};

  if (updates.name !== undefined) row.name = updates.name;
  if (updates.location !== undefined) row.location = updates.location;
  if (updates.source !== undefined) row.source = updates.source;

  // Optional columns use `in` so that passing an explicit undefined clears the
  // column instead of being dropped from the update.
  if ('quantity' in updates) row.quantity = updates.quantity ?? null;
  if ('unit' in updates) row.unit = updates.unit ?? null;
  if ('expirationDate' in updates) row.expiration_date = updates.expirationDate ?? null;
  if ('notes' in updates) row.notes = updates.notes ?? null;

  return row;
}
