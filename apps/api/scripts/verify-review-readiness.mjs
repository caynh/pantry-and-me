import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.join(scriptDir, '..');
const args = new Set(process.argv.slice(2));
const keysOnly = args.has('--keys-only');
const live = args.has('--live');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const env = {};

  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const env = {
  ...loadEnvFile(path.join(apiDir, '.env')),
  ...loadEnvFile(path.join(apiDir, '.env.local')),
  ...process.env,
};

const serpKey = env.SERPAPI_API_KEY ?? '';
const openAiKey = env.OPENAI_API_KEY ?? '';
const minSearches = Number(env.MIN_SERPAPI_SEARCHES ?? 20);

if (!serpKey || !openAiKey) {
  fail('Review readiness needs SERPAPI_API_KEY and OPENAI_API_KEY in apps/api/.env.local.');
  fail('Without them the API serves sample recipes and sample ingredients.');
  process.exit(1);
}

if (env.REQUIRE_LIVE_PROVIDERS === 'false') {
  fail('REQUIRE_LIVE_PROVIDERS=false lets a review build serve mock results. Remove it.');
}

const serpAccount = await fetch(`https://serpapi.com/account.json?api_key=${encodeURIComponent(serpKey)}`);
const serpBody = await serpAccount.json().catch(() => ({}));

if (!serpAccount.ok || serpBody.error) {
  fail(`SerpApi rejected the key (${serpAccount.status}).`);
} else {
  const left = Number(serpBody.plan_searches_left ?? serpBody.total_searches_left);
  console.log(`SerpApi searches left: ${Number.isFinite(left) ? left : 'unknown'}`);

  if (!Number.isFinite(left) || left < minSearches) {
    fail(
      `SerpApi has ${Number.isFinite(left) ? left : 'an unknown number of'} searches left. Keep at least ${minSearches} before App Review.`,
    );
  }
}

const models = await fetch('https://api.openai.com/v1/models', {
  headers: { Authorization: `Bearer ${openAiKey}` },
});

if (!models.ok) {
  fail(`OpenAI rejected the key (HTTP ${models.status}). Photo scanning will fail in review.`);
} else {
  console.log('OpenAI key accepted.');
}

if (live) {
  const search = await fetch(`https://serpapi.com/search.json?${new URLSearchParams({
    engine: 'google',
    q: 'chicken rice recipe',
    api_key: serpKey,
    num: '1',
  })}`);
  const searchBody = await search.json().catch(() => ({}));

  if (!search.ok || searchBody.error || !searchBody.organic_results?.length) {
    fail(`Live recipe search failed: ${searchBody.error ?? `HTTP ${search.status}`}`);
  } else {
    console.log(`Live recipe search returned: ${searchBody.organic_results[0].link}`);
  }

  const scan = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
      max_tokens: 20,
      messages: [{ role: 'user', content: 'Reply with the word ok.' }],
    }),
  });

  if (!scan.ok) {
    const scanBody = await scan.json().catch(() => ({}));
    fail(`Live OpenAI call failed: ${scanBody.error?.message ?? `HTTP ${scan.status}`}`);
  } else {
    console.log('Live OpenAI call succeeded.');
  }
}

if (!keysOnly) {
  const apiUrl = (env.REVIEW_API_URL || 'http://localhost:3000').replace(/\/$/, '');

  try {
    const healthResponse = await fetch(`${apiUrl}/api/health`);
    const health = await healthResponse.json();

    if (!healthResponse.ok) {
      fail(`Health check failed (${healthResponse.status}) at ${apiUrl}/api/health.`);
    } else if (!health.readyForReview) {
      fail(
        `API at ${apiUrl} is not review-ready. recipeSearch=${health.recipeSearch?.mode}, ingredientScan=${health.ingredientScan?.mode}.`,
      );
    } else {
      console.log(`API at ${apiUrl} is serving live search and scanning.`);
    }

    const privacy = await fetch(`${apiUrl}/privacy`);
    if (!privacy.ok) {
      fail(`Privacy policy returned HTTP ${privacy.status} at ${apiUrl}/privacy.`);
    } else {
      const html = await privacy.text();
      if (!/privacy policy/i.test(html) || !/delete account/i.test(html)) {
        fail(`Privacy policy at ${apiUrl}/privacy is missing the account-deletion section.`);
      } else {
        console.log(`Privacy policy is up at ${apiUrl}/privacy`);
      }
    }
  } catch (error) {
    fail(
      `Could not reach ${apiUrl}. Start the API, or set REVIEW_API_URL to the deployed API. (${error instanceof Error ? error.message : 'network error'})`,
    );
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(live ? 'Review checks passed, including one live call to each provider.' : 'Review checks passed.');
