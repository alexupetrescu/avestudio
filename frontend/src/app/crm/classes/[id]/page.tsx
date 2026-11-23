'use client';

import Link from 'next/link';
import { Fragment, use, useEffect, useState } from 'react';
import ChildForm from '@/components/crm/ChildForm';
import QuickPhotoUpload from '@/components/crm/QuickPhotoUpload';
import { childPath, classPath, crmApi, errorText, type CrmChild, type CrmClass } from '@/lib/crm-api';
import { CRM_PACKAGES, packagePatch, packageTotal, type PackageKey } from '@/lib/crm-packages';

const SORTS = { 'name-asc': 'Nume A–Z', 'name-desc': 'Nume Z–A', newest: 'Adăugați recent', oldest: 'Adăugați întâi' };
type Sort = keyof typeof SORTS;
const addedFormat = new Intl.DateTimeFormat('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bucharest' });

export default function CrmClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{ class: CrmClass; children: CrmChild[] } | null>(null);
  const [error, setError] = useState('');
  const [orderError, setOrderError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('name-asc');
  const [adding, setAdding] = useState(true);
  const [newChildVersion, setNewChildVersion] = useState(0);
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [savingChild, setSavingChild] = useState<string | null>(null);
  const [quickChild, setQuickChild] = useState<string | null>(null);
  const [uploadPending, setUploadPending] = useState(false);

  useEffect(() => {
    try { const saved = localStorage.getItem('crm-roster-sort'); if (saved && saved in SORTS) setSort(saved as Sort); } catch { /* Storage may be disabled. */ }
  }, []);
  useEffect(() => {
    let active = true;
    crmApi<{ class: CrmClass; children: CrmChild[] }>(classPath(id))
      .then(result => { if (active) { setData(result); setError(''); } })
      .catch(error => { if (active) setError(errorText(error)); });
    return () => { active = false; };
  }, [id, attempt]);

  function changeSort(value: Sort) {
    setSort(value);
    try { localStorage.setItem('crm-roster-sort', value); } catch { /* Sorting still works without storage. */ }
  }
  function replaceChild(child: CrmChild) {
    setData(current => current ? { ...current, children: current.children.map(item => item.id === child.id ? child : item) } : null);
  }
  async function togglePackage(child: CrmChild, key: PackageKey) {
    if (!data || savingChild) return;
    const patch = packagePatch(child, key);
    const optimistic = { ...child, ...patch };
    setSavingChild(child.id); setOrderError(''); setNotice('');
    replaceChild({ ...optimistic, total_lei: packageTotal(optimistic, data.class.prices) });
    try {
      const result = await crmApi<{ child: CrmChild }>(childPath(id, child.id), { method: 'PATCH', body: JSON.stringify(patch) });
      replaceChild(result.child); setNotice('Pachetele au fost salvate.');
    } catch (error) { replaceChild(child); setOrderError(errorText(error)); }
    finally { setSavingChild(null); }
  }
  async function refreshPhoto(childId: string) {
    try {
      const result = await crmApi<{ child: CrmChild }>(childPath(id, childId));
      setData(current => current ? { ...current, children: current.children.map(item => item.id === childId
        ? { ...item, reference_url: result.child.reference_url, photo_count: result.child.photo_count } : item) } : null);
      setOrderError(''); setNotice('Fotografia a fost salvată.');
    } catch (error) { setOrderError(errorText(error)); }
  }

  const children = (data?.children || []).filter(child => `${child.last_name} ${child.first_name}`.toLocaleLowerCase('ro').includes(search.toLocaleLowerCase('ro')))
    .sort((a, b) => {
      const names = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'ro', { sensitivity: 'base' });
      if (sort === 'name-asc') return names;
      if (sort === 'name-desc') return -names;
      const time = Date.parse(a.created_at) - Date.parse(b.created_at);
      return (sort === 'newest' ? -time : time) || names;
    });
  const total = data?.children.reduce((sum, child) => sum + child.total_lei, 0) || 0;

  return <>
    <nav className="crm-breadcrumb" aria-label="Navigare"><Link href="/crm">Clasele tale</Link><span>/</span><span>{data?.class.name || 'Clasă'}</span></nav>
    {error ? <div className="crm-empty"><p className="crm-error" role="alert">{error}</p><button className="crm-button" onClick={() => setAttempt(attempt + 1)}>Reîncearcă</button></div> : !data ? <p className="crm-empty" role="status">Se încarcă clasa…</p> : <>
      <div className="crm-page-heading"><div><p className="crm-eyebrow">{data.class.school_name}</p><h1>{data.class.name}</h1><p className="crm-muted">{data.class.session_label}{data.class.teacher_name ? ` · ${data.class.teacher_name}` : ''}</p>{data.class.shoot_display && <p className="crm-help">{data.class.shoot_display}</p>}</div>
        <button className="crm-button crm-primary" onClick={() => setAdding(!adding)} aria-expanded={adding}>{adding ? 'Ascunde formularul' : 'Adaugă un copil'}</button></div>

      <section className="crm-pricing" aria-label="Pachete și prețuri">
        <div className="crm-main-prices">{CRM_PACKAGES.slice(0, 2).map(item => <div className="crm-price-card" key={item.key}>
          <span className="crm-package-letter">{item.letter}</span><div><h2>Pachet {item.name}</h2><p>{item.description}</p><span className="crm-digital">+ format digital inclus</span></div>
          <div className="crm-price"><del>{data.class.prices[item.key === 'package_a' ? 'list_a' : 'list_b']} lei</del><strong>{data.class.prices[item.priceKey]} lei</strong></div>
        </div>)}</div>
        <p className="crm-help">Fiecare copil primește fie pachetul A, fie pachetul B. Extra C, D și E se pot bifa în plus, oricâte.</p>
        <div className="crm-addon-prices">{CRM_PACKAGES.slice(2).map(item => <div className="crm-price-card" key={item.key}><span className="crm-package-letter">{item.letter}</span><span>{item.description}</span><strong>{data.class.prices[item.priceKey]} lei</strong></div>)}</div>
      </section>

      {adding && <section className="crm-card crm-add-child" aria-labelledby="new-child-title"><h2 id="new-child-title">Adaugă copil în {data.class.name}</h2><ChildForm key={newChildVersion} path={`${classPath(id)}children/`} prices={data.class.prices} onCancel={() => setAdding(false)} onSaved={child => {
        setData(current => current ? { ...current, children: [...current.children, child] } : null);
        setNewChildVersion(version => version + 1); setNotice(`${child.first_name} ${child.last_name} a fost adăugat.`);
      }} /></section>}
      {notice && <p className="crm-success" role="status">{notice}</p>}
      {orderError && <p className="crm-error crm-roster-error" role="alert">{orderError}</p>}
      <div className="crm-toolbar"><h2>Lista clasei <span className="crm-count">{data.children.length} copii</span></h2><div className="crm-list-controls">
        <label className="crm-search"><span className="crm-sr-only">Caută un copil</span><input type="search" placeholder="Caută după nume…" value={search} disabled={uploadPending} onChange={event => setSearch(event.target.value)} /></label>
        <label className="crm-sort"><span className="crm-sr-only">Sortează copiii</span><select aria-label="Sortează copiii" value={sort} onChange={event => changeSort(event.target.value as Sort)}>{Object.entries(SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div></div>

      {children.length === 0 ? <div className="crm-empty"><h2>{search ? 'Niciun rezultat' : 'Începe cu primul copil'}</h2><p>{search ? 'Încearcă un alt nume.' : 'Adaugă numele copilului, pachetul dorit și portretul.'}</p></div>
        : <div className="crm-roster"><table className="crm-order-table" aria-label="Copii, pachete și fotografii"><thead><tr><th scope="col">#</th><th scope="col">Copil</th>
          {CRM_PACKAGES.map(item => <th scope="col" key={item.key}><span>{item.letter}</span><small>{item.name}</small></th>)}<th scope="col">Total</th><th scope="col">Fotografie</th>
        </tr></thead><tbody>{children.map((child, index) => <Fragment key={child.id}>
          <tr className="crm-child-row crm-order-row"><td className="crm-row-number">{index + 1}</td><td className="crm-order-child">
            <Link href={`/crm/classes/${id}/children/${child.id}`} className="crm-child-link" onClick={event => { if (uploadPending) { event.preventDefault(); setOrderError('Finalizează încărcarea sau elimină selecția înainte de a deschide altă pagină.'); } }}>
              <div className="crm-avatar">{child.reference_url ? <img src={child.reference_url} alt="" loading="lazy" /> : <span>{child.first_name[0]}{child.last_name[0]}</span>}</div>
              <div className="crm-child-name"><h3>{child.last_name} {child.first_name}</h3><p>{child.photo_count} fotografii · {child.reference_url ? 'Portret adăugat' : 'Fără portret'}</p>
                {(sort === 'newest' || sort === 'oldest') && <time dateTime={child.created_at}>Adăugat {addedFormat.format(new Date(child.created_at))}</time>}</div>
            </Link>
          </td>{CRM_PACKAGES.map(item => <td className="crm-package-cell" key={item.key}><label className="crm-package-toggle"><span className="crm-mobile-label">{item.letter}<small>{item.name}</small></span>
            <input type="checkbox" className="crm-order-check" checked={child[item.key]} disabled={!!savingChild || uploadPending} onChange={() => togglePackage(child, item.key)} aria-label={`${item.letter} ${item.name} pentru ${child.last_name} ${child.first_name}`} /></label></td>)}
          <td className="crm-child-total"><span className="crm-mobile-label">Total</span><strong>{child.total_lei} lei</strong><span className="crm-saving" role="status">{savingChild === child.id ? 'Se salvează…' : ''}</span></td>
          <td className="crm-photo-action"><button type="button" className="crm-button crm-small" disabled={uploadPending} aria-expanded={quickChild === child.id} aria-controls={quickChild === child.id ? `quick-photo-${child.id}` : undefined} onClick={() => setQuickChild(quickChild === child.id ? null : child.id)}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M8 5l1.5-2h5L16 5h4v15H4V5z"/><circle cx="12" cy="12" r="4"/></svg>Adaugă foto</button></td></tr>
          {quickChild === child.id && <tr className="crm-quick-photo-row"><td colSpan={9}><QuickPhotoUpload classId={id} child={child} onPendingChange={setUploadPending} onClose={() => setQuickChild(null)} onUploaded={() => { void refreshPhoto(child.id); }} /></td></tr>}
        </Fragment>)}</tbody><tfoot><tr><th scope="row" colSpan={2}>{data.children.length} copii</th>{CRM_PACKAGES.map(item => <td key={item.key}><span className="crm-mobile-label">{item.letter}</span>{data.children.filter(child => child[item.key]).length}</td>)}<td className="crm-class-total"><span className="crm-mobile-label">Total clasă</span>{total} lei</td><td className="crm-summary-spacer" /></tr></tfoot></table></div>}
    </>}
  </>;
}
