'use client';

import Link from 'next/link';
import { Fragment, use, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import ChildForm from '@/components/crm/ChildForm';
import QuickPhotoUpload from '@/components/crm/QuickPhotoUpload';
import { type PhotoPickerHandle } from '@/components/crm/PhotoUploader';
import CrmSortSelect, { useCrmSort } from '@/components/crm/CrmSortSelect';
import useCrmOrders from '@/components/crm/useCrmOrders';
import { childPath, classPath, crmApi, errorText, type CrmChild, type CrmClass } from '@/lib/crm-api';
import { formatMoney, hasBasePackage } from '@/lib/crm-packages';
import { addedAtLabel, compareCrmItems, matchesCrmSearch } from '@/lib/crm-list';

export default function CrmClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{ class: CrmClass; children: CrmChild[] } | null>(null);
  const [error, setError] = useState('');
  const [orderError, setOrderError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useCrmSort('crm-roster-sort', 'oldest');
  const [adding, setAdding] = useState(false);
  const [newChildVersion, setNewChildVersion] = useState(0);
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [quickChild, setQuickChild] = useState<string | null>(null);
  const [uploadPending, setUploadPending] = useState(false);
  const photoPicker = useRef<PhotoPickerHandle>(null);
  const offers = data?.class.offers ?? [];
  const orders = useCrmOrders(id, data?.class.offers, (childId, packages, total) => {
    setData(current => current ? { ...current, children: current.children.map(child => child.id === childId ? { ...child, ...packages, total_lei: total } : child) } : null);
  });

  useEffect(() => {
    let active = true;
    crmApi<{ class: CrmClass; children: CrmChild[] }>(classPath(id))
      .then(result => { if (active) { setData(result); setError(''); } })
      .catch(error => { if (active) setError(errorText(error)); });
    return () => { active = false; };
  }, [id, attempt]);

  function openPhoto(childId: string, camera = false) {
    if (uploadPending) return;
    flushSync(() => setQuickChild(childId));
    if (camera) photoPicker.current?.openCamera(); else photoPicker.current?.chooseFile();
  }
  async function refreshPhoto(childId: string) {
    try {
      const result = await crmApi<{ child: CrmChild }>(childPath(id, childId));
      setData(current => current ? { ...current, children: current.children.map(item => item.id === childId
        ? { ...item, reference_url: result.child.reference_url, photo_count: result.child.photo_count } : item) } : null);
      setOrderError(''); setNotice('Fotografia a fost salvată.');
    } catch (error) { setOrderError(errorText(error)); }
  }

  const children = (data?.children || []).filter(child => matchesCrmSearch(`${child.last_name} ${child.first_name}`, search))
    .sort((a, b) => compareCrmItems({ ...a, name: `${a.last_name} ${a.first_name}` }, { ...b, name: `${b.last_name} ${b.first_name}` }, sort));
  const total = (data?.children.reduce((sum, child) => sum + Math.round(child.total_lei * 100), 0) || 0) / 100;

  return <>
    <nav className="crm-breadcrumb" aria-label="Navigare"><Link href="/crm">Clasele tale</Link><span>/</span><span>{data?.class.name || 'Clasă'}</span></nav>
    {error ? <div className="crm-empty"><p className="crm-error" role="alert">{error}</p><button className="crm-button" onClick={() => setAttempt(attempt + 1)}>Reîncearcă</button></div> : !data ? <p className="crm-empty" role="status">Se încarcă clasa…</p> : <>
      <div className="crm-page-heading"><div><p className="crm-eyebrow">{data.class.school_name}</p><h1>{data.class.name}</h1><p className="crm-muted">{data.class.session_label}{data.class.teacher_name ? ` · ${data.class.teacher_name}` : ''}</p>{data.class.shoot_display && <p className="crm-help">{data.class.shoot_display}</p>}</div>
        <button className="crm-button crm-primary" onClick={() => setAdding(!adding)} aria-expanded={adding}>{adding ? 'Ascunde formularul' : 'Adaugă un copil'}</button></div>

      <details className="crm-pricing-disclosure"><summary>Pachete și prețuri <span>{offers.filter(item => item.available).length} opțiuni pentru această ședință</span></summary><section className="crm-pricing" aria-label="Pachete și prețuri">
        <div className="crm-main-prices">{offers.filter(item => item.kind === 'base').map(item => <div className="crm-price-card" key={item.id}>
          <span className="crm-package-letter">{item.code}</span>{item.image && <img className="crm-package-image" src={item.image} alt="" />}<div><h2>{item.name}</h2><p>{item.description}</p>{item.digital_included && <span className="crm-digital">+ format digital inclus</span>}{!item.available && <p>Indisponibil pentru comenzi noi</p>}</div>
          <div className="crm-price">{item.list_price !== null && item.list_price > item.price && <del>{formatMoney(item.list_price)} lei</del>}<strong>{formatMoney(item.price)} lei</strong></div>
        </div>)}</div>
        <p className="crm-help">Alege un singur pachet de bază. Opționalele se pot adăuga în plus, oricâte.</p>
        <div className="crm-addon-prices">{offers.filter(item => item.kind === 'extra').map(item => <div className="crm-price-card" key={item.id}><span className="crm-package-letter">{item.code}</span><span>{item.name}{!item.available && ' · indisponibil'}</span><strong>{formatMoney(item.price)} lei</strong></div>)}</div>
      </section></details>

      {adding && <section className="crm-card crm-add-child" aria-labelledby="new-child-title"><h2 id="new-child-title">Adaugă copil în {data.class.name}</h2><ChildForm key={newChildVersion} path={`${classPath(id)}children/`} offers={offers} onCancel={() => setAdding(false)} onSaved={child => {
        setData(current => current ? { ...current, children: [...current.children, child] } : null);
        setNewChildVersion(version => version + 1); setNotice(`${child.first_name} ${child.last_name} a fost adăugat.`);
      }} /></section>}
      {notice && <p className="crm-success" role="status">{notice}</p>}
      {orderError && <p className="crm-error crm-roster-error" role="alert">{orderError}</p>}
      <div className="crm-toolbar"><h2>Lista clasei <span className="crm-count">{search ? `${children.length} din ${data.children.length}` : data.children.length} copii</span></h2><div className="crm-list-controls">
        <label className="crm-search"><span className="crm-sr-only">Caută un copil</span><input type="search" placeholder="Caută după nume…" value={search} disabled={uploadPending} onChange={event => setSearch(event.target.value)} /></label>
        <CrmSortSelect sort={sort} onChange={setSort} label="Sortează copiii" />
      </div></div>

      {children.length === 0 ? <div className="crm-empty"><h2>{search ? 'Niciun rezultat' : 'Începe cu primul copil'}</h2><p>{search ? 'Încearcă un alt nume.' : 'Adaugă numele copilului, pachetul dorit și portretul.'}</p></div>
        : <div className="crm-roster"><table className="crm-order-table" aria-label="Copii, pachete și fotografii"><thead><tr><th scope="col">#</th><th scope="col">Copil</th>
          {offers.map(item => <th scope="col" key={item.id}><span>{item.code}</span><small>{item.name}</small></th>)}<th scope="col">Total</th><th scope="col">Fotografie</th>
        </tr></thead><tbody>{children.map((child, index) => <Fragment key={child.id}>
          <tr className="crm-child-row crm-order-row"><td className="crm-row-number">{index + 1}</td><td className="crm-order-child">
            <Link href={`/crm/classes/${id}/children/${child.id}`} className="crm-child-link" onClick={event => { if (uploadPending) { event.preventDefault(); setOrderError('Finalizează încărcarea sau elimină selecția înainte de a deschide altă pagină.'); } }}>
              <div className="crm-avatar">{child.reference_url ? <img src={child.reference_url} alt="" loading="lazy" /> : <span>{child.first_name[0]}{child.last_name[0]}</span>}</div>
              <div className="crm-child-name"><h3>{child.last_name} {child.first_name}</h3><p>{child.photo_count} {child.photo_count === 1 ? 'fotografie' : 'fotografii'} · {child.reference_url ? 'Portret adăugat' : 'Fără portret'}</p>
                <p className="crm-entry-meta">Adăugare #{child.entry_index} · <time dateTime={child.created_at || undefined}>{addedAtLabel(child.created_at)}</time></p>
                {!hasBasePackage(child, offers) && <span className="crm-missing-package">Alege un pachet de bază</span>}</div>
            </Link>
            {orders.errors[child.id] && <div className="crm-order-error" role="alert"><p>{orders.errors[child.id]}</p><button type="button" className="crm-button crm-small" onClick={() => orders.retry(child.id)}>Reîncearcă salvarea</button></div>}
          </td>{offers.map(item => <td className="crm-package-cell" key={item.id}><label className="crm-package-toggle"><span className="crm-mobile-label">{item.code}<small>{item.name}</small></span>
            <input type={item.kind === 'base' ? 'radio' : 'checkbox'} name={item.kind === 'base' ? `base-${child.id}` : undefined} className="crm-order-check" checked={child.package_ids.includes(item.id)} disabled={(!item.available && !child.package_ids.includes(item.id)) || (item.kind === 'extra' && !hasBasePackage(child, offers))} onChange={() => orders.toggle(child, item.id)} aria-label={`${item.code} ${item.name} pentru ${child.last_name} ${child.first_name}`} /></label></td>)}
          <td className="crm-child-total"><span className="crm-mobile-label">Total</span><strong>{formatMoney(child.total_lei)} lei</strong><span className="crm-saving" role="status">{orders.saving[child.id] ? 'Se salvează…' : orders.errors[child.id] ? 'Nesalvat' : 'Salvat'}</span></td>
          <td className="crm-photo-action"><div className="crm-photo-buttons"><button type="button" className="crm-button crm-small" disabled={uploadPending} aria-expanded={quickChild === child.id} aria-controls={quickChild === child.id ? `quick-photo-${child.id}` : undefined} onClick={() => openPhoto(child.id)}>Adaugă foto</button>
            <button type="button" className="crm-button crm-small crm-camera-button" disabled={uploadPending} aria-label={`Deschide camera pentru ${child.last_name} ${child.first_name}`} title="Deschide camera" onClick={() => openPhoto(child.id, true)}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M8 5l1.5-2h5L16 5h4v15H4V5z"/><circle cx="12" cy="12" r="4"/></svg></button></div></td></tr>
          {quickChild === child.id && <tr className="crm-quick-photo-row"><td colSpan={offers.length + 4}><QuickPhotoUpload classId={id} child={child} pickerRef={photoPicker} onPendingChange={setUploadPending} onClose={() => setQuickChild(null)} onUploaded={() => { void refreshPhoto(child.id); }} /></td></tr>}
        </Fragment>)}</tbody><tfoot><tr><th scope="row" colSpan={2}>{data.children.length} copii</th>{offers.map(item => <td key={item.id}><span className="crm-mobile-label">{item.code}</span>{data.children.filter(child => child.package_ids.includes(item.id)).length}</td>)}<td className="crm-class-total"><span className="crm-mobile-label">Total clasă</span>{formatMoney(total)} lei</td><td className="crm-summary-spacer" /></tr></tfoot></table></div>}
    </>}
  </>;
}
