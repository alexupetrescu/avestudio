'use client';

import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useId, useState, type FormEvent } from 'react';
import { crmApi, errorText, type CrmUser } from '@/lib/crm-api';

const UserContext = createContext<CrmUser | null>(null);
export const useCrmUser = () => useContext(UserContext);
const WorkContext = createContext<{ register: (id: string, message: string | null) => void } | null>(null);

export function useCrmPendingWork(pending: boolean, message: string) {
  const id = useId();
  const register = useContext(WorkContext)?.register;
  useEffect(() => {
    register?.(id, pending ? message : null);
    return () => register?.(id, null);
  }, [id, pending, message, register]);
}

function Login({ onLogin, notice }: { onLogin: (user: CrmUser) => void; notice: string }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      // Refresh the CSRF token when another tab has signed in or out.
      await crmApi('session/');
      const data = await crmApi<{ user: CrmUser }>('login/', {
        method: 'POST', body: JSON.stringify({ username: form.get('username'), password: form.get('password') }),
      });
      onLogin(data.user);
    } catch (error) { setError(errorText(error)); }
    finally { setBusy(false); }
  }

  return <div className="crm-login">
    <div className="crm-login-intro">
      <Link href="/" className="crm-wordmark">AVE<span>STUDIO</span></Link>
      <div><p className="crm-eyebrow">SPAȚIUL ECHIPEI</p><h1>Mai mult timp<br />pentru zâmbete.</h1>
        <p>Clasele, copiii și fotografiile lor.<br />Totul la îndemână, oriunde ești.</p></div>
      <p className="crm-login-caption">Un loc pentru fiecare amintire.</p>
    </div>
    <div className="crm-login-form"><div className="crm-card">
      <p className="crm-eyebrow">AVE STUDIO · CRM</p><h2>Bine ai revenit</h2>
      <p className="crm-muted">Autentifică-te pentru a deschide clasele tale.</p>
      {notice && <p className="crm-notice" role="status">{notice}</p>}
      <form onSubmit={submit} className="crm-form">
        <label>Utilizator<input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={150} autoFocus /></label>
        <label>Parolă<span className="crm-password"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required maxLength={1024} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} aria-pressed={showPassword}>{showPassword ? 'Ascunde' : 'Arată'}</button></span></label>
        {error && <p className="crm-error" role="alert">{error}</p>}
        <button className="crm-button crm-primary" disabled={busy}>{busy ? 'Se verifică…' : 'Intră în cont'}</button>
      </form>
      <p className="crm-login-help">Ai nevoie de acces sau ai uitat parola? Contactează administratorul AVE Studio.</p>
    </div></div>
  </div>;
}

export function CrmProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CrmUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [pendingWork, setPendingWork] = useState<Record<string, string>>({});
  const [navigationNotice, setNavigationNotice] = useState('');
  const register = useCallback((id: string, message: string | null) => {
    setPendingWork(current => {
      if (message === (current[id] ?? null)) return current;
      const next = { ...current };
      if (message) next[id] = message; else delete next[id];
      return next;
    });
  }, []);
  const pendingMessages = Object.values(pendingWork);
  const pendingMessage = pendingMessages[0] || '';

  useEffect(() => {
    if (!pendingMessage) { setNavigationNotice(''); return; }
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const guard = (event: MouseEvent) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target instanceof Element ? event.target : null)?.closest('a');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href);
      if (url.pathname === location.pathname && url.search === location.search && url.origin === location.origin) return;
      event.preventDefault(); event.stopPropagation(); setNavigationNotice(pendingMessage);
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', guard, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', guard, true); };
  }, [pendingMessage]);

  async function loadSession() {
    setLoading(true); setError('');
    try { setUser((await crmApi<{ user: CrmUser | null }>('session/')).user); }
    catch (error) { setError(errorText(error)); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    void loadSession();
    const expired = () => { setUser(null); setNotice('Sesiunea a expirat. Autentifică-te din nou pentru a continua.'); };
    window.addEventListener('crm-session-expired', expired);
    return () => window.removeEventListener('crm-session-expired', expired);
  }, []);

  async function signOut() {
    if (pendingMessage) { setNavigationNotice(pendingMessage); return; }
    setSigningOut(true); setError('');
    try { await crmApi('logout/', { method: 'POST' }); setUser(null); setNotice('Te-ai deconectat.'); }
    catch (error) { setError(errorText(error)); }
    finally { setSigningOut(false); }
  }

  return <div className="crm">
    {loading ? <div className="crm-loading" role="status">Se deschide spațiul echipei…</div>
      : error && !user ? <div className="crm-loading"><p className="crm-error" role="alert">{error}</p><button className="crm-button" onClick={loadSession}>Reîncearcă</button></div>
      : !user ? <Login onLogin={setUser} notice={notice} />
      : <UserContext.Provider value={user}><WorkContext.Provider value={{ register }}>
        <header className="crm-header"><Link href="/crm" className="crm-wordmark">AVE<span>STUDIO / CRM</span></Link>
          <div className="crm-header-account"><span>{user.name}</span><button className="crm-button crm-small" onClick={signOut} disabled={signingOut || !!pendingMessage} title={pendingMessage || undefined}>{signingOut ? 'Se închide…' : 'Deconectare'}</button></div></header>
        {error && <p className="crm-error crm-global-error" role="alert">{error}</p>}
        {navigationNotice && <p className="crm-notice crm-global-error" role="status">{navigationNotice}</p>}
        <main className="crm-content">{children}</main>
        <footer className="crm-footer">AVE Studio <span>·</span> Spațiul echipei</footer>
      </WorkContext.Provider></UserContext.Provider>}
  </div>;
}
