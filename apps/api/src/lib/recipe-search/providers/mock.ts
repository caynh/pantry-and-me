import type { RecipeSearchResult } from '@pantry-and-me/shared';

export function getMockResults(ingredients: string[], query: string): RecipeSearchResult[] {
  const names = ingredients.length ? ingredients : ['pantry staples'];
  const label = names.slice(0, 3).join(', ');

  return [
    {
      title: `${label} skillet dinner`,
      url: 'https://example.com/mock-recipe-1',
      snippet: `A quick weeknight recipe using ${label}. Add SERPAPI_API_KEY to apps/api/.env.local for live results.`,
      matchedIngredients: names.slice(0, 2),
      rating: 4.6,
      reviewCount: 128,
    },
    {
      title: `Easy ${names[0] ?? 'pantry'} bowl`,
      url: 'https://example.com/mock-recipe-2',
      snippet: `Mock result for query: ${query}`,
      matchedIngredients: names.slice(0, 1),
      rating: 4.2,
      reviewCount: 54,
    },
    {
      title: `Roasted ${names[1] ?? names[0] ?? 'veggie'} tray bake`,
      url: 'https://example.com/mock-recipe-3',
      snippet: `One-pan roast with ${label}. Great for leftovers.`,
      matchedIngredients: names.slice(0, 3),
      rating: 4.8,
      reviewCount: 312,
    },
  ];
}
