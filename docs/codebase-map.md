# Codebase map

A file-by-file tour of pantry&me, written so you can find the right place to make a change.

## Big picture

Three pieces of code, one repo:

```
apps/mobile   Expo / React Native app — everything the user sees
apps/api      Next.js server — holds the API keys, talks to SerpApi and OpenAI
packages/shared  TypeScript types both sides import so they can't disagree
supabase      SQL schema for the eventual cloud sync
```

The phone never calls SerpApi or OpenAI directly. It calls your Next.js server, which
calls them with keys that stay on the server. That's the whole reason `apps/api` exists.

Data flows one direction per feature:

- **Add ingredient** — mobile screen writes to `useIngredients`, which saves to AsyncStorage (device) or Supabase (cloud, once signed in).
- **Scan photo** — mobile takes a photo, base64-encodes it, posts to `/api/ingredients/scan`, gets back a list of guessed ingredients, user confirms, then it goes through `useIngredients` like a manual add.
- **Scan barcode** — the camera reads the code on device, the number goes to `/api/ingredients/barcode`, Open Food Facts returns product details, user confirms, same path into `useIngredients`.
- **Search recipes** — mobile sends its ingredient names plus dietary toggles to `/api/recipes/search`, the server builds a Google query string and runs it through SerpApi, and links come back.

---

## apps/mobile — the app

### Routing

Expo Router uses the file system as the router: a file at `app/recipe.tsx` is the
`/recipe` route. Square brackets mean a URL parameter.

| File | What it is | What it does |
|---|---|---|
| `app/_layout.tsx` | React component | Root of the app. Wraps everything in `IngredientsProvider` (shared ingredient state) and the theme, and declares the non-tab screens: `scan`, `recipe`, `ingredient/[id]`. Register new full-screen or modal routes here. |
| `app/(tabs)/_layout.tsx` | React component | The bottom tab bar. The parenthesised folder name is a "group": it organises files without adding `/tabs` to the URL. |
| `app/(tabs)/index.tsx` | React component | **Ingredients tab.** The add-ingredient form and the list. The form lives in the `FlatList`'s `ListHeaderComponent`, which is what makes the whole page scroll as one surface. Tapping a row opens the edit modal. |
| `app/(tabs)/recipes.tsx` | React component | **Recipes tab.** Dietary toggles, the search button, and the results list. Same `ListHeaderComponent` pattern. Calls `searchRecipes()` from `lib/api.ts`. |
| `app/(tabs)/profile.tsx` | React component | **Settings tab.** Excluded foods, and a diagnostics panel showing which API URL and providers are live. Good place to check what the app thinks it's connected to. |
| `app/ingredient/[id].tsx` | React component | **Edit ingredient modal.** Reads the id from the URL, finds that ingredient in context, and edits name, quantity, unit, location, expiration, and notes. Also holds the delete action. |
| `app/scan.tsx` | React component | **Photo scan modal.** Opens the camera or photo library, posts the image to the API, lists what came back with checkboxes so the user can correct names and quantities before adding. |
| `app/barcode.tsx` | React component | **Barcode scan modal.** Runs `CameraView` from `expo-camera` with barcode detection, plus a manual-entry box because the simulator and web have no usable scanner. A ref guards against the scanner firing repeatedly for one code. Everything found is editable before it is saved. |
| `app/recipe.tsx` | React component | **In-app recipe viewer.** A `WebView` around the recipe URL, with an "open in browser" escape hatch because some sites refuse to be embedded. On web it hands off to a real browser tab instead — a WebView on web is an iframe, and recipe sites block iframes. |

### State and data

| File | What it is | What it does |
|---|---|---|
| `hooks/useAuth.tsx` | React context provider | Starts a silent anonymous Supabase session on launch when keys are present, persists it in AsyncStorage, and refreshes tokens when the app returns to the foreground. Exposes `status` (`disabled` / `loading` / `anonymous` / `identified` / `error`) for Settings. |
| `hooks/useIngredients.tsx` | React context provider | **The most important file in the app.** Owns the ingredient list, and decides per-write whether it goes to AsyncStorage or Supabase. Cloud mode turns on once `useAuth` has a `userId`. On first cloud session it uploads any on-device ingredients (rewriting old non-UUID ids) then clears local storage. Also contains the `mapRowToIngredient` / `mapUpdatesToRow` helpers. |
| `hooks/usePreferences.ts` | React hook | Dietary restrictions and excluded foods, stored in AsyncStorage. See "known rough edges" below — this one is not a context yet. |
| `lib/api.ts` | Plain TypeScript | The only place that knows the API's URL and shape. One `postJson` helper with timeouts and human-readable network errors, plus `searchRecipes()` and `scanIngredientPhoto()`. Add new endpoints here rather than calling `fetch` from a screen. |
| `lib/supabase.ts` | Plain TypeScript | Creates the Supabase client, or exports `null` if the keys aren't set. Everything downstream checks for null, which is why the app works fine with no Supabase account. |

### Presentation

| File | What it is | What it does |
|---|---|---|
| `components/Themed.tsx` | React components | `Text` and `View` that pick up light/dark colors automatically. Prefer these over the raw React Native ones. |
| `components/RecipeResultCard.tsx` | React component | One search result. Owns the decision of in-app WebView vs. browser tab. |
| `components/DietaryToggles.tsx` | React component | The chip row of dietary filters. |
| `constants/Colors.ts` | Plain TypeScript | The entire palette, light and dark. Change the look of the app here. |
| `app.json` | Config | Expo app config: name, icons, and native permissions. The camera and photo-library permission strings the OS shows the user live here. |
| `.env` | Config | `EXPO_PUBLIC_API_URL` and Supabase keys. `EXPO_PUBLIC_` variables get baked into the JS bundle, so never put a secret here. A physical phone needs your Mac's LAN IP, not `localhost`. |

---

## apps/api — the server

Next.js App Router. A `route.ts` file exports HTTP methods as functions, so
`src/app/api/recipes/search/route.ts` exporting `POST` becomes `POST /api/recipes/search`.

| File | What it is | What it does |
|---|---|---|
| `src/app/api/recipes/search/route.ts` | Next.js route handler | Validates the request body, calls `searchRecipeArticles()`, returns links. Thin on purpose — the logic lives in `lib`. |
| `src/app/api/ingredients/scan/route.ts` | Next.js route handler | Same shape for photos. Rejects oversized images and non-image MIME types before spending an OpenAI call. |
| `src/app/api/ingredients/barcode/route.ts` | Next.js route handler | Normalises the scanned digits, rejects anything that isn't 8–14 digits, and looks the product up. |
| `src/app/api/health/route.ts` | Next.js route handler | Reports which providers are configured and whether each is live or mocked. Hit this first when something isn't working: `curl localhost:3000/api/health`. |
| `src/middleware.ts` | Next.js middleware | Adds CORS headers so the Expo web build can call the API from a different origin. Runs before every `/api/*` request. |
| `src/lib/recipe-search/index.ts` | Plain TypeScript | Picks a provider and runs the search. |
| `src/lib/recipe-search/build-query.ts` | Plain TypeScript | Turns ingredients + dietary restrictions + exclusions into a Google query string, capped at 8 ingredients and 5 exclusions because Google truncates long queries. **This file has the most leverage over result quality.** |
| `src/lib/recipe-search/providers/serpapi.ts` | Plain TypeScript | The live search call and the mapping of SerpApi's response into our `RecipeSearchResult` type. |
| `src/lib/recipe-search/providers/mock.ts` | Plain TypeScript | Canned results so the app is fully usable with no API key. |
| `src/lib/ingredient-scan/providers/openai.ts` | Plain TypeScript | The vision call. **The prompt in this file is what determines scan quality** — it's where you'd teach it to read expiration dates better or return more consistent units. |
| `src/lib/ingredient-scan/providers/mock.ts` | Plain TypeScript | Canned scan results, same idea. |
| `src/lib/barcode-lookup/providers/openfoodfacts.ts` | Plain TypeScript | The Open Food Facts call plus all the messy normalisation: picking a usable product name from three candidate fields, parsing "500 g" into a number and a unit, and mapping category tags to a storage location. |
| `src/lib/barcode-lookup/types.ts` | TypeScript types | Provider resolution and `normalizeBarcode()`, which strips non-digits and enforces the 8–14 digit range shared by UPC and EAN codes. |
| `src/lib/*/types.ts` | TypeScript types | Each feature's types plus its `resolve*Provider()` function, which is the single place that decides live vs. mock based on which env vars exist. |
| `.env.local` | Config | `SERPAPI_API_KEY`, `OPENAI_API_KEY`. Real secrets, never committed. |
| `scripts/verify-recipe-search.mjs` | Node script | `npm run verify:search --workspace @pantry-and-me/api` — proves your SerpApi key works without going through the app. |

The provider pattern repeats deliberately: `index.ts` chooses, `types.ts` defines,
`providers/*` implement. Swapping SerpApi for something else means adding one file
under `providers/` and one branch in `index.ts`.

---

## packages/shared and supabase

| File | What it is | What it does |
|---|---|---|
| `packages/shared/src/index.ts` | TypeScript types | `Ingredient`, `RecipeSearchRequest/Response`, `ScannedIngredient`, the dietary and storage-location lists. Both apps import it, so changing a field here surfaces every place that needs updating. Start API changes in this file. |
| `supabase/migrations/*.sql` | SQL | Tables, the row-level-security policies that scope every row to its owner, and a trigger that creates a profile and preferences row when someone signs up. Note `ingredient_source` already allows `'barcode'`. |

---

## Known rough edges

Worth knowing before you plan improvements.

1. **`usePreferences` is a hook, not a context.** The Recipes tab and Profile tab each get
   their own copy of the state. Editing excluded foods in Profile won't affect a search
   until that tab remounts. Same bug that was already fixed for ingredients — the fix is
   to convert it to a provider the way `useIngredients.tsx` is.
2. **Anonymous accounts can't be recovered across devices** until email/Apple linking ships.
   Uninstalling the app creates a new empty account on next launch.
3. **Expiration dates are free-text `YYYY-MM-DD`.** A date picker would remove a whole
   class of user error.
