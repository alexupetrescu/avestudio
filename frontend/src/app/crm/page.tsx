'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCrmUser } from '@/components/crm/CrmProvider';
import { crmApi, errorText, type CrmClass } from '@/lib/crm-api';

export default function CrmHome() {
  const user = useCrmUser();
  const [classes, setClasses] = useState<CrmClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  async function load() {
    setLoading(true); setError('');
    try { setClasses((await crmApi<{ classes: CrmClass[] }>('classes/')).classes); }
    catch (error) { setError(errorText(error)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const filtered = classes.filter(item => `${item.name} ${item.school_name} ${item.session_label} ${item.city}`.toLocaleLowerCase('ro').includes(search.toLocaleLowerCase('ro')));
  return <>
    <div className="crm-page-heading"><div><p className="crm-eyebrow">SPAȚIUL TĂU DE LUCRU</p><h1>Bună, {user?.name.split(' ')[0]}.</h1><p className="crm-muted">Alege o clasă pentru a adăuga copii și fotografii.</p></div><span className="crm-badge">{classes.length} clase</span></div>
    <div className="crm-toolbar"><h2>Clasele tale</h2><label className="crm-search"><span className="crm-sr-only">Caută o clasă sau o școală</span><input type="search" placeholder="Caută o clasă sau o școală…" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
    {loading ? <p className="crm-empty" role="status">Se încarcă clasele…</p> : error ? <div className="crm-empty"><p className="crm-error" role="alert">{error}</p><button className="crm-button" onClick={load}>Reîncearcă</button></div>
      : classes.length === 0 ? <div className="crm-empty"><h2>Încă nu ai clase alocate</h2><p>Administratorul îți poate acorda acces la o clasă existentă.</p></div>
      : filtered.length === 0 ? <p className="crm-empty">Nu am găsit clase pentru „{search}”.</p>
      : <div className="crm-class-grid">{filtered.map(item => <Link className="crm-class-card" key={item.id} href={`/crm/classes/${item.id}`}>
        <div className="crm-class-top"><span className="crm-school-icon" aria-hidden="true">▦</span><span className="crm-session">{item.session_label}</span></div>
        <p className="crm-school-name">{item.school_name}{item.city ? ` · ${item.city}` : ''}</p><h3>{item.name}</h3>
        <p className="crm-card-teacher">{item.teacher_name || 'Cadru didactic nespecificat'}</p>
        {item.shoot_display && <p className="crm-shoot">{item.shoot_display}</p>}
        <div className="crm-card-meta"><span><strong>{item.child_count}</strong> copii</span><span><strong>{item.photo_count}</strong> fotografii</span><span className="crm-open-label">Deschide clasa</span></div>
      </Link>)}</div>}
  </>;
}
