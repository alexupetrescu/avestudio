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
