import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addedAtLabel, compareCrmItems } from './crm-list.ts';

const items = [
  { id: 'a', name: 'Alpha', entry_index: 3, created_at: null },
  { id: 'b', name: 'Zulu', entry_index: 1, created_at: '2026-11-24T12:00:00.900Z' },
  { id: 'c', name: 'Beta', entry_index: 2, created_at: '2026-11-24T12:00:00.100Z' },
];
function indexes(sort, rows = items) { return [...rows].sort((a, b) => compareCrmItems(a, b, sort)).map(item => item.entry_index); }
test('insertion order uses stored index for missing dates and equal seconds rather than names or UUIDs', () => {
  assert.deepEqual(indexes('oldest'), [1, 2, 3]);
  assert.deepEqual(indexes('newest'), [3, 2, 1]);
  assert.deepEqual(indexes('oldest', items.map(item => ({ ...item, created_at: 'invalid' }))), [1, 2, 3]);
});
test('name sorting remains available and duplicate names use stable entry index', () => {
  assert.deepEqual(indexes('name-asc'), [3, 2, 1]);
  assert.deepEqual(indexes('name-desc'), [1, 2, 3]);
  assert.deepEqual(indexes('name-asc', items.map(item => ({ ...item, name: 'Same name' }))), [1, 2, 3]);
});
test('class dates tied to the same second preserve their source index', () => {
  const rows = items.slice(1).map((item, source_index) => ({ ...item, entry_index: undefined, source_index }));
  assert.equal([...rows].sort((a, b) => compareCrmItems(a, b, 'oldest'))[0].id, 'b');
});
test('legacy missing/invalid timestamps render safely and valid timestamps show seconds', () => {
  assert.equal(addedAtLabel(null), 'Data necunoscută');
  assert.equal(addedAtLabel('invalid'), 'Data necunoscută');
  assert.match(addedAtLabel('2026-11-24T12:00:13Z'), /14:00:13/);
});
