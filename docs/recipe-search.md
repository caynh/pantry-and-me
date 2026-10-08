# Recipe search setup

pantry&me finds recipe **articles** on the web by searching with your ingredient list. The mobile app calls your Next.js API, which proxies requests to a search provider so API keys never ship in the app.

## Why not Google Custom Search?

Google **closed the Custom Search JSON API to new customers**. New Google Cloud projects get a persistent `403 PERMISSION_DENIED` even with billing enabled and the API toggled on. Existing customers can use it until **January 1, 2027**.

For new projects like pantry&me, use **SerpApi** (recommended for MVP).

---

## Recommended: SerpApi (default)

| | |
|---|---|
| **Free tier** | 100 searches/month |
| **Signup** | [serpapi.com](https://serpapi.com/) |
| **Returns** | Google organic results as JSON |

### 1. Create a SerpApi account

1. Sign up at [serpapi.com](https://serpapi.com/users/sign_up)
2. Open your [API key dashboard](https://serpapi.com/manage-api-key)
3. Copy your private API key

### 2. Add to `apps/api/.env.local`

```env
SERPAPI_API_KEY=your-serpapi-key
RECIPE_SEARCH_USE_SITE_FILTERS=true
```

Do **not** put this key in the repo root `.env` or the mobile app.

### 3. Restart the API

```bash
# Stop the running server (Ctrl+C), then:
npm run api
```

### 4. Verify

```bash
npm run verify:search --workspace @pantry-and-me/api
```

You should see real recipe URLs from sites like AllRecipes or Serious Eats.

### 5. Test in the app

1. Add ingredients on the **Ingredients** tab
2. Search on the **Recipes** tab
3. Tap a result to open the article in the browser

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SERPAPI_API_KEY` | Yes (for live results) | SerpApi private key |
| `RECIPE_SEARCH_PROVIDER` | No | Set to `mock` to force offline sample results |
| `RECIPE_SEARCH_USE_SITE_FILTERS` | No | `true` (default) adds `site:allrecipes.com OR ...` to queries |

Without `SERPAPI_API_KEY` the API returns **mock** results (`example.com` links) during local development so the UI still works offline. Production (`next start`, or `REQUIRE_LIVE_PROVIDERS=true`) returns an error instead of those samples, including when SerpApi is out of searches. Before App Review, run `npm run verify:review --workspace @pantry-and-me/api` and keep at least 20 searches left.

Queries are capped at the first 8 ingredients and 5 exclusions, because Google ignores terms past roughly 32 words and the site filters already use several.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Mock results (`example.com`) | Add `SERPAPI_API_KEY` to `apps/api/.env.local` and restart API. Production will not serve these |
| `Recipe search is busy` | SerpApi quota or rate limit. The app does not substitute sample recipes |
| Verify script says missing credentials | Keys must be in `apps/api/.env.local`, not root `.env` |
| Mobile can't search | Set `EXPO_PUBLIC_API_URL` to your computer's LAN IP on physical devices |
| SerpApi quota exceeded | Free tier is 100/month; upgrade or wait for reset |
| Empty results | Set `RECIPE_SEARCH_USE_SITE_FILTERS=false` to broaden search |

---

## Security

- Keep `SERPAPI_API_KEY` server-side only (`apps/api/.env.local`)
- Never commit `.env.local` (already gitignored)
- Restrict SerpApi key usage in the SerpApi dashboard if deploying to production
