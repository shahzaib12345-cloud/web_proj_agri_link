import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPassword, normalizePhone } from '../src/constants/limits.js';
import {
  addDaysISO,
  inRange,
  isObjectId,
  isRealISODate,
  isSafeImageUrl,
  isValidHarvestDate,
  num,
  str,
  strings,
  todayISO,
} from '../src/utils/validate.js';

test('normalizePhone accepts the common Pakistani formats and rejects the rest', () => {
  for (const ok of ['+923001234567', '03001234567', '0300 1234567', '+92 300 1234567', '923001234567', '00923001234567']) {
    assert.equal(normalizePhone(ok), '+923001234567', ok);
  }
  for (const bad of ['', '12345', '+921234567890', '0400 1234567', '+92300123456', null, undefined, 3001234567, {}]) {
    assert.equal(normalizePhone(bad), null, String(bad));
  }
});

test('checkPassword enforces length and letters + digits', () => {
  assert.equal(checkPassword('Demo@1234'), null);
  assert.equal(checkPassword('short1'), 'short');
  assert.equal(checkPassword('a'.repeat(65) + '1'), 'long');
  assert.equal(checkPassword('onlyletters'), 'weak');
  assert.equal(checkPassword('12345678'), 'weak');
  assert.equal(checkPassword(undefined), 'weak');
  assert.equal(checkPassword({ $ne: 1 }), 'weak');
});

test('num/str never coerce', () => {
  assert.ok(Number.isNaN(num('5')));
  assert.ok(Number.isNaN(num(null)));
  assert.ok(Number.isNaN(num(Infinity)));
  assert.equal(num(5), 5);
  assert.equal(str('  hi  ', 10), 'hi');
  assert.equal(str('x'.repeat(11), 10), '');
  assert.equal(str({ $gt: '' }, 10), '');
  assert.equal(str('   ', 10), '');
});

test('inRange', () => {
  assert.ok(inRange(5, 1, 10));
  assert.ok(!inRange(0, 1, 10));
  assert.ok(!inRange(NaN, 1, 10));
});

test('strings filters and bounds arrays', () => {
  assert.deepEqual(strings(['a', ' b ', 1, '', null]), ['a', 'b']);
  assert.deepEqual(strings('nope'), []);
  assert.equal(strings(Array(100).fill('x'), 20).length, 20);
});

test('isObjectId', () => {
  assert.ok(isObjectId('507f1f77bcf86cd799439011'));
  assert.ok(!isObjectId('507f1f77bcf86cd79943901'));
  assert.ok(!isObjectId({ $ne: 1 }));
});

test('dates are real, in Pakistan time, and harvest bounds hold', () => {
  assert.match(todayISO(), /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(isRealISODate('2026-02-28'));
  assert.ok(!isRealISODate('2026-02-31'));
  assert.ok(!isRealISODate('26-02-01'));
  assert.ok(isValidHarvestDate(todayISO()));
  assert.ok(isValidHarvestDate(addDaysISO(-364)));
  assert.ok(!isValidHarvestDate(addDaysISO(1)));
  assert.ok(!isValidHarvestDate(addDaysISO(-400)));
  // 00:30 PKT on 12 Nov is still 11 Nov in UTC: the server must use Pakistan's calendar day.
  assert.equal(todayISO(new Date('2026-11-11T19:30:00Z')), '2026-11-12');
});

test('isSafeImageUrl allows bundled images and https only', () => {
  assert.ok(isSafeImageUrl('/images/grain.webp'));
  assert.ok(isSafeImageUrl('https://cdn.example.com/a.jpg'));
  for (const bad of ['http://x.com/a.jpg', 'javascript:alert(1)', '//evil.com/a.jpg', '/images/../secret', 'data:image/png;base64,AAA', '', null, '/other/a.png']) {
    assert.ok(!isSafeImageUrl(bad), String(bad));
  }
});
