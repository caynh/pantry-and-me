import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.join(scriptDir, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

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

const env = {
  ...loadEnvFile(path.join(apiDir, '.env')),
  ...loadEnvFile(path.join(apiDir, '.env.local')),
};

const apiKey = env.SERPAPI_API_KEY;

if (!apiKey) {
  console.error('Missing SerpApi credentials.');
  console.error('');
  console.error('1. Sign up at https://serpapi.com/ (100 free searches/month)');
  console.error('2. Copy your API key into apps/api/.env.local as SERPAPI_API_KEY');
  console.error('3. Follow docs/recipe-search.md');
  console.error('4. Re-run: npm run verify:search --workspace @pantry-and-me/api');
  process.exit(1);
}

const params = new URLSearchParams({
  engine: 'google',
  q: 'chicken rice recipe site:allrecipes.com',
  api_key: apiKey,
  num: '3',
});

console.log('Testing SerpApi recipe search...');

const response = await fetch(`https://serpapi.com/search.json?${params}`);
const body = await response.json();

if (!response.ok || body.error) {
  console.error('SerpApi request failed.');
  console.error(`HTTP ${response.status}`);
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

const items = body.organic_results ?? [];

console.log('');
console.log(`Success — ${items.length} result(s) returned.`);
console.log('');

for (const [index, item] of items.entries()) {
  console.log(`${index + 1}. ${item.title}`);
  console.log(`   ${item.link}`);
}

if (items.length === 0) {
  console.warn('No results returned. Try broadening the query or check your account quota.');
}
