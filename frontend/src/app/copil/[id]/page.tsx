'use client';

import { use, useCallback, useState } from 'react';
import PinGate from '@/components/PinGate';
import Lightbox from '@/components/Lightbox';
import { downloadChildAlbum, fetchChildAlbum, verifyChildPin, type ChildAlbum } from '@/lib/api';

export default function ChildAlbumPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const storageKey = `child_pin_${id}`;

    const [pin, setPin] = useState('');
    const [album, setAlbum] = useState<ChildAlbum | null>(null);
    const [error, setError] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const load = useCallback(async (p: string) => {
        try {
            setAlbum(await fetchChildAlbum(id, p));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Eroare la încărcarea albumului');
        }
    }, [id]);

    const onUnlocked = (p: string) => {
        setPin(p);
        load(p);
    };

    const handleDownload = async () => {
        if (!album) return;
        setDownloading(true);
        setError('');
        try {
            await downloadChildAlbum(id, pin, `album_${album.last_name}_${album.first_name}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Eroare la descărcare');
        } finally {
            setDownloading(false);
        }
    };

    const lightboxImages = album ? album.photos.map((p) => ({ id: p.id, image: p.web || p.image })) : [];

    return (
        <PinGate
            storageKey={storageKey}
            verify={(p) => verifyChildPin(id, p)}
            onUnlocked={onUnlocked}
            eyebrow="Album Protejat"
            title="Albumul copilului"
            hint="Introduceți PIN-ul de pe cardul primit pentru a vedea și descărca fotografiile."
        >
            <div className="min-h-screen bg-[var(--background)]">
                <section className="pt-36 pb-12 px-6 lg:px-12">
                    <div className="max-w-7xl mx-auto">
                        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-black/30 mb-4">
                            {album ? `${album.school_name} · ${album.class_name}` : 'Album'}
                        </p>
                        <h1 className="text-3xl md:text-4xl font-semibold text-black mb-4 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                            {album ? album.full_name : 'Se încarcă...'}
                        </h1>
                        <div className="luxury-line mb-6" />
                        {album && (
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <p className="text-sm text-black/40">
                                    {album.photos.length} Fotografii
                                    {album.packages !== '-' && <span className="ml-3 text-black/30">· Pachet {album.packages}</span>}
                                </p>
                                {album.photos.length > 0 && (
                                    <button
                                        onClick={handleDownload}
                                        disabled={downloading}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-white text-sm font-medium tracking-[0.03em] rounded-full hover:bg-[#333] transition-all duration-500 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {downloading ? 'Se descarcă...' : 'Descarcă toate pozele'}
                                    </button>
                                )}
                            </div>
                        )}
                        {error && (
                            <div className="mt-4 text-sm text-red-500/80 bg-red-50 py-3 px-4 rounded-[var(--radius-sm)] border border-red-100">{error}</div>
                        )}
                    </div>
                </section>

                {album && (
                    <section className="py-8 px-4 md:px-8 lg:px-12">
                        <div className="max-w-7xl mx-auto">
                            {album.photos.length > 0 ? (
                                <div className="columns-2 md:columns-3 xl:columns-4 gap-3 md:gap-5">
                                    {album.photos.map((photo, index) => {
                                        const ratio = photo.width && photo.height ? photo.width / photo.height : 3 / 4;
                                        return (
                                            <div
                                                key={photo.id}
                                                className="break-inside-avoid mb-3 md:mb-5 group cursor-pointer relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--muted)] photo-card"
                                                onClick={() => { setLightboxIndex(index); setLightboxOpen(true); }}
                                                style={{ animation: `fadeInUp 0.8s var(--ease-luxury) ${(index % 6) * 0.06}s both` }}
                                            >
                                                <div className="relative w-full" style={{ aspectRatio: `${ratio}` }}>
                                                    <img
                                                        src={photo.thumb || photo.web || photo.image}
                                                        alt={`Fotografie ${index + 1} - ${album.full_name}`}
                                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-[var(--ease-luxury)] group-hover:scale-[1.06]"
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-32">
                                    <p className="text-black/40 text-base">Fotografiile vor apărea aici după ce sunt procesate.</p>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {lightboxOpen && album && (
                    <Lightbox
                        images={lightboxImages}
                        currentIndex={lightboxIndex}
                        onClose={() => setLightboxOpen(false)}
                        onNavigate={setLightboxIndex}
                    />
                )}
            </div>
        </PinGate>
    );
}
