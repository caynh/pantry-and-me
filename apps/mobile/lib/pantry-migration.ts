import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Ingredient, SavedRecipe, UserPreferences } from '@pantry-and-me/shared';
import { supabase } from '@/lib/supabase';

const SNAPSHOT_KEY = 'pantry-and-me:pending-pantry-merge';
const LOCAL_INGREDIENTS_KEY = 'pantry-and-me:ingredients';
const LOCAL_RECIPES_KEY = 'pantry-and-me:saved-recipes';
const LOCAL_PREFERENCES_KEY = 'pantry-and-me:preferences';

export interface PantrySnapshot {
  fromUserId: string;
  capturedAt: string;
  ingredients: Ingredient[];
  recipes: SavedRecipe[];
  preferences: Partial<UserPreferences>;
}

/**
 * Serializes merge work so a refresh that starts while the app is
 * backgrounded cannot read a half-written pantry.
 */
let mergeGate: Promise<void> = Promise.resolve();

export function waitForPendingMerge(): Promise<void> {
  return mergeGate;
}

function queueMerge(work: () => Promise<void>): Promise<void> {
  const next = mergeGate.then(work, work);
  mergeGate = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export async function loadPendingSnapshot(): Promise<PantrySnapshot | null> {
  const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PantrySnapshot;
    if (!parsed?.fromUserId || !Array.isArray(parsed.ingredients)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function savePendingSnapshot(snapshot: PantrySnapshot): Promise<void> {
  await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export async function clearPendingSnapshot(): Promise<void> {
  await AsyncStorage.removeItem(SNAPSHOT_KEY);
}

/** Drops pantry copies on this device after the cloud account is deleted. */
export async function clearDevicePantry(): Promise<void> {
  await AsyncStorage.multiRemove([
    LOCAL_INGREDIENTS_KEY,
    LOCAL_RECIPES_KEY,
    LOCAL_PREFERENCES_KEY,
    SNAPSHOT_KEY,
  ]);
}

async function readLocalJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Step 1 of a claim: photograph the anonymous pantry *before* any session
 * swap. RLS only lets this user read their own rows, so this has to happen
 * while they are still the anonymous UID.
 *
 * The snapshot is written to disk first so a mid-migration backgrounding
 * can resume from the same payload instead of starting over or losing rows.
 */
export async function captureAnonymousPantry(userId: string): Promise<PantrySnapshot> {
  const localIngredients = await readLocalJson<Ingredient[]>(LOCAL_INGREDIENTS_KEY, []);
  const localRecipes = await readLocalJson<SavedRecipe[]>(LOCAL_RECIPES_KEY, []);
  const localPreferences = await readLocalJson<Partial<UserPreferences>>(
    LOCAL_PREFERENCES_KEY,
    {},
  );

  let cloudIngredients: Ingredient[] = [];
  let cloudRecipes: SavedRecipe[] = [];
  let cloudPreferences: Partial<UserPreferences> = {};

  if (supabase) {
    const [ingredientResult, recipeResult, preferenceResult] = await Promise.all([
      supabase.from('ingredients').select('*').eq('user_id', userId),
      supabase.from('saved_recipes').select('*').eq('user_id', userId),
      supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    if (!ingredientResult.error) {
      cloudIngredients = (ingredientResult.data ?? []).map(mapIngredientRow);
    }
    if (!recipeResult.error) {
      cloudRecipes = (recipeResult.data ?? []).map(mapRecipeRow);
    }
    if (!preferenceResult.error && preferenceResult.data) {
      cloudPreferences = mapPreferenceRow(preferenceResult.data);
    }
  }

  const snapshot: PantrySnapshot = {
    fromUserId: userId,
    capturedAt: new Date().toISOString(),
    ingredients: dedupeIngredientsByName([...cloudIngredients, ...localIngredients]),
    recipes: dedupeRecipesByUrl([...cloudRecipes, ...localRecipes]),
    preferences: { ...localPreferences, ...cloudPreferences },
  };

  await savePendingSnapshot(snapshot);
  return snapshot;
}

/**
 * Step 2 of a claim: the user is now signed into the destination account.
 * Writes are idempotent — a second pass skips names/URLs that already exist
 * — so a resume after a crash cannot duplicate rows.
 */
export async function applySnapshotToCurrentUser(
  snapshot: PantrySnapshot,
  destUserId: string,
): Promise<void> {
  if (snapshot.fromUserId === destUserId) {
    await clearPendingSnapshot();
    return;
  }

  return queueMerge(async () => {
    if (!supabase) {
      await clearPendingSnapshot();
      return;
    }

    const { data: existingIngredients, error: existingIngredientError } = await supabase
      .from('ingredients')
      .select('name')
      .eq('user_id', destUserId);
    if (existingIngredientError) throw existingIngredientError;

    const existingNames = new Set(
      (existingIngredients ?? []).map((row) => String(row.name).trim().toLowerCase()),
    );

    const ingredientsToInsert = snapshot.ingredients
      .filter((item) => !existingNames.has(item.name.trim().toLowerCase()))
      .map((item) => ({
        id: item.id,
        user_id: destUserId,
        name: item.name,
        quantity: item.quantity ?? null,
        unit: item.unit ?? null,
        location: item.location,
        source: item.source,
        expiration_date: item.expirationDate ?? null,
        notes: item.notes ?? null,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      }));

    if (ingredientsToInsert.length > 0) {
      const { error } = await supabase
        .from('ingredients')
        .upsert(ingredientsToInsert, { onConflict: 'id' });
      if (error) throw error;
    }

    const { data: existingRecipes, error: existingRecipeError } = await supabase
      .from('saved_recipes')
      .select('url')
      .eq('user_id', destUserId);
    if (existingRecipeError && !isMissingRelation(existingRecipeError)) throw existingRecipeError;

    const existingUrls = new Set((existingRecipes ?? []).map((row) => String(row.url)));
    const recipesToInsert = snapshot.recipes
      .filter((item) => !existingUrls.has(item.url))
      .map((item) => ({
        id: item.id,
        user_id: destUserId,
        title: item.title,
        url: item.url,
        snippet: item.snippet,
        thumbnail: item.thumbnail ?? null,
        rating: item.rating ?? null,
        review_count: item.reviewCount ?? null,
        notes: item.notes ?? null,
        saved_at: item.savedAt,
        updated_at: item.updatedAt,
      }));

    if (recipesToInsert.length > 0) {
      const { error } = await supabase
        .from('saved_recipes')
        .upsert(recipesToInsert, { onConflict: 'id' });
      if (error && !isMissingRelation(error)) throw error;
    }

    const { data: destPrefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', destUserId)
      .maybeSingle();

    const merged = mergePreferences(mapPreferenceRow(destPrefs ?? {}), snapshot.preferences);
    const { error: prefError } = await supabase.from('user_preferences').upsert({
      user_id: destUserId,
      dietary_restrictions: merged.dietaryRestrictions,
      excluded_ingredients: merged.excludedIngredients,
      expiration_reminders_enabled: merged.expirationRemindersEnabled,
      expiration_lead_days: merged.expirationLeadDays,
      updated_at: new Date().toISOString(),
    });
    if (prefError && !isMissingColumn(prefError) && !isMissingRelation(prefError)) {
      throw prefError;
    }

    await AsyncStorage.setItem(LOCAL_PREFERENCES_KEY, JSON.stringify(merged));
    await AsyncStorage.removeItem(LOCAL_INGREDIENTS_KEY);
    await clearPendingSnapshot();
  });
}

/**
 * Called on launch. If a snapshot is sitting on disk and this session is
 * already the destination account, finish the write. If we are still the
 * anonymous user who created it, leave it — they have not chosen yet.
 */
export async function resumePendingMerge(currentUserId: string | null): Promise<void> {
  const snapshot = await loadPendingSnapshot();
  if (!snapshot || !currentUserId) return;
  if (snapshot.fromUserId === currentUserId) return;

  await applySnapshotToCurrentUser(snapshot, currentUserId);
}

function dedupeIngredientsByName(items: Ingredient[]): Ingredient[] {
  const seen = new Set<string>();
  const next: Ingredient[] = [];

  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(item);
  }

  return next;
}

function dedupeRecipesByUrl(items: SavedRecipe[]): SavedRecipe[] {
  const seen = new Set<string>();
  const next: SavedRecipe[] = [];

  for (const item of items) {
    if (!item.url || seen.has(item.url)) continue;
    seen.add(item.url);
    next.push(item);
  }

  return next;
}

function mergePreferences(
  dest: Partial<UserPreferences>,
  source: Partial<UserPreferences>,
): UserPreferences {
  const dietary = uniqueStrings([
    ...(dest.dietaryRestrictions ?? []),
    ...(source.dietaryRestrictions ?? []),
  ]);
  const excluded = uniqueStrings([
    ...(dest.excludedIngredients ?? []),
    ...(source.excludedIngredients ?? []),
  ]);

  return {
    dietaryRestrictions: dietary as UserPreferences['dietaryRestrictions'],
    excludedIngredients: excluded,
    expirationRemindersEnabled: Boolean(
      dest.expirationRemindersEnabled || source.expirationRemindersEnabled,
    ),
    expirationLeadDays: dest.expirationLeadDays ?? source.expirationLeadDays ?? 3,
  };
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(value);
  }
  return next;
}

function mapIngredientRow(row: Record<string, unknown>): Ingredient {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : undefined,
    name: String(row.name),
    quantity: row.quantity != null ? Number(row.quantity) : undefined,
    unit: row.unit ? String(row.unit) : undefined,
    location: (row.location as Ingredient['location']) ?? 'pantry',
    source: (row.source as Ingredient['source']) ?? 'manual',
    expirationDate: row.expiration_date ? String(row.expiration_date) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapRecipeRow(row: Record<string, unknown>): SavedRecipe {
  return {
    id: String(row.id),
    title: String(row.title),
    url: String(row.url),
    snippet: String(row.snippet ?? ''),
    thumbnail: row.thumbnail ? String(row.thumbnail) : undefined,
    rating: row.rating != null ? Number(row.rating) : undefined,
    reviewCount: row.review_count != null ? Number(row.review_count) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    savedAt: String(row.saved_at),
    updatedAt: String(row.updated_at),
  };
}

function mapPreferenceRow(row: Record<string, unknown>): Partial<UserPreferences> {
  return {
    dietaryRestrictions: Array.isArray(row.dietary_restrictions)
      ? (row.dietary_restrictions as UserPreferences['dietaryRestrictions'])
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

function isMissingRelation(error: { message?: string; code?: string }): boolean {
  return error.code === '42P01' || /relation .* does not exist/i.test(error.message ?? '');
}

function isMissingColumn(error: { message?: string; code?: string }): boolean {
  return error.code === '42703' || /column .* does not exist/i.test(error.message ?? '');
}
