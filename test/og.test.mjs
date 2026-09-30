import test from 'node:test';
import assert from 'node:assert/strict';
import { toUnicodeHost } from '../lib/og/render.js';

test('punycode visas med svenska tecken', () => {
  assert.equal(toUnicodeHost('xn--mlarbyggare-x8a.se'), 'målarbyggare.se');
  assert.equal(toUnicodeHost('www.exempel.se'), 'www.exempel.se');
});
