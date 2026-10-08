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
  headers?: Record<string, string>,
): Promise<TResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
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

export function deleteRemoteAccount(accessToken: string): Promise<{ deleted: true }> {
  return postJson<{ deleted: true }>(
    '/api/account',
    {},
    30_000,
    { Authorization: `Bearer ${accessToken}` },
  );
}

/** Public URL for App Store Connect and the in-app Privacy Policy link. */
export const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? `${API_URL.replace(/\/$/, '')}/privacy`;

export { API_URL };
