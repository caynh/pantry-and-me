import type { BarcodeProduct } from '@pantry-and-me/shared';

export type BarcodeLookupProvider = 'openfoodfacts' | 'mock';

export interface BarcodeLookupOutcome {
  provider: BarcodeLookupProvider;
  product: BarcodeProduct | null;
}

/**
 * Open Food Facts is free and keyless, so it is the default. The env var only
 * exists to force mock responses during development.
 */
export function resolveBarcodeLookupProvider(): BarcodeLookupProvider {
  const explicit = process.env.BARCODE_LOOKUP_PROVIDER?.toLowerCase();

  if (explicit === 'mock') return 'mock';

  return 'openfoodfacts';
}

export function isBarcodeLookupConfigured(): boolean {
  return resolveBarcodeLookupProvider() !== 'mock';
}

/** UPC-A, UPC-E, EAN-8, and EAN-13 codes are all 8–14 digits. */
export function normalizeBarcode(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');

  if (digits.length < 8 || digits.length > 14) return null;

  return digits;
}
