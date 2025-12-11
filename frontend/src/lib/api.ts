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
        const error = await res.json();
        throw new Error(error.error || 'Failed to download album');
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