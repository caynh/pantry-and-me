import type { ScannedIngredient } from '@pantry-and-me/shared';

export type IngredientScanProvider = 'openai' | 'mock';

export interface IngredientScanOutcome {
  provider: IngredientScanProvider;
  items: ScannedIngredient[];
}

export function resolveIngredientScanProvider(): IngredientScanProvider {
  const explicit = process.env.INGREDIENT_SCAN_PROVIDER?.toLowerCase();

  if (explicit === 'mock') return 'mock';
  if (explicit === 'openai' && process.env.OPENAI_API_KEY) return 'openai';

  return process.env.OPENAI_API_KEY ? 'openai' : 'mock';
}

export function isIngredientScanConfigured(): boolean {
  return resolveIngredientScanProvider() !== 'mock';
}
