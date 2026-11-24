'use client';

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { crmApi, CrmError, errorText } from '@/lib/crm-api';
import { useCrmPendingWork } from './CrmProvider';

type Upload = { key: string; file: File; state: 'waiting' | 'uploading' | 'done' | 'error'; error?: string };
export type PhotoPickerHandle = { chooseFile: () => void; openCamera: () => void };

export default function PhotoUploader({ path, reference = false, onUploaded, onPendingChange, pickerRef }: {
  path: string; reference?: boolean; onUploaded: () => void; onPendingChange?: (pending: boolean) => void; pickerRef?: Ref<PhotoPickerHandle>;
}) {
  const [files, setFiles] = useState<Upload[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const running = useRef(false);
  const paused = useRef(false);
  const pending = files.some(file => file.state !== 'done');
  const done = files.filter(file => file.state === 'done').length;
  useCrmPendingWork(pending, 'Salvează fotografiile sau elimină selecția înainte de a părăsi pagina.');
  useImperativeHandle(pickerRef, () => ({
    chooseFile: () => { if (!busy && !pending) input.current?.click(); },
    openCamera: () => { if (!busy && !pending) camera.current?.click(); },
  }), [busy, pending]);

  useEffect(() => { onPendingChange?.(pending); }, [pending, onPendingChange]);

  const previewFile = reference ? files[0]?.file : undefined;
  useEffect(() => {
    if (!previewFile) { setPreview(''); return; }
    const url = URL.createObjectURL(previewFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [previewFile]);

  function select(selected: FileList | null) {
    if (!selected?.length) return;
    const next = Array.from(selected).map(file => ({ key: crypto.randomUUID(), file, state: 'waiting' as const }));
    if (input.current) input.current.value = '';
    if (camera.current) camera.current.value = '';
    const oversized = next.find(item => item.file.size > 64 * 1024 * 1024);
    if (oversized) { setNotice(`${oversized.file.name}: limita este de 64 MB pentru o fotografie.`); return; }
    setNotice(''); setFiles(reference ? next.slice(0, 1) : next);
  }

  async function upload() {
    if (running.current) return;
    running.current = true; paused.current = false; setBusy(true); setNotice('');
    let saved = false;
    for (const item of files.filter(file => file.state !== 'done')) {
      if (paused.current) break;
      setFiles(current => current.map(file => file.key === item.key ? { ...file, state: 'uploading', error: undefined } : file));
      const body = new FormData(); body.set('key', item.key); body.set('image', item.file);
      try {
        await crmApi(path, { method: 'POST', body });
        saved = true;
        setFiles(current => current.map(file => file.key === item.key ? { ...file, state: 'done' } : file));
      } catch (error) {
        setFiles(current => current.map(file => file.key === item.key ? { ...file, state: 'error', error: errorText(error) } : file));
        if (error instanceof CrmError && [0, 401, 403, 404].includes(error.status)) break;
      }
    }
    running.current = false; setBusy(false);
    if (saved) onUploaded();
  }

  return <div className="crm-uploader">
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple={!reference} className="crm-file-input" aria-label={reference ? 'Alege portretul' : 'Alege fotografiile'} onChange={event => select(event.target.files)} disabled={busy} />
    <input ref={camera} type="file" accept="image/*" capture="environment" className="crm-file-input" aria-label="Fotografiază copilul" onChange={event => select(event.target.files)} disabled={busy} />
    <div className="crm-actions"><button type="button" className="crm-button" disabled={busy || pending} onClick={() => input.current?.click()}>{reference ? 'Alege un portret' : 'Alege fotografii'}</button>
      <button type="button" className="crm-button" disabled={busy || pending} onClick={() => camera.current?.click()}>Deschide camera</button></div>
    <p className="crm-help">JPEG, PNG sau WebP · maximum 64 MB / fotografie</p>
    {notice && <p className="crm-error" role="alert">{notice}</p>}
    {files.length > 0 && <div className="crm-upload-queue" aria-live="polite">
      {preview && <img className="crm-upload-preview" src={preview} alt="Previzualizarea portretului selectat" />}
      <p>{done} din {files.length} {reference ? 'portret salvat' : 'fotografii salvate'}</p>
      <progress value={done} max={files.length} aria-label="Fotografii salvate" />
      <ul>{files.map(item => <li key={item.key}><span className="crm-filename">{item.file.name}</span><span className={`crm-upload-status crm-upload-${item.state}`}>
        {item.state === 'done' ? 'Salvat' : item.state === 'uploading' ? 'Se salvează…' : item.state === 'error' ? 'Eroare' : 'În așteptare'}</span>
        {item.error && <p className="crm-error">{item.error}</p>}</li>)}</ul>
      <div className="crm-actions">
        {pending && <button type="button" className="crm-button crm-primary" disabled={busy} onClick={upload}>{busy ? 'Se încarcă…' : files.some(file => file.state === 'error') ? 'Reîncearcă fișierele nesalvate' : 'Salvează fotografiile'}</button>}
        {busy ? <button type="button" className="crm-button" onClick={() => { paused.current = true; setNotice('Încărcarea se oprește după fotografia curentă.'); }}>Pauză după fotografia curentă</button>
          : <button type="button" className="crm-button" onClick={() => { setFiles([]); setNotice(''); }}>{pending ? 'Elimină selecția rămasă' : 'Gata'}</button>}
      </div>
      {pending && <p className="crm-help">Păstrează pagina deschisă până se termină încărcarea.</p>}
    </div>}
  </div>;
}
