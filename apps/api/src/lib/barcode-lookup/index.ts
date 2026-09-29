import { getMockProduct } from '@/lib/barcode-lookup/providers/mock';
import { lookupWithOpenFoodFacts } from '@/lib/barcode-lookup/providers/openfoodfacts';
import {
  resolveBarcodeLookupProvider,
  type BarcodeLookupOutcome,
} from '@/lib/barcode-lookup/types';

export {
  isBarcodeLookupConfigured,
  normalizeBarcode,
  resolveBarcodeLookupProvider,
  type BarcodeLookupProvider,
} from '@/lib/barcode-lookup/types';

export async function lookupBarcode(barcode: string): Promise<BarcodeLookupOutcome> {
  const provider = resolveBarcodeLookupProvider();

  if (provider === 'mock') {
    return { provider, product: getMockProduct(barcode) };
  }

  return { provider, product: await lookupWithOpenFoodFacts(barcode) };
}
