import type { ChildOrder, SchoolClassOrder, SessionPackageOffer } from './api';

export type CrmUser = { username: string; name: string; can_admin: boolean; can_crm: boolean };
export type CrmPrices = SchoolClassOrder['prices'];
export type CrmClass = {
  id: string; name: string; school_name: string; city: string; session_label: string;
  shoot_display: string; teacher_name: string; child_count: number; photo_count: number;
  prices: CrmPrices;
  offers: SessionPackageOffer[];
  created_at: string;
};
export type CrmChild = ChildOrder & {
  created_at: string | null;
  entry_index: number;
  photo_count: number; reference_url: string | null;
};
export type CrmPhotos = {
  photos: { id: number; filename: string; url: string }[];
  page: number; pages: number; count: number;
};

let csrfToken = '';

export class CrmError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function crmApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (options.method && options.method !== 'GET') headers.set('X-CSRFToken', csrfToken);
  let response: Response;
  try {
    response = await fetch(`/api/assistant/${path}`, { ...options, headers, credentials: 'same-origin', cache: 'no-store' });
  } catch {
    throw new CrmError('Conexiunea nu este disponibilă. Verifică internetul și reîncearcă.', 0);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && path !== 'login/') window.dispatchEvent(new Event('crm-session-expired'));
    throw new CrmError(data?.error || (response.status === 403
      ? 'Sesiunea de securitate a expirat. Reîncarcă pagina și încearcă din nou.'
      : 'Cererea nu a putut fi finalizată. Încearcă din nou.'), response.status);
  }
  if (data?.csrfToken) csrfToken = data.csrfToken;
  if (path === 'login/' || path === 'logout/') window.dispatchEvent(new Event('avestudio-session-changed'));
  return data as T;
}

export const classPath = (id: string) => `classes/${encodeURIComponent(id)}/`;
export const childPath = (classId: string, childId: string) => `${classPath(classId)}children/${encodeURIComponent(childId)}/`;
export const errorText = (error: unknown) => error instanceof Error ? error.message : 'A apărut o eroare. Încearcă din nou.';
