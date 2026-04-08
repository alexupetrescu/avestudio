'use client';

import { useEffect, useState, use } from 'react';
import Lightbox from '@/components/Lightbox';
import ProgressBar from '@/components/ProgressBar';

interface GoogleDriveImage {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    createdTime?: string;
    modifiedTime?: string;
    thumbnailLink?: string;
    downloadLink: string;
    directLink: string;
    proxyLink?: string;
    thumbnailProxyLink?: string;
}

interface GoogleDriveAlbum {
    id: string;
    title: string;
    folder_id: string;
    folder_link: string;
    created_at: string;
    images: GoogleDriveImage[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function fetchDriveAlbum(id: string): Promise<GoogleDriveAlbum> {
    const res = await fetch(`${API_URL}/drive-albums/${id}/`, { cache: 'no-store' });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to fetch album' }));
        throw new Error(error.error || 'Failed to fetch album');
    }
    return res.json();
}

export default function DriveAlbumPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [album, setAlbum] = useState<GoogleDriveAlbum | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    useEffect(() => {
        const loadAlbum = async () => {
            try {
                const data = await fetchDriveAlbum(id);
                setAlbum(data);
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Eroare la încărcarea albumului');
            } finally {
                setLoading(false);
            }
        };

        loadAlbum();
    }, [id]);

    const openLightbox = (index: number) => {
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    const lightboxImages = album?.images.map((img, index) => ({
        id: index,
        image: img.proxyLink || img.directLink,
    })) || [];

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

    if (error) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6 py-32">
                <div className="w-full max-w-md text-center">
                    <h2 className="text-2xl font-semibold text-black mb-4 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                        Eroare
                    </h2>
                    <p className="text-sm text-black/40 mb-8">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-3.5 bg-[var(--accent)] text-white text-sm font-medium tracking-[0.03em] rounded-full hover:bg-[#333] transition-all duration-500"
                    >
                        Reîncearcă
                    </button>
                </div>
            </div>
        );
    }

    if (!album) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <p className="text-sm text-black/40">Albumul nu a fost găsit.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <section className="pt-36 pb-12 px-6 lg:px-12">
                <div className="max-w-7xl mx-auto">
                    <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-black/30 mb-4">Album</p>
                    <h1 className="text-3xl md:text-4xl font-semibold text-black mb-4 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                        {album.title}
                    </h1>
                    <div className="luxury-line mb-6" />
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <p className="text-sm text-black/40">{album.images.length} Fotografii</p>
                        {album.folder_link && (
                            <a
                                href={album.folder_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-white text-sm font-medium tracking-[0.03em] rounded-full hover:bg-[#333] transition-all duration-500"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                </svg>
                                Vezi în Google Drive
                            </a>
                        )}
                    </div>
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
                                                src={img.thumbnailProxyLink || img.proxyLink || img.directLink}
                                                alt={img.name}
                                                className="w-full h-full object-cover transition-transform duration-1000 ease-[var(--ease-luxury)] group-hover:scale-[1.06]"
                                                loading="lazy"
                                                decoding="async"
                                                onLoad={(e) => {
                                                    const imgElement = e.target as HTMLImageElement;
                                                    if (img.thumbnailProxyLink && img.proxyLink) {
                                                        const fullImage = new Image();
                                                        fullImage.src = img.proxyLink;
                                                    }
                                                }}
                                                onError={(e) => {
                                                    const imgElement = e.target as HTMLImageElement;
                                                    if (img.thumbnailProxyLink && imgElement.src === img.thumbnailProxyLink) {
                                                        imgElement.src = img.proxyLink || img.directLink;
                                                    } else if (img.proxyLink && imgElement.src === img.proxyLink) {
                                                        imgElement.src = img.directLink;
                                                    } else if (img.thumbnailLink) {
                                                        imgElement.src = img.thumbnailLink;
                                                    }
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                            <div className="absolute inset-0 flex flex-col justify-end p-5">
                                                <div className="transform translate-y-3 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-[var(--ease-luxury)]">
                                                    <p className="text-white/80 text-sm font-light">{img.name}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-32">
                            <p className="text-black/40 text-base mb-2">Nu există încă imagini în acest album.</p>
                            <p className="text-black/25 text-sm">Verificați mai târziu pentru actualizări.</p>
                        </div>
                    )}
                </div>
            </section>

            {lightboxOpen && album && (
                <Lightbox
                    images={lightboxImages}
                    currentIndex={lightboxIndex}
                    onClose={() => setLightboxOpen(false)}
                    onNavigate={setLightboxIndex}
                />
            )}
        </div>
    );
}
