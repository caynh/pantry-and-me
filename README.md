# pantry&me

Cross-platform recipe app (iOS + Android) that tracks fridge and pantry ingredients — typed in or scanned from photos — and searches the web for recipe articles you can make with them.

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Mobile | **Expo (React Native)** | One codebase for iOS + Android |
| Backend | **Next.js API routes** | Keeps search and vision API keys off the device |
| Recipe search | **SerpApi** | Google results via API; Google's own Custom Search JSON API is closed to new customers |
| Photo scanning | **OpenAI vision** | Turns a fridge or label photo into ingredient suggestions |
| Barcode lookup | **Open Food Facts** | Free and keyless product database for packaged goods |
| Database | **Supabase (Postgres)** | Relational ingredient data with row level security |

## Monorepo layout

```
pantry-and-me/
├── apps/
│   ├── mobile/          # Expo app (Ingredients, Recipes, Settings + scan modals)
│   └── api/             # Next.js API (recipe search, photo scanning, barcodes)
├── packages/
│   └── shared/          # Shared TypeScript types
├── supabase/
│   └── migrations/      # Database schema
└── docs/                # Provider setup guides
```

## What works today

- Ingredients list: add, tap any item to edit every field plus notes, remove
- Expiring soon section plus optional local notification reminders (Settings)
- Photo scanning: camera or library → suggested items → confirm/edit → add to list
- Barcode scanning: camera or manual entry → product details → confirm/edit → add to list
- Recipe search across your ingredients with dietary toggles and excluded foods
- My Recipes favorites with notes
- Dark mode toggle in Settings
- On-device storage, so the app is fully usable before any cloud setup
- Both external providers fall back to mock data when keys are missing

## Run it locally

### 1. Install dependencies

```bash
cd ~/Projects/pantry-and-me
npm install
```

### 2. Set up environment files

Env vars live per app, not at the repo root:

```bash
cp apps/api/.env.example apps/api/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

Both work empty — the app runs on mock providers. Add keys when you want live results:

| Key | File | Purpose |
|-----|------|---------|
| `SERPAPI_API_KEY` | `apps/api/.env.local` | Live recipe search ([guide](docs/recipe-search.md)) |
| `OPENAI_API_KEY` | `apps/api/.env.local` | Live photo scanning ([guide](docs/ingredient-scanning.md)) |
| _none needed_ | — | Barcode lookup is keyless ([guide](docs/barcode-lookup.md)) |
| `EXPO_PUBLIC_API_URL` | `apps/mobile/.env` | Where the app finds the API |
| `EXPO_PUBLIC_SUPABASE_*` | `apps/mobile/.env` | Anonymous auth + cloud sync ([guide](docs/supabase-auth.md)) |

### 3. Start the API

```bash
npm run api
```

Confirm providers at [http://localhost:3000/api/health](http://localhost:3000/api/health):

```json
{
  "recipeSearch": { "provider": "serpapi", "mode": "live" },
  "ingredientScan": { "provider": "mock", "mode": "mock" },
  "barcodeLookup": { "provider": "openfoodfacts", "mode": "live" }
}
```

### 4. Start the app (second terminal)

```bash
npm run mobile
```

Then press `i` for the iOS Simulator, `a` for an Android emulator, or open the web preview with `w`.

> **Simulator scrolling:** use click-and-drag or a two-finger trackpad swipe. A one-finger Magic Mouse swipe often does nothing even when scrolling works.

> **On a physical phone:** Expo Go is not enough for this project (camera, Apple Sign In, local notifications). Use a native build below. Also set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to your computer's LAN IP (`ipconfig getifaddr en0` → e.g. `http://192.168.1.10:3000`) and restart. Phone and computer must be on the same Wi-Fi.

### Testing on iOS and Android without Expo Go

Expo Go cannot load custom native modules this app uses. Install Xcode and/or Android Studio, then build a **development client** from `apps/mobile`:

```bash
cd apps/mobile

# iOS Simulator (requires Xcode)
npx expo run:ios

# Android emulator or USB device (requires Android Studio)
npx expo run:android
```

Rebuild after changing native config plugins (for example `expo-notifications` in `app.json`). Day-to-day JS changes still hot-reload against that installed binary.

For a physical iPhone or Android phone without a cable workflow, use an [EAS development build](https://docs.expo.dev/develop/development-builds/introduction/) with the existing `extra.eas.projectId` in `apps/mobile/app.json` (`eas build --profile development`).

### 5. Walk through the app

1. **Ingredients** tab → add `chicken`, `rice`, `broccoli` by hand (set an expiration a few days out to see **Expiring soon**)
2. Tap any ingredient to edit its fields and notes
3. **Scan photo** → take a photo → confirm suggestions → **Add items**
4. **Scan barcode** → scan a package, or type `3017620422003` → **Add to ingredients**
5. **Recipes** tab → toggle a dietary filter → **Search with N ingredients**
6. Tap a result to open the recipe article
7. **Settings** → turn on **Local notifications** and pick a lead time (1 / 3 / 7 days)

Both scanners need a real device camera. **Choose photo** covers photo scanning everywhere, and the barcode screen has a manual entry box for the simulator and web.

### Verify providers from the terminal

```bash
# Recipe search (uses 1 of your 100 free monthly SerpApi searches)
npm run verify:search --workspace @pantry-and-me/api

# Photo scanning, with the mock provider
curl -s -X POST http://localhost:3000/api/ingredients/scan \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==","mimeType":"image/png"}'

# Barcode lookup (no key required)
curl -s -X POST http://localhost:3000/api/ingredients/barcode \
  -H "Content-Type: application/json" \
  -d '{"barcode":"3017620422003"}'
```

## Supabase setup (anonymous + email / Apple)

Full walkthrough: [docs/supabase-auth.md](docs/supabase-auth.md).

1. Create a project at [supabase.com](https://supabase.com/).
2. Enable **Anonymous Sign-Ins**, **Email**, and (for iOS) **Apple**. Turn on **Manual Linking**. For local testing, turn **Confirm email** off.
3. Run `supabase/migrations/20260808180000_initial_schema.sql` in the SQL editor.
4. Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to `apps/mobile/.env`.
5. Restart Expo. Settings should show an anonymous cloud account, with forms to save via email or sign in to an existing one.

Without keys the app stays on device storage. With keys it signs in silently, migrates any local ingredients once, and writes to Postgres under row level security.

## Roadmap

**Next up**
- Account deletion (App Store requirement once accounts store personal data)
- Password reset
- Native date picker for expiration dates

**Then — collaboration**
- Shared household pantry

**Then — store launch**
- TestFlight and Play internal testing
- App Store and Play Store submission

## Scripts

| Command | Description |
|---------|-------------|
| `npm run mobile` | Start the Expo dev server |
| `npm run api` | Start the Next.js API on port 3000 |
| `npm run typecheck` | Typecheck every workspace |
| `npm run verify:search --workspace @pantry-and-me/api` | Check SerpApi credentials |

## API endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Version plus provider/mode for search, scanning, and barcodes |
| `POST /api/recipes/search` | `{ ingredients, dietary?, excluded? }` → recipe article links |
| `POST /api/ingredients/scan` | `{ imageBase64, mimeType? }` → suggested ingredients |
| `POST /api/ingredients/barcode` | `{ barcode }` → product details, or `product: null` |

## Local tooling you need

- **Xcode** for the iOS simulator and App Store builds
- **Android Studio** for an Android emulator and Play Store builds
- Accounts: SerpApi, OpenAI (optional), Supabase (optional)
