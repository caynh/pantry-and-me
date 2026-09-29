import type { RecipeSearchResult } from '@pantry-and-me/shared';

interface SerpApiOrganicResult {
  title?: string;
  link?: string;
  snippet?: string;
  thumbnail?: string;
  rating?: number;
  reviews?: number;
  rich_snippet?: {
    top?: {
      detected_extensions?: {
        rating?: number;
        reviews?: number;
        rating_out_of?: number;
      };
    };
    bottom?: {
      detected_extensions?: {
        rating?: number;
        reviews?: number;
      };
    };
  };
}

interface SerpApiResponse {
  organic_results?: SerpApiOrganicResult[];
  error?: string;
}

export async function searchWithSerpApi(
  query: string,
  ingredients: string[],
): Promise<RecipeSearchResult[]> {
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    throw new Error('SERPAPI_API_KEY is not configured.');
  }

  const params = new URLSearchParams({
    engine: 'google',
    q: query,
    api_key: apiKey,
    num: '10',
  });

  const response = await fetch(`https://serpapi.com/search.json?${params}`);
  const data = (await response.json()) as SerpApiResponse;

  if (!response.ok || data.error) {
    throw new Error(data.error ?? `SerpApi request failed with HTTP ${response.status}`);
  }

  const normalizedIngredients = ingredients.map((item) => item.trim().toLowerCase());

  return (data.organic_results ?? [])
    .map((item) => {
      const haystack = `${item.title ?? ''} ${item.snippet ?? ''}`.toLowerCase();
      const matchedIngredients = normalizedIngredients.filter((name) => haystack.includes(name));
      const { rating, reviewCount } = extractRating(item);

      return {
        title: item.title ?? 'Untitled recipe',
        url: item.link ?? '',
        snippet: item.snippet ?? '',
        thumbnail: item.thumbnail,
        matchedIngredients,
        rating,
        reviewCount,
      };
    })
    .filter((item) => item.url.length > 0);
}

function extractRating(item: SerpApiOrganicResult): {
  rating?: number;
  reviewCount?: number;
} {
  const extensions =
    item.rich_snippet?.top?.detected_extensions ??
    item.rich_snippet?.bottom?.detected_extensions;

  const rawRating = item.rating ?? extensions?.rating;
  const rawReviews = item.reviews ?? extensions?.reviews;

  const rating =
    typeof rawRating === 'number' && Number.isFinite(rawRating)
      ? Math.min(5, Math.max(0, rawRating))
      : undefined;

  const reviewCount =
    typeof rawReviews === 'number' && Number.isFinite(rawReviews) && rawReviews >= 0
      ? Math.round(rawReviews)
      : undefined;

  return { rating, reviewCount };
}
