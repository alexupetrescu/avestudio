'use client';

import { useEffect, useState, use } from 'react';
import { fetchAlbum, verifyPin, downloadAlbum } from '@/lib/api';
import Lightbox from '@/components/Lightbox';

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
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [downloading, setDownloading] = useState(false);

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

    const handleDownloadAll = async () => {
        if (!album) return;
        
        const storedPin = localStorage.getItem(`album_pin_${id}`);
        if (!storedPin) {
            setError('PIN-ul nu este disponibil. Vă rugăm să reintroduceți PIN-ul.');
            return;
        }

        setDownloading(true);
        setError('');
        
        try {
            await downloadAlbum(id, storedPin);
        } catch (err: any) {
            setError(err.message || 'Eroare la descărcarea albumului');
        } finally {
            setDownloading(false);
        }
    };

    const openLightbox = (index: number) => {
        setLightboxIndex(index);
        setLightboxOpen(true);
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
                                    type="tel"
                                    inputMode="numeric"
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
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <p className="text-black/60 text-sm">{album.images.length} Fotografii</p>
                        {album.images.length > 0 && (
                            <button
                                onClick={handleDownloadAll}
                                disabled={downloading}
                                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {downloading ? 'Se descarcă...' : 'Descarcă toate pozele din album'}
                            </button>
                        )}
                    </div>
                    {error && (
                        <div className="mt-4 text-red-600 text-sm bg-red-50 py-3 px-4 border border-red-200 rounded">
                            {error}
                        </div>
                    )}
                </div>
            </section>

            {/* Images Masonry */}
            <section className="py-12 px-8 lg:px-16">
                <div className="max-w-7xl mx-auto">
                    {album.images.length > 0 ? (
                        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 md:gap-6">
                            {album.images.map((img, index) => {
                                // Generate varied heights for masonry effect
                                const heights = [300, 400, 350, 450, 380, 320, 360, 420];
                                const imageHeight = heights[index % heights.length];
                                const staggerDelay = (index % 6) * 0.1;
                                
                                return (
                                    <div
                                        key={img.id}
                                        className="break-inside-avoid mb-4 md:mb-6 group cursor-pointer relative overflow-hidden rounded-xl bg-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500"
                                        onClick={() => openLightbox(index)}
                                        style={{
                                            animation: `fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${staggerDelay}s both`
                                        }}
                                    >
                                        <div className="relative w-full" style={{ height: `${imageHeight}px` }}>
                                            <img
                                                src={img.image}
                                                alt={`Fotografie din ${album.title}`}
                                                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                                                loading="lazy"
                                                decoding="async"
                                            />
                                            
                                            {/* Gradient overlay on hover */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            
                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-500 flex flex-col justify-end p-4 md:p-6">
                                                <div className="transform translate-y-6 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out">
                                                    <p className="text-white/95 text-sm md:text-base drop-shadow-md">
                                                        Fotografie {index + 1}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {/* Subtle shine effect on hover */}
                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-32">
                            <p className="text-black/60 text-lg mb-2">Nu există încă imagini în acest album.</p>
                            <p className="text-black/40 text-sm">Verificați mai târziu pentru actualizări.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Lightbox */}
            {lightboxOpen && album && (
                <Lightbox
                    images={album.images}
                    currentIndex={lightboxIndex}
                    onClose={() => setLightboxOpen(false)}
                    onNavigate={setLightboxIndex}
                />
            )}
        </div>
    );
}
