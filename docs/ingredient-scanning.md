# Photo scanning setup

The **Scan items** flow lets you photograph a fridge shelf, pantry, or product label and turn it into ingredients. The mobile app sends the photo to your Next.js API, which calls a vision model and returns suggested items. Nothing is saved until you confirm the list.

Scanning works without any API key — the endpoint returns sample items so you can exercise the UI.

## Recommended: OpenAI vision

| | |
|---|---|
| **Model** | `gpt-4o-mini` (override with `OPENAI_VISION_MODEL`) |
| **Signup** | [platform.openai.com](https://platform.openai.com/) |
| **Cost** | Pay per image; low-detail photos are fractions of a cent |

### 1. Create an API key

1. Sign up at [platform.openai.com](https://platform.openai.com/)
2. Add a small amount of billing credit
3. Create a key under [API keys](https://platform.openai.com/api-keys)

### 2. Add to `apps/api/.env.local`

```env
OPENAI_API_KEY=sk-...
```

### 3. Restart the API

```bash
npm run api
```

### 4. Confirm it is live

```bash
curl http://localhost:3000/api/health
```

Look for `"ingredientScan": { "provider": "openai", "mode": "live" }`.

## How the flow works

1. **Ingredients** tab → **Scan items with camera**
2. Take a photo or choose one from your library
3. The app uploads a compressed JPEG (quality `0.5`) as base64
4. `POST /api/ingredients/scan` returns items with a confidence score
5. Uncheck anything wrong, fix names inline, pick a storage location
6. **Add items** writes them to your ingredients list with `source: 'scan'`

## Expiration dates

The model only reports `expirationDate` when a date is **legible in the photo** — it is instructed never to guess. For most items you will set the date yourself on the Ingredients tab. Photograph the printed date directly if you want it picked up.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes (for live scanning) | OpenAI API key |
| `OPENAI_VISION_MODEL` | No | Defaults to `gpt-4o-mini` |
| `INGREDIENT_SCAN_PROVIDER` | No | Set to `mock` to force sample results |

## Limits and troubleshooting

| Issue | Fix |
|-------|-----|
| Always returns eggs/milk/spinach | That is the mock provider — add `OPENAI_API_KEY` and restart |
| `Image is too large` (413) | Requests are capped near 6 MB of image data; retake at lower quality |
| Nothing detected | Get closer, improve lighting, photograph fewer items at once |
| Timeout after 60s | Check the API is reachable; vision calls normally take 3–10s |
| Camera prompt never appears | Grant camera access in system Settings for Expo Go or your dev build |

## Security

- The OpenAI key stays in `apps/api/.env.local` and is never bundled into the app
- Photos are sent to the API and forwarded to OpenAI; they are not stored server-side
- Uploading photos of other people's property or faces is not covered by the app's permissions copy — keep scans to your own food
