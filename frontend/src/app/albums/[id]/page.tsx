'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchPortfolio } from '@/lib/api';
import ProgressBar from '@/components/ProgressBar';

export default function AlbumDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
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
                <div className="min-h-screen bg-white flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-black/60 text-lg">Se încarcă albumul...</div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <section className="pt-32 pb-16 px-8 lg:px-16 border-b border-black/5">
                <div className="max-w-7xl mx-auto">
                    <Link
                        href="/albums"
                        className="inline-flex items-center text-black/60 hover:text-black mb-8 transition-colors duration-300 group text-sm font-medium"
                    >
                        <span className="mr-2 group-hover:-translate-x-1 transition-transform duration-300">←</span>
                        Înapoi la Albume
                    </Link>
                    <h1 className="text-5xl md:text-6xl font-bold text-black mb-4 tracking-tight">
                        {albumTitle}
                    </h1>
                    <p className="text-black/60 text-sm">{images.length} Fotografii</p>
                </div>
            </section>

            {/* Images Grid */}
            <section className="py-12 px-8 lg:px-16">
                <div className="max-w-7xl mx-auto">
                    {images.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {images.map((item, index) => (
                                <div
                                    key={item.id || index}
                                    className="group relative aspect-square overflow-hidden bg-gray-100 card-hover"
                                >
                                    <img
                                        src={item.image}
                                        alt={item.title || 'Fotografie'}
                                        className="w-full h-full object-cover image-zoom"
                                    />
                                    {item.title && (
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500 flex flex-col justify-end p-6">
                                            <p className="text-sm text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-500">{item.title}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-32">
                            <p className="text-black/60 text-lg">Nu există imagini în acest album.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
