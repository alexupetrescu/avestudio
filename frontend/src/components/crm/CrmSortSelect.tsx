'use client';

import { useCallback, useEffect, useState } from 'react';
import { CRM_SORTS, isCrmSort, type CrmSort } from '@/lib/crm-list';

export function useCrmSort(storageKey: string, initialSort: CrmSort = 'name-asc') {
  const [sort, setSort] = useState<CrmSort>(initialSort);
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
  return <fieldset className="crm-sort"><legend>{label}</legend><div className="crm-sort-buttons">
    {Object.entries(CRM_SORTS).map(([value, name]) => <button type="button" key={value} aria-pressed={sort === value} onClick={() => { if (isCrmSort(value)) onChange(value); }}>{name}</button>)}
  </div></fieldset>;
}
