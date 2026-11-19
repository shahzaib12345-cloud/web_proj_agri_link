import test from 'node:test';
import assert from 'node:assert/strict';
import { initialModeration } from '../src/utils/moderation.js';

test('off publishes every listing immediately', () => {
  assert.equal(initialModeration('off', { isVerified: false }), true);
  assert.equal(initialModeration('off', { isVerified: true }), true);
});

test('unverified holds listings from unverified farmers only', () => {
  assert.equal(initialModeration('unverified', { isVerified: false }), false);
  assert.equal(initialModeration('unverified', { isVerified: true }), true);
  assert.equal(initialModeration('unverified', undefined), false);
});

test('all holds every listing, even from verified farmers', () => {
  assert.equal(initialModeration('all', { isVerified: true }), false);
});

test('an unknown mode is treated as the strictest one', () => {
  assert.equal(initialModeration('typo', { isVerified: true }), false);
  assert.equal(initialModeration(undefined, { isVerified: true }), false);
});
