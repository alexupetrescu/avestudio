'use client';

import { useEffect, useState, use } from 'react';
import { fetchAlbum, verifyPin } from '@/lib/api';

interface AlbumImage {
    id: number;
    image: string;
    created_at: string;
}

interface ClientAlbum {
    id: string;
    title: string;
    images: AlbumImage[];
}

export default function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [album, setAlbum] = useState<ClientAlbum | null>(null);
    const [loading, setLoading] = useState(true);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const storedPin = localStorage.getItem(`album_pin_${id}`);
        if (storedPin) {
            verifyPin(storedPin, id)
                .then((data) => {
                    if (data.valid && data.album_id === id) {
                        setIsAuthenticated(true);
                        loadAlbum();
                    } else {
                        localStorage.removeItem(`album_pin_${id}`);
                    }
                })
                .catch(() => {
                    localStorage.removeItem(`album_pin_${id}`);
                });
        }
        setLoading(false);
    }, [id]);

    const loadAlbum = async () => {
        try {
            const data = await fetchAlbum(id);
            setAlbum(data);
        } catch (err) {
            console.error(err);
            setError('Eroare la încărcarea albumului');
        }
    };

    const handlePinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const data = await verifyPin(pin, id);
            if (data.valid && data.album_id === id) {
                localStorage.setItem(`album_pin_${id}`, pin);
                setIsAuthenticated(true);
                loadAlbum();
            } else {
                setError('PIN invalid pentru acest album');
            }
        } catch (err: any) {
            setError(err.message || 'PIN invalid');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-black/60 text-lg">Se încarcă...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center px-8 py-32">
                <div className="w-full max-w-2xl">
                    <div className="text-center mb-16 animate-slide-up">
                        <span className="text-sm text-black/40 mb-6 block">Album Protejat</span>
                        <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 tracking-tight">
                            Acces Album
                        </h2>
                        <p className="text-black/60">Vă rugăm să introduceți PIN-ul pentru a vizualiza acest album.</p>
                    </div>
                    <div className="w-full max-w-md mx-auto p-12 bg-white border border-black/10 animate-fade-in">
                        <form onSubmit={handlePinSubmit} className="space-y-8">
                            <div>
                                <label htmlFor="pin" className="block text-sm font-medium text-black mb-4">
                                    Introduceți PIN-ul de 4 cifre
                                </label>
                                <input
                                    type="text"
                                    id="pin"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    maxLength={4}
                                    className="w-full px-6 py-4 bg-gray-50 border border-black/10 text-black text-center text-3xl tracking-[0.5em] focus:outline-none focus:border-black transition-colors duration-300 font-medium"
                                    placeholder="0000"
                                    required
                                />
                            </div>
                            {error && (
                                <div className="text-red-600 text-sm text-center bg-red-50 py-4 border border-red-200">
                                    {error}
                                </div>
                            )}
                            <button
                                type="submit"
                                className="w-full btn-primary"
                            >
                                Accesează Albumul
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    if (!album) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-black/60 text-lg">Se încarcă albumul...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <section className="pt-32 pb-16 px-8 lg:px-16 border-b border-black/5">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-5xl md:text-6xl font-bold text-black mb-4 tracking-tight">
                        {album.title}
                    </h1>
                    <p className="text-black/60 text-sm">{album.images.length} Fotografii</p>
                </div>
            </section>

            {/* Images Grid */}
            <section className="py-12 px-8 lg:px-16">
                <div className="max-w-7xl mx-auto">
                    {album.images.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {album.images.map((img) => (
                                <div key={img.id} className="group relative aspect-square overflow-hidden bg-gray-100 card-hover">
                                    <img
                                        src={img.image}
                                        alt={`Fotografie din ${album.title}`}
                                        className="w-full h-full object-cover image-zoom"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-32">
                            <p className="text-black/60 text-lg mb-2">Nu există încă imagini în acest album.</p>
                            <p className="text-black/40 text-sm">Verificați mai târziu pentru actualizări.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
