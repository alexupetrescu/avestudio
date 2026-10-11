const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function fetchPortfolio(category?: string, page?: number) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (page) params.append('page', page.toString());
    
    const url = `${API_URL}/portfolio/${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch portfolio');
    return res.json();
}

export async function fetchCategories() {
    const res = await fetch(`${API_URL}/categories/`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
}

export async function verifyPin(pin: string, albumId?: string) {
    const res = await fetch(`${API_URL}/verify-pin/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, album_id: albumId }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to verify PIN');
    }
    return res.json();
}

export async function fetchAlbum(id: string) {
    const res = await fetch(`${API_URL}/albums/${id}/`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch album');
    return res.json();
}

export async function downloadAlbum(id: string, pin: string) {
    const res = await fetch(`${API_URL}/download-album/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album_id: id, pin }),
    });
    if (!res.ok) {
        // Try to parse as JSON, but handle HTML error pages
        let errorMessage = 'Failed to download album';
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                const error = await res.json();
                errorMessage = error.error || errorMessage;
            } catch (e) {
                // If JSON parsing fails, use default message
            }
        } else {
            // If it's an HTML error page (like 404), provide a more helpful message
            if (res.status === 404) {
                errorMessage = 'Download endpoint not found. Please contact support.';
            } else {
                errorMessage = `Server error (${res.status}). Please try again later.`;
            }
        }
        throw new Error(errorMessage);
    }
    
    // Extract filename from Content-Disposition header
    const contentDisposition = res.headers.get('Content-Disposition');
    let filename = `album_${id}.zip`; // fallback
    
    if (contentDisposition) {
        // Try multiple patterns to extract filename
        // Pattern 1: filename="value" (quoted)
        let match = contentDisposition.match(/filename="([^"]+)"/i);
        if (match && match[1]) {
            filename = match[1];
        } else {
            // Pattern 2: filename*=UTF-8''value (RFC 5987)
            match = contentDisposition.match(/filename\*=UTF-8''([^;\r\n]+)/i);
            if (match && match[1]) {
                filename = decodeURIComponent(match[1]);
            } else {
                // Pattern 3: filename=value (unquoted)
                match = contentDisposition.match(/filename=([^;\r\n"']+)/i);
                if (match && match[1]) {
                    filename = match[1].trim();
                }
            }
        }
    }
    
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}
// ---------------------------------------------------------------------------
// Schools app: teacher order list + child albums
// ---------------------------------------------------------------------------

async function parseError(res: Response, fallback: string): Promise<never> {
    let message = fallback;
    try {
        const data = await res.json();
        if (typeof data === 'string') message = data;
        else if (data.error) message = data.error;
        else if (data.detail) message = data.detail;
        else if (data.non_field_errors) message = data.non_field_errors.join(' ');
        else {
            const first = Object.values(data)[0];
            if (Array.isArray(first)) message = first.join(' ');
        }
    } catch {
        /* non-JSON body */
    }
    throw new Error(message);
}

export interface ChildOrder {
    id: string;
    first_name: string;
    last_name: string;
    package_a: boolean;
    package_b: boolean;
    package_c: boolean;
    package_d: boolean;
    package_e: boolean;
    notes: string;
    total_lei: number;
}

export interface SchoolClassOrder {
    id: string;
    name: string;
    teacher_name: string;
    school_name: string;
    is_returning: boolean;
    prices: { a: number; b: number; c: number; d: number; e: number; list_a: number; list_b: number };
    period: string;
    shoot_date: string | null;
    shoot_time: string | null;
    shoot_display: string;
    children: ChildOrder[];
}

/** URL of the class order list as PDF. inline=true opens it in the browser for printing. */
export function classListPdfUrl(classId: string, pin: string, inline: boolean): string {
    const params = new URLSearchParams({ pin });
    if (inline) params.set('inline', '1');
    return `${API_URL}/schools/class/${classId}/list.pdf?${params.toString()}`;
}

export async function verifyClassPin(classId: string, pin: string): Promise<boolean> {
    const res = await fetch(`${API_URL}/schools/class/${classId}/verify-pin/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
    });
    return res.ok;
}

export async function fetchSchoolClass(classId: string, pin: string): Promise<SchoolClassOrder> {
    const res = await fetch(`${API_URL}/schools/class/${classId}/?pin=${encodeURIComponent(pin)}`, { cache: 'no-store' });
    if (!res.ok) await parseError(res, 'Nu am putut încărca clasa');
    return res.json();
}

export async function addChild(classId: string, pin: string, data: Partial<ChildOrder>): Promise<ChildOrder> {
    const res = await fetch(`${API_URL}/schools/class/${classId}/children/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, pin }),
    });
    if (!res.ok) await parseError(res, 'Nu am putut adăuga copilul');
    return res.json();
}

export async function updateChild(classId: string, pin: string, childId: string, data: Partial<ChildOrder>): Promise<ChildOrder> {
    const res = await fetch(`${API_URL}/schools/class/${classId}/children/${childId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, pin }),
    });
    if (!res.ok) await parseError(res, 'Nu am putut salva modificarea');
    return res.json();
}

export async function deleteChild(classId: string, pin: string, childId: string): Promise<void> {
    const res = await fetch(`${API_URL}/schools/class/${classId}/children/${childId}/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
    });
    if (!res.ok) await parseError(res, 'Nu am putut șterge copilul');
}

export interface ChildPhoto {
    id: number;
    image: string;
    web: string | null;
    thumb: string | null;
    width: number;
    height: number;
}

export interface ChildAlbum {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    class_name: string;
    school_name: string;
    package_a: boolean;
    package_b: boolean;
    package_c: boolean;
    package_d: boolean;
    package_e: boolean;
    packages: string;
    photos: ChildPhoto[];
}

export async function verifyChildPin(childId: string, pin: string): Promise<boolean> {
    const res = await fetch(`${API_URL}/schools/child/verify-pin/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, pin }),
    });
    return res.ok;
}

export async function fetchChildAlbum(childId: string, pin: string): Promise<ChildAlbum> {
    const res = await fetch(`${API_URL}/schools/child/${childId}/?pin=${encodeURIComponent(pin)}`, { cache: 'no-store' });
    if (!res.ok) await parseError(res, 'Nu am putut încărca albumul');
    return res.json();
}

export async function downloadChildAlbum(childId: string, pin: string, fallbackName: string) {
    const res = await fetch(`${API_URL}/schools/child/download/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, pin }),
    });
    if (!res.ok) await parseError(res, 'Eroare la descărcarea albumului');

    let filename = `${fallbackName}.zip`;
    const disposition = res.headers.get('Content-Disposition') || '';
    const utf8 = disposition.match(/filename\*=UTF-8''([^;\r\n]+)/i);
    const plain = disposition.match(/filename="([^"]+)"/i);
    if (utf8 && utf8[1]) filename = decodeURIComponent(utf8[1]);
    else if (plain && plain[1]) filename = plain[1];

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}
