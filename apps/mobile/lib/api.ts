import type {
  BarcodeLookupRequest,
  BarcodeLookupResponse,
  IngredientScanRequest,
  IngredientScanResponse,
  RecipeSearchRequest,
  RecipeSearchResponse,
} from '@pantry-and-me/shared';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const SEARCH_TIMEOUT_MS = 30_000;
const SCAN_TIMEOUT_MS = 60_000;
const BARCODE_TIMEOUT_MS = 30_000;

async function postJson<TResponse>(
  path: string,
  body: unknown,
  timeoutMs: number,
): Promise<TResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? 'Something went wrong. Try again in a moment.');
    }

    return payload as TResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('That took too long. Check your connection and try again.');
    }

    const message = error instanceof Error ? error.message : String(error);
    if (
      error instanceof TypeError ||
      /cancel|timed out|network|could not connect|NSURLError/i.test(message)
    ) {
      throw new Error('Could not reach pantry&me. Check your connection and try again.');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function searchRecipes(request: RecipeSearchRequest): Promise<RecipeSearchResponse> {
  return postJson<RecipeSearchResponse>('/api/recipes/search', request, SEARCH_TIMEOUT_MS);
}

export function scanIngredientPhoto(
  request: IngredientScanRequest,
): Promise<IngredientScanResponse> {
  return postJson<IngredientScanResponse>('/api/ingredients/scan', request, SCAN_TIMEOUT_MS);
}

export function lookupBarcode(request: BarcodeLookupRequest): Promise<BarcodeLookupResponse> {
  return postJson<BarcodeLookupResponse>('/api/ingredients/barcode', request, BARCODE_TIMEOUT_MS);
}

export { API_URL };
