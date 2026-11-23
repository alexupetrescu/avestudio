'use client';

import { useCallback, useState } from 'react';
import PhotoUploader from './PhotoUploader';
import { childPath, type CrmChild } from '@/lib/crm-api';

export default function QuickPhotoUpload({ classId, child, onUploaded, onPendingChange, onClose }: {
  classId: string; child: CrmChild; onUploaded: () => void;
  onPendingChange: (pending: boolean) => void; onClose: () => void;
}) {
  const [kind, setKind] = useState('reference');
  const [pending, setPending] = useState(false);
  const updatePending = useCallback((value: boolean) => { setPending(value); onPendingChange(value); }, [onPendingChange]);
  return <section id={`quick-photo-${child.id}`} className="crm-quick-photo" aria-label={`Fotografie pentru ${child.last_name} ${child.first_name}`}>
    <div className="crm-quick-heading"><h3>Adaugă foto · {child.last_name} {child.first_name}</h3><button type="button" className="crm-button crm-small" disabled={pending} onClick={onClose}>Închide</button></div>
    <label className="crm-photo-kind">Tip fotografie<select value={kind} disabled={pending} onChange={event => setKind(event.target.value)}>
      <option value="reference">Portret de referință</option><option value="photos">Fotografii în album</option>
    </select></label>
    <p className="crm-help">{kind === 'reference' ? 'Un portret clar pentru recunoaștere. Poți folosi camera telefonului.' : 'Aceste fotografii ajung direct în albumul copilului.'}</p>
    <PhotoUploader key={kind} path={`${childPath(classId, child.id)}${kind}/`} reference={kind === 'reference'} onUploaded={onUploaded} onPendingChange={updatePending} />
  </section>;
}
