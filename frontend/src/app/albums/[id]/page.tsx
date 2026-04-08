'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { fetchPortfolio } from '@/lib/api';
import ProgressBar from '@/components/ProgressBar';

export default function AlbumDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [albumTitle, setAlbumTitle] = useState('');

    useEffect(() => {
        fetchPortfolio()
            .then((data) => {
                setImages(data.slice(0, 20) || []);
                setAlbumTitle(`Album ${id}`);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    }, [id]);

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

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <section className="pt-36 pb-12 px-6 lg:px-12">
                <div className="max-w-7xl mx-auto">
                    <Link
                        href="/albums"
                        className="inline-flex items-center gap-2 text-sm text-black/30 hover:text-black transition-colors duration-500 mb-8"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        Înapoi la Albume
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-semibold text-black mb-4 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                        {albumTitle}
                    </h1>
                    <div className="luxury-line mb-4" />
                    <p className="text-sm text-black/40">{images.length} Fotografii</p>
                </div>
            </section>

            <section className="py-8 px-4 md:px-8 lg:px-12">
                <div className="max-w-7xl mx-auto">
                    {images.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {images.map((item: any, index: number) => (
                                <div
                                    key={item.id || index}
                                    className="group relative aspect-square overflow-hidden rounded-[var(--radius-lg)] bg-[var(--muted)] photo-card"
                                >
                                    <img
                                        src={item.image}
                                        alt={item.title || 'Fotografie'}
                                        className="w-full h-full object-cover transition-transform duration-1000 ease-[var(--ease-luxury)] group-hover:scale-[1.06]"
                                    />
                                    {item.title && (
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex flex-col justify-end p-5">
                                            <p className="text-sm text-white/80 font-light">{item.title}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-32">
                            <p className="text-black/40 text-base">Nu există imagini în acest album.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
