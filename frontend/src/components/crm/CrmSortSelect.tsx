'use client';

import { useCallback, useEffect, useState } from 'react';
import { CRM_SORTS, isCrmSort, type CrmSort } from '@/lib/crm-list';

export function useCrmSort(storageKey: string) {
  const [sort, setSort] = useState<CrmSort>('name-asc');
  useEffect(() => {
    try { const saved = localStorage.getItem(storageKey); if (isCrmSort(saved)) setSort(saved); } catch { /* Private browser modes may disable storage. */ }
  }, [storageKey]);
  const changeSort = useCallback((value: CrmSort) => {
    setSort(value);
    try { localStorage.setItem(storageKey, value); } catch { /* Sorting is available without persistence. */ }
  }, [storageKey]);
  return [sort, changeSort] as const;
}

export default function CrmSortSelect({ sort, onChange, label }: { sort: CrmSort; onChange: (sort: CrmSort) => void; label: string }) {
  return <label className="crm-sort"><span className="crm-sr-only">{label}</span><select aria-label={label} value={sort} onChange={event => { if (isCrmSort(event.target.value)) onChange(event.target.value); }}>
    {Object.entries(CRM_SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
  </select></label>;
}
