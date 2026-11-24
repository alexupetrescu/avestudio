'use client';

import { useRef, useState } from 'react';
import { childPath, crmApi, errorText, type CrmChild } from '@/lib/crm-api';
import type { SessionPackageOffer } from '@/lib/api';
import { packagePatch, packageTotal, selectedPackages, type PackageKey, type PackageSelection } from '@/lib/crm-packages';
import { useCrmPendingWork } from './CrmProvider';

type PendingOrder = { confirmed: CrmChild; desired: CrmChild; version: number; running: boolean };

export default function useCrmOrders(classId: string, offers: SessionPackageOffer[] | undefined,
  apply: (id: string, packages: PackageSelection, total: number) => void) {
  const pending = useRef(new Map<string, PendingOrder>());
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  useCrmPendingWork(Object.values(saving).some(Boolean), 'Se salvează pachetele. Așteaptă finalizarea înainte de a părăsi lista.');

  async function flush(id: string, order: PendingOrder) {
    if (order.running) return;
    order.running = true;
    let failed = false;
    setSaving(current => ({ ...current, [id]: true }));
    try {
      while (true) {
        const version = order.version;
        try {
          const result = await crmApi<{ child: CrmChild }>(childPath(classId, id), {
            method: 'PATCH', body: JSON.stringify(selectedPackages(order.desired)),
          });
          order.confirmed = result.child;
          if (version !== order.version) continue;
          apply(id, selectedPackages(result.child), result.child.total_lei);
        } catch (error) {
          if (version !== order.version) continue;
          apply(id, selectedPackages(order.confirmed), order.confirmed.total_lei);
          setErrors(current => ({ ...current, [id]: errorText(error) }));
          failed = true;
        }
        break;
      }
    } finally {
      order.running = false;
      if (!failed) pending.current.delete(id);
      setSaving(current => ({ ...current, [id]: false }));
    }
  }

  function toggle(child: CrmChild, key: PackageKey) {
    if (!offers) return;
    const existing = pending.current.get(child.id);
    const current = existing?.running ? existing.desired : child;
    const selection = { ...current, ...packagePatch(current, key, offers) };
    if (current.package_ids.length === selection.package_ids.length && current.package_ids.every(id => selection.package_ids.includes(id))) return;
    const desired = { ...selection, total_lei: packageTotal(selection, offers) };
    const order = existing || { confirmed: child, desired, version: 0, running: false };
    order.desired = desired; order.version += 1;
    pending.current.set(child.id, order);
    setErrors(current => ({ ...current, [child.id]: '' }));
    apply(child.id, selectedPackages(desired), desired.total_lei);
    void flush(child.id, order);
  }
  function retry(id: string) {
    const order = pending.current.get(id);
    if (!order || order.running) return;
    setErrors(current => ({ ...current, [id]: '' }));
    apply(id, selectedPackages(order.desired), order.desired.total_lei);
    void flush(id, order);
  }
  return { toggle, retry, saving, errors };
}
