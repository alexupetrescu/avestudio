import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasBasePackage, packagePatch, packageTotal, selectedPackages } from './crm-packages.ts';
const offers = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, code: `P${i}`, kind: i < 3 ? 'base' : 'extra', available: true, price: i < 3 ? 10.25 * (i + 1) : 0.10 }));
test('the first available base is the default and any number of extras can be selected', () => {
  let selection = selectedPackages(undefined, offers);
  for (const extra of offers.filter(item => item.kind === 'extra')) selection = packagePatch(selection, extra.id, offers);
  assert.equal(selection.package_ids.length, 6);
  assert.equal(packageTotal(selection, offers), 10.75);
});
test('switching among more than two bases preserves every extra and keeps one base', () => {
  const current = { package_ids: ['p0', 'p3', 'p4', 'p5'] };
  const next = packagePatch(current, 'p2', offers);
  assert.deepEqual(new Set(next.package_ids), new Set(['p2', 'p3', 'p4', 'p5']));
  assert.equal(next.package_ids.filter(id => offers.find(offer => offer.id === id)?.kind === 'base').length, 1);
  assert.ok(hasBasePackage(next, offers));
});
test('extras require a base; unavailable choices cannot be newly selected', () => {
  const empty = { package_ids: [] };
  assert.deepEqual(packagePatch(empty, 'p3', offers), empty);
  const archived = offers.map(offer => ({ ...offer, available: offer.id !== 'p0' }));
  assert.deepEqual(selectedPackages(undefined, archived).package_ids, ['p1']);
  assert.deepEqual(packagePatch(empty, 'p0', archived), empty);
});
test('selected archived extras can be removed and prices sum in cents', () => {
  const archived = offers.map(offer => ({ ...offer, available: offer.id !== 'p3' }));
  assert.deepEqual(packagePatch({ package_ids: ['p0', 'p3'] }, 'p3', archived).package_ids, ['p0']);
  assert.equal(packageTotal({ package_ids: ['p3', 'p4', 'p5'] }, offers), 0.3);
});
