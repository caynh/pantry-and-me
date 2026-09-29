import type { BarcodeProduct, StorageLocation } from '@pantry-and-me/shared';

const API_BASE = 'https://world.openfoodfacts.org/api/v2/product';

const FIELDS = [
  'product_name',
  'product_name_en',
  'generic_name',
  'brands',
  'quantity',
  'product_quantity',
  'product_quantity_unit',
  'image_front_small_url',
  'categories_tags',
].join(',');

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Open Food Facts asks every client to identify itself and rate limits or blocks
 * anonymous traffic. See https://openfoodfacts.github.io/openfoodfacts-server/api/
 */
const USER_AGENT = 'pantry-and-me/0.1 (https://github.com/pantry-and-me)';

interface OpenFoodFactsProduct {
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  quantity?: string;
  product_quantity?: string | number;
  product_quantity_unit?: string;
  image_front_small_url?: string;
  categories_tags?: string[];
}

interface OpenFoodFactsResponse {
  status?: number;
  product?: OpenFoodFactsProduct;
}

export async function lookupWithOpenFoodFacts(barcode: string): Promise<BarcodeProduct | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(`${API_BASE}/${barcode}.json?fields=${FIELDS}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Open Food Facts did not respond in time.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  // A missing product is a 404 with a JSON body, not a failure worth surfacing
  // as an error — the caller shows a "not found, add it manually" state.
  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Open Food Facts request failed with HTTP ${response.status}`);
  }

  const data = (await response.json()) as OpenFoodFactsResponse;

  if (data.status !== 1 || !data.product) return null;

  const product = data.product;
  const name = pickName(product);

  if (!name) return null;

  const { quantity, unit } = parseQuantity(product);

  return {
    barcode,
    name,
    brand: firstBrand(product.brands),
    quantity,
    unit,
    imageUrl: product.image_front_small_url || undefined,
    suggestedLocation: guessLocation(product.categories_tags ?? []),
  };
}

function pickName(product: OpenFoodFactsProduct): string | null {
  const candidates = [product.product_name_en, product.product_name, product.generic_name];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) return trimmed;
  }

  return null;
}

function firstBrand(brands?: string): string | undefined {
  return brands?.split(',')[0]?.trim() || undefined;
}

/**
 * `quantity` is the human string off the package ("500 g", "1.5 L"). It is more
 * faithful than `product_quantity`, which Open Food Facts normalises to grams or
 * millilitres, so it is tried first.
 */
function parseQuantity(product: OpenFoodFactsProduct): {
  quantity?: number;
  unit?: string;
} {
  const printed = product.quantity?.trim();

  if (printed) {
    const match = /^([\d.,]+)\s*([a-zA-Z]+)?/.exec(printed);
    const value = match ? Number(match[1].replace(',', '.')) : Number.NaN;

    if (Number.isFinite(value) && value > 0) {
      return { quantity: value, unit: match?.[2]?.toLowerCase() };
    }
  }

  const normalized = Number(product.product_quantity);

  if (Number.isFinite(normalized) && normalized > 0) {
    return { quantity: normalized, unit: product.product_quantity_unit?.toLowerCase() ?? 'g' };
  }

  return {};
}

const FREEZER_TAGS = ['frozen', 'ice-cream', 'glaces'];
const FRIDGE_TAGS = [
  'dairies',
  'dairy',
  'yogurt',
  'yogurts',
  'cheese',
  'cheeses',
  'milk',
  'milks',
  'eggs',
  'fresh-foods',
  'refrigerated',
  'meats',
  'fresh-meats',
  'seafood',
  'fishes',
  'charcuterie',
  'butters',
  'creams',
];

function guessLocation(tags: string[]): StorageLocation | undefined {
  // Tags look like "en:frozen-foods"; drop the language prefix before matching.
  const normalized = tags.map((tag) => tag.split(':').pop() ?? tag);

  const matches = (candidates: string[]) =>
    normalized.some((tag) => candidates.some((candidate) => tag.includes(candidate)));

  if (matches(FREEZER_TAGS)) return 'freezer';
  if (matches(FRIDGE_TAGS)) return 'fridge';
  if (normalized.length > 0) return 'pantry';

  return undefined;
}
