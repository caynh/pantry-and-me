# Barcode lookup setup

The **Scan barcode** flow reads the barcode on a packaged item and fills in the product name, brand, and package size for you. It uses [Open Food Facts](https://world.openfoodfacts.org/), which is free, keyless, and needs no signup — barcode lookup works the moment you pull the code.

Nothing is saved until you confirm, so a wrong or missing match costs you one edit rather than a bad entry.

## Why Open Food Facts

| | |
|---|---|
| **Cost** | Free, unlimited, no API key |
| **Coverage** | Strong on packaged and international groceries, thinner on US store brands |
| **Data** | Community-maintained, so fields are often incomplete |

It is a community database, not a commercial catalog. Plenty of real products have a name but no package size — Nutella is a good example. That is expected, and the confirm screen lets you fill in the gaps.

## How the flow works

1. **Ingredients** tab → **Scan barcode**
2. Grant camera access the first time
3. Point at the barcode; the first successful read stops the scanner
4. `POST /api/ingredients/barcode` looks the code up
5. Review the product, adjust anything, set an expiration date
6. **Add to ingredients** writes it with `source: 'barcode'` and the barcode saved in notes

Supported symbologies are EAN-13, EAN-8, UPC-A, and UPC-E, which covers retail grocery packaging.

## Testing without a camera

The iOS simulator has no camera, and web browsers can't run the native scanner. Both fall back to a manual entry box on the same screen — type any barcode number and press **Look up**. Useful codes:

| Code | Result |
|---|---|
| `3017620422003` | Nutella — found, but no package size in the database |
| `0049000042566` | Coca-Cola Zero Sugar, 355 ml |
| `00000000` | Forces the "not found" path when `BARCODE_LOOKUP_PROVIDER=mock` |

From the terminal:

```bash
curl -s -X POST http://localhost:3000/api/ingredients/barcode \
  -H "Content-Type: application/json" \
  -d '{"barcode":"3017620422003"}'
```

## Storage location guessing

Open Food Facts tags products by category, and the API maps those tags to a suggested storage location: frozen categories to the freezer, dairy, fresh meat, and seafood to the fridge, everything else to the pantry. It is a starting guess, always overridable on the confirm screen. The mapping lives in `guessLocation()` in `apps/api/src/lib/barcode-lookup/providers/openfoodfacts.ts`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BARCODE_LOOKUP_PROVIDER` | No | Set to `mock` to return canned products without network calls |

## Limits and troubleshooting

| Issue | Fix |
|-------|-----|
| Every scan returns "Sample pantry item" | That is the mock provider — remove `BARCODE_LOOKUP_PROVIDER=mock` and restart |
| Product not found | Common for US store brands; add the name by hand, or contribute the product to Open Food Facts |
| Name in the wrong language | Open Food Facts is community data; the API prefers the English name when one exists |
| Scanner never fires | Check camera permission, hold 4–8 inches away, and make sure the whole barcode is in frame |
| No package size returned | The database field is genuinely empty for many products |

## If coverage becomes a problem

The provider sits behind the same abstraction as recipe search, so adding a paid fallback is one file in `apps/api/src/lib/barcode-lookup/providers/` plus a branch in `index.ts`. UPCitemdb and Barcode Lookup both have broader US catalogs, both need a key, and both charge past a small free tier. Worth doing only if you find yourself typing in names regularly.
