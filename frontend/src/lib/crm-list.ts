export const CRM_SORTS = { oldest: 'Ordinea adăugării', newest: 'Ultimii adăugați', 'name-asc': 'Nume A–Z', 'name-desc': 'Nume Z–A' };
export type CrmSort = keyof typeof CRM_SORTS;

type CrmListItem = { id: string; name: string; created_at?: string | null; entry_index?: number; source_index?: number };

export function isCrmSort(value: string | null): value is CrmSort {
  return value !== null && Object.hasOwn(CRM_SORTS, value);
}

export function searchKey(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('ro').trim();
}

export function matchesCrmSearch(value: string, query: string) {
  const key = searchKey(value);
  return searchKey(query).split(/\s+/).every(token => key.includes(token));
}

export function compareCrmItems(a: CrmListItem, b: CrmListItem, sort: CrmSort) {
  const names = a.name.localeCompare(b.name, 'ro', { sensitivity: 'base', numeric: true });
  const indexed = Number.isSafeInteger(a.entry_index) && Number.isSafeInteger(b.entry_index);
  // Persisted roster indexes define insertion order even when dates are missing or rounded alike.
  const index = indexed ? a.entry_index! - b.entry_index! : (a.source_index ?? 0) - (b.source_index ?? 0);
  const fallback = index || a.id.localeCompare(b.id);
  if (sort === 'name-asc') return names || fallback;
  if (sort === 'name-desc') return -names || fallback;
  const aTime = Date.parse(a.created_at ?? '');
  const bTime = Date.parse(b.created_at ?? '');
  const time = Number.isFinite(aTime) && Number.isFinite(bTime) ? Math.floor(aTime / 1000) - Math.floor(bTime / 1000) : 0;
  const order = (indexed ? index : time || index) || a.id.localeCompare(b.id);
  return sort === 'newest' ? -order : order;
}

const addedFormat = new Intl.DateTimeFormat('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Bucharest' });

export function addedAtLabel(value?: string | null) {
  const time = Date.parse(value ?? '');
  return Number.isFinite(time) ? addedFormat.format(time) : 'Data necunoscută';
}
