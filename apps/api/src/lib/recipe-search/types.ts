import type { RecipeSearchResult } from '@pantry-and-me/shared';

export type RecipeSearchProvider = 'serpapi' | 'mock';

export interface RecipeSearchOutcome {
  query: string;
  results: RecipeSearchResult[];
  provider: RecipeSearchProvider;
}

export function resolveRecipeSearchProvider(): RecipeSearchProvider {
  if (process.env.RECIPE_SEARCH_PROVIDER?.toLowerCase() === 'mock') return 'mock';

  return process.env.SERPAPI_API_KEY ? 'serpapi' : 'mock';
}

export function isRecipeSearchConfigured(): boolean {
  return resolveRecipeSearchProvider() !== 'mock';
}
