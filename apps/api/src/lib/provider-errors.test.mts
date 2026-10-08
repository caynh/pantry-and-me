import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ProviderRequestError,
  classifyProviderFailure,
  providerFailureResponse,
} from './provider-errors.ts';

test('quota and rate-limit responses are classified separately from outages', () => {
  assert.equal(classifyProviderFailure(429, 'Too many requests'), 'rate_limit');
  assert.equal(
    classifyProviderFailure(200, 'Your account has run out of searches.'),
    'rate_limit',
  );
  assert.equal(classifyProviderFailure(401, 'Incorrect API key'), 'auth');
  assert.equal(classifyProviderFailure(500, 'upstream timeout'), 'upstream');
});

test('a rate limit becomes a busy message and never a fake result', () => {
  const failure = providerFailureResponse(
    new ProviderRequestError('insufficient_quota', 429, 'rate_limit'),
    'scan',
  );

  assert.equal(failure.status, 503);
  assert.match(failure.error, /busy/i);
  assert.equal('items' in failure, false);
  assert.equal('results' in failure, false);
});

test('other provider failures stay errors', () => {
  const search = providerFailureResponse(new Error('SerpApi request failed with HTTP 500'), 'search');
  const scan = providerFailureResponse(
    new ProviderRequestError('invalid api key', 401, 'auth'),
    'scan',
  );

  assert.equal(search.status, 500);
  assert.match(search.error, /recipe search failed/i);
  assert.equal(scan.status, 500);
  assert.doesNotMatch(scan.error, /api key/i);
});
