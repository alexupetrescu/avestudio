'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import ChildForm from '@/components/crm/ChildForm';
import { classPath, crmApi, errorText, type CrmChild, type CrmClass } from '@/lib/crm-api';

export default function CrmClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{ class: CrmClass; children: CrmChild[] } | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    crmApi<{ class: CrmClass; children: CrmChild[] }>(classPath(id))
      .then(result => { if (active) { setData(result); setError(''); } })
      .catch(error => { if (active) setError(errorText(error)); });
    return () => { active = false; };
  }, [id, attempt]);
  const children = data?.children.filter(child => `${child.last_name} ${child.first_name}`.toLocaleLowerCase('ro').includes(search.toLocaleLowerCase('ro'))) || [];
  return <>
    <nav className="crm-breadcrumb" aria-label="Navigare"><Link href="/crm">Clasele tale</Link><span>/</span><span>{data?.class.name || 'Clasă'}</span></nav>
    {error ? <div className="crm-empty"><p className="crm-error" role="alert">{error}</p><button className="crm-button" onClick={() => setAttempt(attempt + 1)}>Reîncearcă</button></div> : !data ? <p className="crm-empty" role="status">Se încarcă clasa…</p> : <>
      <div className="crm-page-heading"><div><p className="crm-eyebrow">{data.class.school_name}</p><h1>{data.class.name}</h1><p className="crm-muted">{data.class.session_label}{data.class.teacher_name ? ` · ${data.class.teacher_name}` : ''}</p>{data.class.shoot_display && <p className="crm-help">{data.class.shoot_display}</p>}</div>
        <button className="crm-button crm-primary" onClick={() => setAdding(!adding)} aria-expanded={adding}>Adaugă un copil</button></div>
      {adding && <section className="crm-card crm-add-child" aria-labelledby="new-child-title"><h2 id="new-child-title">Copil nou în {data.class.name}</h2><ChildForm path={`${classPath(id)}children/`} onCancel={() => setAdding(false)} onSaved={child => {
        setData(current => current ? { ...current, children: [...current.children, child].sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'ro')) } : null);
        setAdding(false); setNotice(`${child.first_name} ${child.last_name} a fost adăugat.`);
      }} /></section>}
      {notice && <p className="crm-success" role="status">{notice}</p>}
      <div className="crm-toolbar"><h2>Copii <span className="crm-count">{data.children.length}</span></h2><label className="crm-search"><span className="crm-sr-only">Caută un copil</span><input type="search" placeholder="Caută după nume…" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
      {children.length === 0 ? <div className="crm-empty"><h2>{search ? 'Niciun rezultat' : 'Începe cu primul copil'}</h2><p>{search ? 'Încearcă un alt nume.' : 'Adaugă numele copilului, apoi portretul și fotografiile sale.'}</p></div>
        : <div className="crm-roster">{children.map(child => <Link href={`/crm/classes/${id}/children/${child.id}`} className="crm-child-row" key={child.id}>
          <div className="crm-avatar">{child.reference_url ? <img src={child.reference_url} alt="" loading="lazy" /> : <span>{child.first_name[0]}{child.last_name[0]}</span>}</div>
          <div className="crm-child-name"><h3>{child.last_name} {child.first_name}</h3><p>{child.photo_count} fotografii în album</p></div>
          <span className={`crm-reference-state ${child.reference_url ? 'crm-reference-ready' : ''}`}>{child.reference_url ? 'Portret adăugat' : 'Fără portret'}</span><span className="crm-row-action">Deschide</span>
        </Link>)}</div>}
    </>}
  </>;
}
