'use client';

import { useState, type FormEvent } from 'react';
import { crmApi, errorText, type CrmChild } from '@/lib/crm-api';
import type { SessionPackageOffer } from '@/lib/api';
import { hasBasePackage, formatMoney, packagePatch, packageTotal, selectedPackages } from '@/lib/crm-packages';

export default function ChildForm({ path, child, offers, onSaved, onCancel }: {
  path: string; child?: CrmChild; offers: SessionPackageOffer[]; onSaved: (child: CrmChild) => void; onCancel?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [packages, setPackages] = useState(() => selectedPackages(child, offers));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      const result = await crmApi<{ child: CrmChild }>(path, {
        method: child ? 'PATCH' : 'POST', body: JSON.stringify({ ...Object.fromEntries(form), ...packages }),
      });
      onSaved(result.child);
    } catch (error) { setError(errorText(error)); }
    finally { setBusy(false); }
  }
  return <form className="crm-form" onSubmit={submit}>
    <div className="crm-form-columns">
      <label>Nume<input name="last_name" autoComplete="off" defaultValue={child?.last_name} autoFocus={!child} required maxLength={120} /></label>
      <label>Prenume<input name="first_name" autoComplete="off" defaultValue={child?.first_name} required maxLength={120} /></label>
    </div>
    <fieldset className="crm-package-options" disabled={busy}><legend>Pachetele copilului</legend>
      {offers.map(item => <label key={item.id}><input type={item.kind === 'base' ? 'radio' : 'checkbox'} name={item.kind === 'base' ? 'base_package' : undefined} value={item.id} checked={packages.package_ids.includes(item.id)} disabled={(!item.available && !packages.package_ids.includes(item.id)) || (item.kind === 'extra' && !hasBasePackage(packages, offers) && !packages.package_ids.includes(item.id))} onChange={() => setPackages(current => packagePatch(current, item.id, offers))} />
        <span><strong>{item.code}</strong> {item.name} · {formatMoney(item.price)} lei{!item.available && ' · indisponibil pentru comenzi noi'}</span></label>)}
      <p className="crm-help">Alege un pachet de bază. Poți adăuga oricâte opționale.</p>
    </fieldset>
    <p className="crm-form-total">Total: <strong>{formatMoney(packageTotal(packages, offers))} lei</strong></p>
    {child ? <label>Observații <span className="crm-optional">(opțional)</span><textarea name="notes" defaultValue={child.notes} maxLength={255} rows={2} /></label>
      : <details className="crm-notes"><summary>Observații (opțional)</summary><label><span className="crm-sr-only">Observații</span><textarea name="notes" maxLength={255} rows={2} /></label></details>}
    {!hasBasePackage(packages, offers) && !offers.some(item => item.kind === 'base' && item.available) && <p className="crm-help">Nu există un pachet de bază disponibil. Contactează administratorul.</p>}
    {error && <p className="crm-error" role="alert">{error}</p>}
    <div className="crm-actions"><button className="crm-button crm-primary" disabled={busy || !hasBasePackage(packages, offers)}>{busy ? 'Se salvează…' : child ? 'Salvează modificările' : 'Adaugă copilul'}</button>
      {onCancel && <button className="crm-button" type="button" onClick={onCancel} disabled={busy}>Renunță</button>}</div>
  </form>;
}
