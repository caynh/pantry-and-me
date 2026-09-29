import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { RecipeSearchResult, SavedRecipe } from '@pantry-and-me/shared';
import * as Crypto from 'expo-crypto';
import { useAuth } from '@/hooks/useAuth';
import { waitForPendingMerge } from '@/lib/pantry-migration';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'pantry-and-me:saved-recipes';

interface SavedRecipesContextValue {
  recipes: SavedRecipe[];
  loading: boolean;
  isSaved: (url: string) => boolean;
  getById: (id: string) => SavedRecipe | undefined;
  toggleSave: (result: RecipeSearchResult) => Promise<void>;
  updateNotes: (id: string, notes: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const SavedRecipesContext = createContext<SavedRecipesContextValue | null>(null);

export function SavedRecipesProvider({ children }: { children: ReactNode }) {
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const { userId } = useAuth();
  const useCloud = Boolean(supabase && userId);
  const migrating = useRef(false);

  const persistLocal = useCallback(async (next: SavedRecipe[]) => {
    setRecipes(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      await waitForPendingMerge();

      if (useCloud && supabase) {
        const { data, error } = await supabase
          .from('saved_recipes')
          .select('*')
          .order('saved_at', { ascending: false });

        if (error) throw error;
        setRecipes((data ?? []).map(mapRowToRecipe));
        return;
      }

      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedRecipe[];
        if (Array.isArray(parsed)) setRecipes(parsed);
      }
    } catch {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as SavedRecipe[];
          if (Array.isArray(parsed)) setRecipes(parsed);
        } catch {
          // Keep whatever is already in memory.
        }
      }
    } finally {
      setLoading(false);
    }
  }, [useCloud]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!useCloud || !supabase || !userId || migrating.current) return;
    migrating.current = true;

    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const local = raw ? (JSON.parse(raw) as SavedRecipe[]) : [];
        if (!Array.isArray(local) || local.length === 0) return;

        const { error } = await supabase.from('saved_recipes').upsert(
          local.map((item) => mapRecipeToRow(item, userId)),
          { onConflict: 'id' },
        );
        if (error) throw error;
        await AsyncStorage.removeItem(STORAGE_KEY);
        await refresh();
      } catch {
        migrating.current = false;
      }
    })();
  }, [refresh, useCloud, userId]);

  const isSaved = useCallback(
    (url: string) => recipes.some((recipe) => recipe.url === url),
    [recipes],
  );

  const getById = useCallback(
    (id: string) => recipes.find((recipe) => recipe.id === id),
    [recipes],
  );

  const toggleSave = useCallback(
    async (result: RecipeSearchResult) => {
      const existing = recipes.find((recipe) => recipe.url === result.url);

      if (existing) {
        if (useCloud && supabase) {
          const { error } = await supabase.from('saved_recipes').delete().eq('id', existing.id);
          if (error) throw error;
          await refresh();
          return;
        }

        await persistLocal(recipes.filter((recipe) => recipe.id !== existing.id));
        return;
      }

      const now = new Date().toISOString();
      const saved: SavedRecipe = {
        id: Crypto.randomUUID(),
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        thumbnail: result.thumbnail,
        rating: result.rating,
        reviewCount: result.reviewCount,
        savedAt: now,
        updatedAt: now,
      };

      if (useCloud && supabase && userId) {
        const { error } = await supabase.from('saved_recipes').insert(mapRecipeToRow(saved, userId));
        if (error) throw error;
        await refresh();
        return;
      }

      await persistLocal([saved, ...recipes]);
    },
    [persistLocal, recipes, refresh, useCloud, userId],
  );

  const updateNotes = useCallback(
    async (id: string, notes: string) => {
      const trimmed = notes.trim();
      const updatedAt = new Date().toISOString();

      if (useCloud && supabase) {
        const { error } = await supabase
          .from('saved_recipes')
          .update({ notes: trimmed || null, updated_at: updatedAt })
          .eq('id', id);
        if (error) throw error;
        await refresh();
        return;
      }

      await persistLocal(
        recipes.map((recipe) =>
          recipe.id === id
            ? { ...recipe, notes: trimmed || undefined, updatedAt }
            : recipe,
        ),
      );
    },
    [persistLocal, recipes, refresh, useCloud],
  );

  const remove = useCallback(
    async (id: string) => {
      if (useCloud && supabase) {
        const { error } = await supabase.from('saved_recipes').delete().eq('id', id);
        if (error) throw error;
        await refresh();
        return;
      }

      await persistLocal(recipes.filter((recipe) => recipe.id !== id));
    },
    [persistLocal, recipes, refresh, useCloud],
  );

  const value = useMemo<SavedRecipesContextValue>(
    () => ({
      recipes,
      loading,
      isSaved,
      getById,
      toggleSave,
      updateNotes,
      remove,
    }),
    [getById, isSaved, loading, recipes, remove, toggleSave, updateNotes],
  );

  return <SavedRecipesContext.Provider value={value}>{children}</SavedRecipesContext.Provider>;
}

export function useSavedRecipes(): SavedRecipesContextValue {
  const context = useContext(SavedRecipesContext);

  if (!context) {
    throw new Error('useSavedRecipes must be used inside a SavedRecipesProvider.');
  }

  return context;
}

function mapRowToRecipe(row: Record<string, unknown>): SavedRecipe {
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

function mapRecipeToRow(item: SavedRecipe, userId: string) {
  return {
    id: item.id,
    user_id: userId,
    title: item.title,
    url: item.url,
    snippet: item.snippet,
    thumbnail: item.thumbnail ?? null,
    rating: item.rating ?? null,
    review_count: item.reviewCount ?? null,
    notes: item.notes ?? null,
    saved_at: item.savedAt,
    updated_at: item.updatedAt,
  };
}
