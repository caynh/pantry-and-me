import assert from 'node:assert/strict';
import test from 'node:test';
import {
  liveProviderUnavailableMessage,
  liveProvidersRequired,
  mockProviderBlocked,
} from './live-providers.ts';

function withEnv(values: Record<string, string | undefined>, run: () => void) {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('mock results are blocked only when live providers are required', () => {
  withEnv({ NODE_ENV: 'development', REQUIRE_LIVE_PROVIDERS: undefined }, () => {
    assert.equal(liveProvidersRequired(), false);
    assert.equal(mockProviderBlocked('mock'), false);
  });

  withEnv({ NODE_ENV: 'production', REQUIRE_LIVE_PROVIDERS: undefined }, () => {
    assert.equal(liveProvidersRequired(), true);
    assert.equal(mockProviderBlocked('mock'), true);
    assert.equal(mockProviderBlocked('openai'), false);
    assert.equal(mockProviderBlocked('serpapi'), false);
  });

  withEnv({ NODE_ENV: 'development', REQUIRE_LIVE_PROVIDERS: 'true' }, () => {
    assert.equal(mockProviderBlocked('mock'), true);
  });

  withEnv({ NODE_ENV: 'production', REQUIRE_LIVE_PROVIDERS: 'false' }, () => {
    assert.equal(mockProviderBlocked('mock'), false);
  });
});

test('unavailable copy names the feature without mentioning mock data', () => {
  assert.match(liveProviderUnavailableMessage('scan'), /photo scanning/i);
  assert.match(liveProviderUnavailableMessage('search'), /recipe search/i);
  assert.doesNotMatch(liveProviderUnavailableMessage('scan'), /mock/i);
});
