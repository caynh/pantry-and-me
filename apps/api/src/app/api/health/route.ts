import { NextResponse } from 'next/server';
import { isBarcodeLookupConfigured, resolveBarcodeLookupProvider } from '@/lib/barcode-lookup';
import { isIngredientScanConfigured, resolveIngredientScanProvider } from '@/lib/ingredient-scan';
import { liveProvidersRequired } from '@/lib/live-providers';
import { isRecipeSearchConfigured, resolveRecipeSearchProvider } from '@/lib/recipe-search';

export async function GET() {
  const searchProvider = resolveRecipeSearchProvider();
  const scanProvider = resolveIngredientScanProvider();
  const barcodeProvider = resolveBarcodeLookupProvider();

  return NextResponse.json({
    name: 'pantry&me API',
    version: '0.1.0',
    endpoints: {
      recipeSearch: '/api/recipes/search',
      ingredientScan: '/api/ingredients/scan',
      barcodeLookup: '/api/ingredients/barcode',
    },
    recipeSearch: {
      provider: searchProvider,
      configured: isRecipeSearchConfigured(),
      mode: searchProvider === 'mock' ? 'mock' : 'live',
      siteFilters: process.env.RECIPE_SEARCH_USE_SITE_FILTERS !== 'false',
    },
    ingredientScan: {
      provider: scanProvider,
      configured: isIngredientScanConfigured(),
      mode: scanProvider === 'mock' ? 'mock' : 'live',
    },
    barcodeLookup: {
      provider: barcodeProvider,
      configured: isBarcodeLookupConfigured(),
      mode: barcodeProvider === 'mock' ? 'mock' : 'live',
    },
    liveProvidersRequired: liveProvidersRequired(),
    readyForReview:
      searchProvider !== 'mock' && scanProvider !== 'mock' && barcodeProvider !== 'mock',
  });
}
