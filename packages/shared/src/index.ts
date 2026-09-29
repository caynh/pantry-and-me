export type IngredientSource = 'manual' | 'scan' | 'barcode';

export type StorageLocation = 'pantry' | 'fridge' | 'freezer';

export interface Ingredient {
  id: string;
  userId?: string;
  name: string;
  quantity?: number;
  unit?: string;
  location: StorageLocation;
  source: IngredientSource;
  expirationDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DietaryRestriction =
  | 'vegetarian'
  | 'vegan'
  | 'gluten-free'
  | 'dairy-free'
  | 'nut-free';

export type ExpirationLeadDays = 1 | 3 | 7;

export interface UserPreferences {
  dietaryRestrictions: DietaryRestriction[];
  excludedIngredients: string[];
  /** Schedule local device notifications for approaching expiration dates. */
  expirationRemindersEnabled: boolean;
  /** Days before expiration to treat as "soon" and to fire the reminder. */
  expirationLeadDays: ExpirationLeadDays;
}

export interface RecipeSearchRequest {
  ingredients: string[];
  dietary?: DietaryRestriction[];
  excluded?: string[];
}

export interface RecipeSearchResult {
  title: string;
  url: string;
  snippet: string;
  thumbnail?: string;
  matchedIngredients: string[];
  /** Average rating out of 5 when the search result includes one. */
  rating?: number;
  /** Number of reviews behind the rating, when known. */
  reviewCount?: number;
}

export interface RecipeSearchResponse {
  query: string;
  results: RecipeSearchResult[];
  provider: string;
}

/** A recipe the user has hearted into My Recipes. */
export interface SavedRecipe {
  id: string;
  title: string;
  url: string;
  snippet: string;
  thumbnail?: string;
  rating?: number;
  reviewCount?: number;
  /** Personal notes the user adds on the detail screen. */
  notes?: string;
  savedAt: string;
  updatedAt: string;
}

export interface ScannedIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  expirationDate?: string;
  /** 0–1, how sure the vision model is about this item. */
  confidence: number;
}

export interface IngredientScanRequest {
  /** Base64-encoded image without a data URL prefix. */
  imageBase64: string;
  mimeType?: string;
}

export interface IngredientScanResponse {
  provider: string;
  items: ScannedIngredient[];
}

export interface BarcodeProduct {
  /** The scanned code, normalised to digits. */
  barcode: string;
  name: string;
  brand?: string;
  /** Net contents as printed on the package, e.g. 500 with unit "g". */
  quantity?: number;
  unit?: string;
  imageUrl?: string;
  /** Suggested storage based on the product category, when we can tell. */
  suggestedLocation?: StorageLocation;
}

export interface BarcodeLookupRequest {
  barcode: string;
}

export interface BarcodeLookupResponse {
  provider: string;
  /** Null when the barcode is valid but the database has no entry for it. */
  product: BarcodeProduct | null;
}

export const DIETARY_OPTIONS: { id: DietaryRestriction; label: string }[] = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten-free', label: 'Gluten-free' },
  { id: 'dairy-free', label: 'Dairy-free' },
  { id: 'nut-free', label: 'Nut-free' },
];

export const STORAGE_LOCATIONS: { id: StorageLocation; label: string }[] = [
  { id: 'pantry', label: 'Pantry' },
  { id: 'fridge', label: 'Fridge' },
  { id: 'freezer', label: 'Freezer' },
];
