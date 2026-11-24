'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { CrmUser } from '@/lib/crm-api';

export function useTeamSession() {
  const pathname = usePathname();
  const [user, setUser] = useState<CrmUser | null>(null);
  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    async function refresh() {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetch('/api/assistant/session/', { credentials: 'same-origin', cache: 'no-store', signal: request.signal });
        if (!response.ok) throw new Error('Session unavailable');
        const data = await response.json();
        if (active && !request.signal.aborted) setUser(data.user ?? null);
      } catch {
        if (active && !request.signal.aborted) setUser(null);
      }
    }
    function visible() { if (document.visibilityState === 'visible') void refresh(); }
    function expired() { controller?.abort(); setUser(null); }
    void refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    window.addEventListener('avestudio-session-changed', refresh);
    window.addEventListener('crm-session-expired', expired);
    document.addEventListener('visibilitychange', visible);
    return () => {
      active = false; controller?.abort();
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      window.removeEventListener('avestudio-session-changed', refresh);
      window.removeEventListener('crm-session-expired', expired);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [pathname]);
  return user;
}

export default function TeamBar({ user }: { user: CrmUser }) {
  return <><div className="team-bar-spacer" aria-hidden="true" /><nav className="team-bar" aria-label="Instrumentele echipei">
    <span className="team-bar-user" title={user.name}><span>Conectat: </span>{user.name}</span>
    <div className="team-bar-links">
      {user.can_admin && <a href="/admin/">Django Admin</a>}
      {user.can_crm && <Link href="/crm" prefetch={false}>CRM</Link>}
    </div>
  </nav></>;
}
