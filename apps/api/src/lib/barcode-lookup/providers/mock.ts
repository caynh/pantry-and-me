import type { BarcodeProduct } from '@pantry-and-me/shared';

const MOCK_PRODUCTS: Record<string, Omit<BarcodeProduct, 'barcode'>> = {
  '3017620422003': {
    name: 'Nutella Hazelnut Spread',
    brand: 'Ferrero',
    quantity: 400,
    unit: 'g',
    suggestedLocation: 'pantry',
  },
  '0049000028911': {
    name: 'Whole Milk',
    brand: 'Store Brand',
    quantity: 1,
    unit: 'gallon',
    suggestedLocation: 'fridge',
  },
};

/** Any code not in the table returns a generic hit so the flow stays testable. */
export function getMockProduct(barcode: string): BarcodeProduct | null {
  const match = MOCK_PRODUCTS[barcode];

  if (match) return { barcode, ...match };

  // A single code is reserved for exercising the "not found" path.
  if (barcode === '00000000') return null;

  return {
    barcode,
    name: 'Sample pantry item',
    brand: 'Mock Foods',
    quantity: 12,
    unit: 'oz',
    suggestedLocation: 'pantry',
  };
}
