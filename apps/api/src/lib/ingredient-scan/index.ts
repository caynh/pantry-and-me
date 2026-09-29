import { getMockScanResults } from '@/lib/ingredient-scan/providers/mock';
import { scanWithOpenAi } from '@/lib/ingredient-scan/providers/openai';
import {
  resolveIngredientScanProvider,
  type IngredientScanOutcome,
} from '@/lib/ingredient-scan/types';

export {
  isIngredientScanConfigured,
  resolveIngredientScanProvider,
  type IngredientScanProvider,
} from '@/lib/ingredient-scan/types';

export async function scanIngredientPhoto(
  imageBase64: string,
  mimeType = 'image/jpeg',
): Promise<IngredientScanOutcome> {
  const provider = resolveIngredientScanProvider();

  if (provider === 'mock') {
    return { provider, items: getMockScanResults() };
  }

  return { provider, items: await scanWithOpenAi(imageBase64, mimeType) };
}
