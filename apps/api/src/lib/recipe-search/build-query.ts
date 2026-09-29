import type { DietaryRestriction } from '@pantry-and-me/shared';

export const RECIPE_SITES = [
  'allrecipes.com',
  'seriouseats.com',
  'bbcgoodfood.com',
  'foodnetwork.com',
  'simplyrecipes.com',
  'budgetbytes.com',
  'cookieandkate.com',
];

// Google ignores terms past roughly 32 words, and the site: filters already
// consume several, so only the first few ingredients make it into the query.
const MAX_QUERY_INGREDIENTS = 8;
const MAX_QUERY_EXCLUSIONS = 8;

/** Foods that must not appear in the ingredient list or Google query for a diet. */
const DIETARY_FORBIDDEN: Record<DietaryRestriction, string[]> = {
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
    'meat',
    'fish',
    'salmon',
    'tuna',
    'shrimp',
    'prawn',
    'crab',
    'lobster',
    'anchovy',
    'anchovies',
    'clam',
    'mussel',
    'oyster',
    'scallop',
    'cod',
    'tilapia',
    'prosciutto',
    'pepperoni',
    'chorizo',
    'gelatin',
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
    'meat',
    'fish',
    'salmon',
    'tuna',
    'shrimp',
    'prawn',
    'crab',
    'lobster',
    'anchovy',
    'anchovies',
    'clam',
    'mussel',
    'oyster',
    'scallop',
    'cod',
    'tilapia',
    'prosciutto',
    'pepperoni',
    'chorizo',
    'gelatin',
    'egg',
    'eggs',
    'milk',
    'cream',
    'butter',
    'cheese',
    'yogurt',
    'yoghurt',
    'honey',
    'whey',
    'casein',
  ],
  'gluten-free': ['wheat', 'flour', 'bread', 'pasta', 'barley', 'rye', 'couscous', 'seitan'],
  'dairy-free': ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'yoghurt', 'whey', 'casein'],
  'nut-free': [
    'almond',
    'almonds',
    'cashew',
    'cashews',
    'walnut',
    'walnuts',
    'pecan',
    'pecans',
    'pistachio',
    'pistachios',
    'hazelnut',
    'hazelnuts',
    'peanut',
    'peanuts',
    'macadamia',
  ],
};

/** Extra Google -"term" exclusions beyond whatever is already in the pantry. */
const DIETARY_QUERY_EXCLUSIONS: Partial<Record<DietaryRestriction, string[]>> = {
  vegetarian: ['chicken', 'beef', 'pork', 'fish', 'meat', 'shrimp', 'bacon'],
  vegan: ['chicken', 'beef', 'pork', 'fish', 'meat', 'egg', 'cheese', 'butter', 'milk', 'honey'],
  'gluten-free': ['wheat', 'flour'],
  'dairy-free': ['cheese', 'butter', 'milk', 'cream'],
  'nut-free': ['peanut', 'almond', 'cashew', 'walnut'],
};

const DIETARY_QUERY_PHRASES: Record<DietaryRestriction, string> = {
  vegetarian: '"vegetarian"',
  vegan: '"vegan"',
  'gluten-free': '"gluten free" OR "gluten-free"',
  'dairy-free': '"dairy free" OR "dairy-free"',
  'nut-free': '"nut free" OR "nut-free"',
};

export function buildRecipeQuery(
  ingredients: string[],
  dietary: DietaryRestriction[] = [],
  excluded: string[] = [],
): string {
  const allowedIngredients = filterIngredientsForDiet(ingredients, dietary);

  const ingredientPart = allowedIngredients
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, MAX_QUERY_INGREDIENTS)
    .join(' ');

  const useSiteFilters = process.env.RECIPE_SEARCH_USE_SITE_FILTERS !== 'false';
  const sitePart = useSiteFilters
    ? `(${RECIPE_SITES.map((site) => `site:${site}`).join(' OR ')})`
    : '';

  const dietaryPart = dietary.map((item) => DIETARY_QUERY_PHRASES[item] ?? item).join(' ');

  const exclusionTerms = collectExclusions(dietary, excluded);
  const excludedPart = exclusionTerms
    .slice(0, MAX_QUERY_EXCLUSIONS)
    .map((item) => `-"${item}"`)
    .join(' ');

  return `recipe ${ingredientPart} ${dietaryPart} ${sitePart} ${excludedPart}`
    .replace(/\s+/g, ' ')
    .trim();
}

/** Drop pantry items that conflict with the active diets before they hit Google. */
export function filterIngredientsForDiet(
  ingredients: string[],
  dietary: DietaryRestriction[],
): string[] {
  if (dietary.length === 0) return ingredients;

  return ingredients.filter((ingredient) => {
    const normalized = ingredient.trim().toLowerCase();
    if (!normalized) return false;

    return !dietary.some((diet) =>
      (DIETARY_FORBIDDEN[diet] ?? []).some((forbidden) => matchesFoodTerm(normalized, forbidden)),
    );
  });
}

function matchesFoodTerm(value: string, term: string): boolean {
  if (value === term) return true;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'i').test(value);
}

function collectExclusions(dietary: DietaryRestriction[], excluded: string[]): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];

  const push = (raw: string) => {
    const term = raw.trim().toLowerCase();
    if (!term || seen.has(term)) return;
    seen.add(term);
    terms.push(term);
  };

  for (const item of excluded) push(item);
  for (const diet of dietary) {
    for (const item of DIETARY_QUERY_EXCLUSIONS[diet] ?? []) push(item);
  }

  return terms;
}
