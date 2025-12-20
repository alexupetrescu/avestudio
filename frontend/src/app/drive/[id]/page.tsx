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

    // Convert Google Drive images to format expected by Lightbox (use full images, not thumbnails)
    const lightboxImages = album?.images.map((img, index) => ({
        id: index, // Lightbox expects number, use index
        image: img.proxyLink || img.directLink,
    })) || [];

    if (loading) {
        return (
            <>
                <ProgressBar isLoading={loading} className="fixed top-0 left-0 right-0 z-50" />
                <div className="min-h-screen bg-white flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-black/60 text-lg">Se încarcă...</div>
                    </div>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center px-8 py-32">
                <div className="w-full max-w-2xl text-center">
                    <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 tracking-tight">
                        Eroare
                    </h2>
                    <p className="text-black/60 mb-8">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="btn-primary"
                    >
                        Reîncearcă
                    </button>
                </div>
            </div>
        );
    }

    if (!album) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-black/60 text-lg">Albumul nu a fost găsit.</div>
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
                        {album.folder_link && (
                            <a
                                href={album.folder_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary inline-flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Vezi pozele în Google Drive
                            </a>
                        )}
                    </div>
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
                                                src={img.thumbnailProxyLink || img.proxyLink || img.directLink}
                                                alt={img.name}
                                                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                                                loading="lazy"
                                                decoding="async"
                                                onLoad={(e) => {
                                                    // Optionally load full image on hover or after thumbnail loads
                                                    const imgElement = e.target as HTMLImageElement;
                                                    if (img.thumbnailProxyLink && img.proxyLink) {
                                                        // Preload full image in background
                                                        const fullImage = new Image();
                                                        fullImage.src = img.proxyLink;
                                                    }
                                                }}
                                                onError={(e) => {
                                                    // Fallback chain: thumbnail -> proxy -> direct -> Google thumbnail
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
                                            
                                            {/* Gradient overlay on hover */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            
                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-500 flex flex-col justify-end p-4 md:p-6">
                                                <div className="transform translate-y-6 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out">
                                                    <p className="text-white/95 text-sm md:text-base drop-shadow-md">
                                                        {img.name}
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
                    images={lightboxImages}
                    currentIndex={lightboxIndex}
                    onClose={() => setLightboxOpen(false)}
                    onNavigate={setLightboxIndex}
                />
            )}
        </div>
    );
}

