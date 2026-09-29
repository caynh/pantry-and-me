import type { ScannedIngredient } from '@pantry-and-me/shared';

export function getMockScanResults(): ScannedIngredient[] {
  return [
    { name: 'eggs', quantity: 12, unit: 'count', confidence: 0.9 },
    { name: 'whole milk', quantity: 1, unit: 'gallon', confidence: 0.82 },
    { name: 'baby spinach', confidence: 0.71 },
    { name: 'cheddar cheese', quantity: 8, unit: 'oz', confidence: 0.64 },
  ];
}
