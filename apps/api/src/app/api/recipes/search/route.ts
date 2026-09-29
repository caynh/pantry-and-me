import { NextResponse } from 'next/server';
import type { DietaryRestriction, RecipeSearchRequest } from '@pantry-and-me/shared';
import { searchRecipeArticles } from '@/lib/recipe-search';

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

    const { query, results, provider } = await searchRecipeArticles(ingredients, dietary, excluded);

    return NextResponse.json({ query, results, provider });
  } catch (error) {
    console.error('Recipe search failed:', error);
    return NextResponse.json({ error: 'Recipe search failed.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'POST ingredients to search for recipe articles.',
  });
}
