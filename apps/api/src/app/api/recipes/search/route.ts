import { NextResponse } from 'next/server';
import type { DietaryRestriction, RecipeSearchRequest } from '@pantry-and-me/shared';
import { resolveRecipeSearchProvider, searchRecipeArticles } from '@/lib/recipe-search';
import { liveProviderUnavailableMessage, mockProviderBlocked } from '@/lib/live-providers';
import { providerFailureResponse } from '@/lib/provider-errors';

const ALLOWED_DIETARY: DietaryRestriction[] = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RecipeSearchRequest;

    if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) {
      return NextResponse.json(
        { error: 'At least one ingredient is required.' },
        { status: 400 },
      );
    }

    const ingredients = body.ingredients
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 20);

    const dietary = (body.dietary ?? []).filter((item): item is DietaryRestriction =>
      ALLOWED_DIETARY.includes(item as DietaryRestriction),
    );

    const excluded = (body.excluded ?? [])
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 20);

    if (mockProviderBlocked(resolveRecipeSearchProvider())) {
      return NextResponse.json({ error: liveProviderUnavailableMessage('search') }, { status: 503 });
    }

    const { query, results, provider } = await searchRecipeArticles(ingredients, dietary, excluded);

    return NextResponse.json({ query, results, provider });
  } catch (error) {
    console.error('Recipe search failed:', error);
    const failure = providerFailureResponse(error, 'search');
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'POST ingredients to search for recipe articles.',
  });
}
