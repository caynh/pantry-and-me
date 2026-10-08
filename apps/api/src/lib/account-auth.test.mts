import assert from 'node:assert/strict';
import test from 'node:test';
import { readBearerToken } from './account-auth.ts';

test('reads a bearer token and ignores anything else', () => {
  assert.equal(readBearerToken('Bearer abc.def.ghi'), 'abc.def.ghi');
  assert.equal(readBearerToken('bearer token-1'), 'token-1');
  assert.equal(readBearerToken(null), null);
  assert.equal(readBearerToken('Basic abc'), null);
  assert.equal(readBearerToken('Bearer'), null);
});
