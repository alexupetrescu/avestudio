'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';
import ChildForm from '@/components/crm/ChildForm';
import PhotoUploader from '@/components/crm/PhotoUploader';
import { childPath, crmApi, errorText, type CrmChild, type CrmPhotos, type CrmPrices } from '@/lib/crm-api';

export default function CrmChildPage({ params }: { params: Promise<{ id: string; childId: string }> }) {
  const { id, childId } = use(params);
  const [child, setChild] = useState<CrmChild | null>(null);
  const [prices, setPrices] = useState<CrmPrices | null>(null);
  const [photos, setPhotos] = useState<CrmPhotos | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');
  const path = childPath(id, childId);
  const loadChild = useCallback(async () => {
    try { const result = await crmApi<{ child: CrmChild; prices: CrmPrices }>(path); setChild(result.child); setPrices(result.prices); setError(''); }
    catch (error) { setError(errorText(error)); }
  }, [path]);
  const loadPhotos = useCallback(async () => {
    try { setPhotos(await crmApi<CrmPhotos>(`${path}photos/?page=${page}`)); setPhotoError(''); }
    catch (error) { setPhotoError(errorText(error)); }
  }, [path, page]);
  useEffect(() => { void loadChild(); }, [loadChild]);
  useEffect(() => { setPhotos(null); void loadPhotos(); }, [loadPhotos]);
  function refresh() { void loadChild(); if (page === 1) void loadPhotos(); else setPage(1); }

  return <>
    <nav className="crm-breadcrumb" aria-label="Navigare"><Link href="/crm">Clase</Link><span>/</span><Link href={`/crm/classes/${id}`}>Lista copiilor</Link><span>/</span><span>{child?.first_name || 'Copil'}</span></nav>
    {error ? <div className="crm-empty"><p className="crm-error" role="alert">{error}</p><button className="crm-button" onClick={loadChild}>Reîncearcă</button></div> : !child ? <p className="crm-empty" role="status">Se încarcă datele copilului…</p> : <>
      <div className="crm-page-heading"><div><p className="crm-eyebrow">FIȘA COPILULUI</p><h1>{child.first_name} {child.last_name}</h1><p className="crm-muted">{child.photo_count} fotografii în album</p></div><button className="crm-button" onClick={() => setEditing(!editing)} aria-expanded={editing}>Editează datele</button></div>
      {editing && prices && <section className="crm-card crm-add-child"><h2>Datele și pachetele copilului</h2><ChildForm path={path} child={child} prices={prices} onCancel={() => setEditing(false)} onSaved={saved => { setChild(saved); setEditing(false); setNotice('Datele au fost salvate.'); }} /></section>}
      {notice && <p className="crm-success" role="status">{notice}</p>}
      {child.notes && <p className="crm-note"><strong>Observații:</strong> {child.notes}</p>}
      <div className="crm-child-workspace"><section className="crm-card crm-portrait-card"><p className="crm-eyebrow">PENTRU RECUNOAȘTERE</p><h2>Portret de referință</h2>
        <div className="crm-portrait">{child.reference_url ? <img src={child.reference_url} alt={`Portret ${child.first_name} ${child.last_name}`} /> : <div><span aria-hidden="true">◎</span><p>Adaugă un portret clar</p></div>}</div>
        <p className="crm-muted">Un singur copil, cu fața vizibilă. Portretul este folosit la potrivirea fotografiilor clasei.</p>
        <PhotoUploader path={`${path}reference/`} reference onUploaded={() => { void loadChild(); setNotice('Portretul de referință a fost salvat.'); }} />
      </section>
      <section className="crm-card crm-album-card"><p className="crm-eyebrow">PENTRU ALBUMUL COPILULUI</p><h2>Fotografii în album</h2><p className="crm-muted">Fotografiile încărcate aici sunt adăugate direct în albumul acestui copil.</p>
        <PhotoUploader path={`${path}photos/`} onUploaded={refresh} />
        <div className="crm-photo-heading"><h3>Fotografii salvate</h3><span className="crm-count">{photos?.count ?? child.photo_count}</span></div>
        {photoError ? <div className="crm-empty"><p className="crm-error" role="alert">{photoError}</p><button className="crm-button" onClick={loadPhotos}>Reîncearcă</button></div> : !photos ? <p className="crm-empty" role="status">Se încarcă fotografiile…</p> : photos.count === 0 ? <div className="crm-photo-empty"><span aria-hidden="true">▧</span><p>Albumul așteaptă primele fotografii.</p></div>
          : <><div className="crm-photo-grid">{photos.photos.map(photo => <figure key={photo.id}><img src={photo.url} alt={photo.filename} loading="lazy" /><figcaption title={photo.filename}>{photo.filename}</figcaption></figure>)}</div>
            {photos.pages > 1 && <nav className="crm-pagination" aria-label="Pagini fotografii"><button className="crm-button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button><span>{photos.page} / {photos.pages}</span><button className="crm-button" disabled={page >= photos.pages} onClick={() => setPage(page + 1)}>Următor</button></nav>}</>}
      </section></div>
    </>}
  </>;
}
