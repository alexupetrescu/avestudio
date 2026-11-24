export const CRM_SORTS = { 'name-asc': 'Nume A–Z', 'name-desc': 'Nume Z–A', newest: 'Cele mai noi', oldest: 'Cele mai vechi' };
export type CrmSort = keyof typeof CRM_SORTS;

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

export function compareCrmItems(a: { id: string; name: string; created_at: string }, b: { id: string; name: string; created_at: string }, sort: CrmSort) {
  const names = a.name.localeCompare(b.name, 'ro', { sensitivity: 'base', numeric: true }) || a.id.localeCompare(b.id);
  if (sort === 'name-asc') return names;
  if (sort === 'name-desc') return -names;
  const time = (Date.parse(a.created_at) || 0) - (Date.parse(b.created_at) || 0);
  return (sort === 'newest' ? -time : time) || names;
}
