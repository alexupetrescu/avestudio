'use client';

import { useState, type FormEvent } from 'react';
import { crmApi, errorText, type CrmChild, type CrmPrices } from '@/lib/crm-api';
import { CRM_PACKAGES, packagePatch, packageTotal, selectedPackages } from '@/lib/crm-packages';

export default function ChildForm({ path, child, prices, onSaved, onCancel }: {
  path: string; child?: CrmChild; prices: CrmPrices; onSaved: (child: CrmChild) => void; onCancel?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [packages, setPackages] = useState(() => selectedPackages(child));
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
      {CRM_PACKAGES.map(item => <label key={item.key}><input type={item.key === 'package_a' || item.key === 'package_b' ? 'radio' : 'checkbox'} name={item.key === 'package_a' || item.key === 'package_b' ? 'base_package' : undefined} value={item.letter} checked={packages[item.key]} disabled={item.letter > 'B' && !packages.package_a && !packages.package_b} onChange={() => setPackages(current => ({ ...current, ...packagePatch(current, item.key) }))} />
        <span><strong>{item.letter}</strong> {item.name} · {prices[item.priceKey]} lei</span></label>)}
      <p className="crm-help">Alege A sau B. C, D și E se pot adăuga în plus.</p>
    </fieldset>
    <p className="crm-form-total">Total: <strong>{packageTotal(packages, prices)} lei</strong></p>
    {child ? <label>Observații <span className="crm-optional">(opțional)</span><textarea name="notes" defaultValue={child.notes} maxLength={255} rows={2} /></label>
      : <details className="crm-notes"><summary>Observații (opțional)</summary><label><span className="crm-sr-only">Observații</span><textarea name="notes" maxLength={255} rows={2} /></label></details>}
    {error && <p className="crm-error" role="alert">{error}</p>}
    <div className="crm-actions"><button className="crm-button crm-primary" disabled={busy || (!packages.package_a && !packages.package_b)}>{busy ? 'Se salvează…' : child ? 'Salvează modificările' : 'Adaugă copilul'}</button>
      {onCancel && <button className="crm-button" type="button" onClick={onCancel} disabled={busy}>Renunță</button>}</div>
  </form>;
}
