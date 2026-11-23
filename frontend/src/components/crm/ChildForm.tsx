'use client';

import { useState, type FormEvent } from 'react';
import { crmApi, errorText, type CrmChild } from '@/lib/crm-api';

export default function ChildForm({ path, child, onSaved, onCancel }: {
  path: string; child?: CrmChild; onSaved: (child: CrmChild) => void; onCancel?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      const result = await crmApi<{ child: CrmChild }>(path, {
        method: child ? 'PATCH' : 'POST', body: JSON.stringify(Object.fromEntries(form)),
      });
      onSaved(result.child);
    } catch (error) { setError(errorText(error)); }
    finally { setBusy(false); }
  }
  return <form className="crm-form" onSubmit={submit}>
    <div className="crm-form-columns">
      <label>Nume<input name="last_name" autoComplete="off" defaultValue={child?.last_name} required maxLength={120} /></label>
      <label>Prenume<input name="first_name" autoComplete="off" defaultValue={child?.first_name} required maxLength={120} /></label>
    </div>
    <label>Observații <span className="crm-optional">(opțional)</span><textarea name="notes" defaultValue={child?.notes} maxLength={255} rows={2} /></label>
    {error && <p className="crm-error" role="alert">{error}</p>}
    <div className="crm-actions"><button className="crm-button crm-primary" disabled={busy}>{busy ? 'Se salvează…' : child ? 'Salvează modificările' : 'Adaugă copilul'}</button>
      {onCancel && <button className="crm-button" type="button" onClick={onCancel} disabled={busy}>Renunță</button>}</div>
  </form>;
}
