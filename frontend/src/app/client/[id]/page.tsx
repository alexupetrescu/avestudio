'use client';

import { useEffect, useState, use } from 'react';
import { fetchAlbum, verifyPin, downloadAlbum } from '@/lib/api';
import Lightbox from '@/components/Lightbox';
import ProgressBar from '@/components/ProgressBar';

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
            <>
                <ProgressBar isLoading={loading} className="fixed top-0 left-0 right-0 z-50" />
                <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                    <div className="flex gap-1.5">
                        <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-[softPulse_1.4s_ease-in-out_infinite]" />
                        <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-[softPulse_1.4s_ease-in-out_0.2s_infinite]" />
                        <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-[softPulse_1.4s_ease-in-out_0.4s_infinite]" />
                    </div>
                </div>
            </>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6 py-32">
                <div className="w-full max-w-md text-center animate-fade-in-up" style={{ animationFillMode: 'both' }}>
                    <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-black/30 mb-4">Album Protejat</p>
                    <h2
                        className="text-3xl md:text-4xl font-semibold text-black mb-4 tracking-tight"
                        style={{ fontFamily: 'var(--font-heading)' }}
                    >
                        Acces Album
                    </h2>
                    <div className="luxury-line mx-auto mb-6" />
                    <p className="text-sm text-black/40 mb-10">Introduceți PIN-ul pentru a vizualiza acest album.</p>

                    <div className="w-full p-8 md:p-10 bg-white rounded-[var(--radius-xl)] shadow-[var(--card-shadow-lg)]">
                        <form onSubmit={handlePinSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="pin" className="block text-sm font-medium text-black/40 mb-3">
                                    PIN de 4 cifre
                                </label>
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    id="pin"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    maxLength={4}
                                    className="w-full px-6 py-5 bg-[var(--muted)] border border-black/[0.06] text-black text-center text-3xl tracking-[0.5em] rounded-[var(--radius-md)] focus:outline-none focus:border-black/20 transition-colors duration-500 font-medium"
                                    placeholder="0000"
                                    required
                                />
                            </div>
                            {error && (
                                <div className="text-red-500/80 text-sm text-center bg-red-50 py-3 rounded-[var(--radius-sm)] border border-red-100">
                                    {error}
                                </div>
                            )}
                            <button
                                type="submit"
                                className="w-full py-4 bg-[var(--accent)] text-white text-sm font-medium tracking-[0.03em] rounded-full hover:bg-[#333] transition-all duration-500"
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
            <>
                <ProgressBar isLoading={true} className="fixed top-0 left-0 right-0 z-50" />
                <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                    <p className="text-sm text-black/40">Se încarcă albumul...</p>
                </div>
            </>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <section className="pt-36 pb-12 px-6 lg:px-12">
                <div className="max-w-7xl mx-auto">
                    <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-black/30 mb-4">Album Client</p>
                    <h1 className="text-3xl md:text-4xl font-semibold text-black mb-4 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                        {album.title}
                    </h1>
                    <div className="luxury-line mb-6" />
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <p className="text-sm text-black/40">{album.images.length} Fotografii</p>
                        {album.images.length > 0 && (
                            <button
                                onClick={handleDownloadAll}
                                disabled={downloading}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-white text-sm font-medium tracking-[0.03em] rounded-full hover:bg-[#333] transition-all duration-500 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {downloading ? 'Se descarcă...' : 'Descarcă toate pozele'}
                            </button>
                        )}
                    </div>
                    {error && (
                        <div className="mt-4 text-sm text-red-500/80 bg-red-50 py-3 px-4 rounded-[var(--radius-sm)] border border-red-100">
                            {error}
                        </div>
                    )}
                </div>
            </section>

            <section className="py-8 px-4 md:px-8 lg:px-12">
                <div className="max-w-7xl mx-auto">
                    {album.images.length > 0 ? (
                        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 md:gap-5">
                            {album.images.map((img, index) => {
                                const heights = [320, 420, 360, 480, 400, 340, 380, 440];
                                const imageHeight = heights[index % heights.length];
                                const staggerDelay = (index % 6) * 0.08;

                                return (
                                    <div
                                        key={img.id}
                                        className="break-inside-avoid mb-4 md:mb-5 group cursor-pointer relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--muted)] photo-card"
                                        onClick={() => openLightbox(index)}
                                        style={{ animation: `fadeInUp 0.8s var(--ease-luxury) ${staggerDelay}s both` }}
                                    >
                                        <div className="relative w-full" style={{ height: `${imageHeight}px` }}>
                                            <img
                                                src={img.image}
                                                alt={`Fotografie din ${album.title}`}
                                                className="w-full h-full object-cover transition-transform duration-1000 ease-[var(--ease-luxury)] group-hover:scale-[1.06]"
                                                loading="lazy"
                                                decoding="async"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                            <div className="absolute inset-0 flex flex-col justify-end p-5">
                                                <div className="transform translate-y-3 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-[var(--ease-luxury)]">
                                                    <p className="text-white/80 text-sm font-light">Fotografie {index + 1}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-32">
                            <p className="text-black/40 text-base">Nu există încă imagini în acest album.</p>
                        </div>
                    )}
                </div>
            </section>

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
