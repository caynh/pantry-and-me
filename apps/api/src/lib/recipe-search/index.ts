import type { DietaryRestriction, RecipeSearchResult } from '@pantry-and-me/shared';
import {
  buildRecipeQuery,
  filterIngredientsForDiet,
} from '@/lib/recipe-search/build-query';
import { getMockResults } from '@/lib/recipe-search/providers/mock';
import { searchWithSerpApi } from '@/lib/recipe-search/providers/serpapi';
import {
  resolveRecipeSearchProvider,
  type RecipeSearchOutcome,
} from '@/lib/recipe-search/types';

export { buildRecipeQuery, filterIngredientsForDiet } from '@/lib/recipe-search/build-query';
export {
  isRecipeSearchConfigured,
  resolveRecipeSearchProvider,
  type RecipeSearchProvider,
} from '@/lib/recipe-search/types';

/** Words that disqualify a result when a diet is active (checked against title + snippet). */
const RESULT_BLOCKLIST: Partial<Record<DietaryRestriction, string[]>> = {
  vegetarian: [
    'chicken',
    'beef',
    'pork',
    'turkey',
    'lamb',
    'bacon',
    'ham',
    'sausage',
    'steak',
    'meatball',
    'fish',
    'salmon',
    'tuna',
    'shrimp',
    'prawn',
    'crab',
    'lobster',
    'anchovy',
    'clam',
    'mussel',
    'oyster',
    'scallop',
    'prosciutto',
    'pepperoni',
    'chorizo',
  ],
  vegan: [
    'chicken',
    'beef',
    'pork',
    'turkey',
    'lamb',
    'bacon',
    'ham',
    'sausage',
    'steak',
    'meatball',
    'fish',
    'salmon',
    'tuna',
    'shrimp',
    'egg',
    'eggs',
    'butter',
    'cheese',
    'cream',
    'yogurt',
    'yoghurt',
    'honey',
    'milk',
  ],
};

export async function searchRecipeArticles(
  ingredients: string[],
  dietary: DietaryRestriction[] = [],
  excluded: string[] = [],
): Promise<RecipeSearchOutcome> {
  const allowedIngredients = filterIngredientsForDiet(
    filterIngredientsForExclusions(ingredients, excluded),
    dietary,
  );

  // If every pantry item conflicts with the diet, search on diet terms alone
  // instead of putting chicken back into a vegetarian query.
  const queryIngredients = allowedIngredients;
  const query = buildRecipeQuery(queryIngredients, dietary, excluded);
  const provider = resolveRecipeSearchProvider();

  const rawResults =
    provider === 'mock'
      ? getMockResults(queryIngredients.length > 0 ? queryIngredients : ['vegetables'], query)
      : await searchWithSerpApi(query, queryIngredients);

  return {
    query,
    provider,
    results: filterResults(rawResults, dietary, excluded),
  };
}

function filterIngredientsForExclusions(ingredients: string[], excluded: string[]): string[] {
  const terms = excluded.map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (terms.length === 0) return ingredients;

  return ingredients.filter((ingredient) => {
    const haystack = ingredient.trim().toLowerCase();
    return !terms.some((term) => containsFoodTerm(haystack, term));
  });
}

function filterResults(
  results: RecipeSearchResult[],
  dietary: DietaryRestriction[],
  excluded: string[],
): RecipeSearchResult[] {
  const blocked = [
    ...dietary.flatMap((diet) => RESULT_BLOCKLIST[diet] ?? []),
    ...excluded.map((item) => item.trim().toLowerCase()).filter(Boolean),
  ];
  if (blocked.length === 0) return results;

  return results.filter((result) => {
    const haystack = `${result.title} ${result.snippet}`.toLowerCase();
    return !blocked.some((term) => containsFoodTerm(haystack, term));
  });
}

/** Avoid matching "egg" inside "eggplant". */
function containsFoodTerm(haystack: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'i').test(haystack);
}
