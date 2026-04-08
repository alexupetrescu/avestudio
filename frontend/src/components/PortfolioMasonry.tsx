'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

interface PortfolioItem {
    id: number;
    title: string;
    image: string;
    description?: string | null;
    category?: {
        name: string;
        slug: string;
    };
}

interface PortfolioMasonryProps {
    initialItems: PortfolioItem[];
    category?: string;
    categories: Array<{ id: number; name: string; slug: string }>;
    hasNextPage?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function PortfolioMasonry({ initialItems, category, categories, hasNextPage: initialHasNext }: PortfolioMasonryProps) {
    const [items, setItems] = useState<PortfolioItem[]>(initialItems);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(initialHasNext ?? true);
    const [page, setPage] = useState(1);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const observerTarget = useRef<HTMLDivElement>(null);

    const fetchMoreItems = useCallback(async () => {
        if (loading || !hasMore) return;

        setLoading(true);
        setError(null);
        try {
            const nextPage = page + 1;
            const params = new URLSearchParams();
            if (category) params.append('category', category);
            params.append('page', nextPage.toString());
            const url = `${API_URL}/portfolio/?${params.toString()}`;

            const res = await fetch(url, {
                cache: 'no-store',
                headers: { 'Accept': 'application/json' }
            });

            if (!res.ok) {
                let errorMessage = `Failed to fetch portfolio (${res.status})`;
                try {
                    const errorData = await res.json();
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch {
                    errorMessage = res.statusText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const data = await res.json();
            const newItems = data.results || [];

            if (newItems.length === 0 || !data.next) {
                setHasMore(false);
            } else {
                setItems(prev => [...prev, ...newItems]);
                setPage(nextPage);
            }
        } catch (error) {
            console.error('Error fetching more items:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setError(errorMessage);

            if (error instanceof Error) {
                if (error.message.includes('Invalid page')) {
                    setHasMore(false);
                    return;
                }
                const isNetworkError = error.message.includes('fetch') || error.message.includes('Network') || error.message.includes('Failed');
                const isServerError = error.message.includes('500') || error.message.includes('502') || error.message.includes('503');
                if (!isNetworkError && !isServerError) {
                    setHasMore(false);
                }
            } else {
                setHasMore(false);
            }
        } finally {
            setLoading(false);
        }
    }, [page, category, loading, hasMore]);

    useEffect(() => {
        setItems(initialItems);
        setPage(1);
        setHasMore(initialHasNext ?? true);
        setError(null);
    }, [category, initialItems, initialHasNext]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    fetchMoreItems();
                }
            },
            { threshold: 0.1 }
        );

        const currentTarget = observerTarget.current;
        if (currentTarget) observer.observe(currentTarget);

        return () => {
            if (currentTarget) observer.unobserve(currentTarget);
        };
    }, [fetchMoreItems, hasMore, loading]);

    const lightboxSlides = items.map(item => ({
        src: item.image,
        alt: item.title,
    }));

    const getName = (title: string) => title.split(' ')[0] || title;

    const getImageHeight = (index: number) => {
        const heights = [320, 420, 360, 480, 400, 340];
        return heights[index % heights.length];
    };

    return (
        <>
            <div className="columns-1 md:columns-2 lg:columns-3 gap-4 md:gap-5 px-4 md:px-8 lg:px-12 py-8">
                {items.map((item, index) => {
                    const imageHeight = getImageHeight(index);
                    const staggerDelay = (index % 6) * 0.08;
                    return (
                        <div
                            key={item.id}
                            className="break-inside-avoid mb-4 md:mb-5 group cursor-pointer relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--muted)] photo-card"
                            onClick={() => {
                                setLightboxIndex(index);
                                setLightboxOpen(true);
                            }}
                            style={{
                                animation: `fadeInUp 0.8s var(--ease-luxury) ${staggerDelay}s both`
                            }}
                        >
                            <div className="relative w-full" style={{ height: `${imageHeight}px` }}>
                                <img
                                    src={item.image}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform duration-1000 ease-[var(--ease-luxury)] group-hover:scale-[1.06]"
                                    loading="lazy"
                                    decoding="async"
                                />

                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                                <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6">
                                    <div className="transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-600 ease-[var(--ease-luxury)]">
                                        <h3
                                            className="text-lg md:text-xl font-semibold text-white mb-1.5"
                                            style={{ fontFamily: 'var(--font-heading)' }}
                                        >
                                            {getName(item.title)}
                                        </h3>
                                        {item.description && (
                                            <p className="text-white/60 text-sm leading-relaxed font-light line-clamp-2">
                                                {item.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {hasMore && (
                <div ref={observerTarget} className="py-16 text-center">
                    {loading && (
                        <div className="flex items-center justify-center gap-3">
                            <div className="flex gap-1.5">
                                <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-[softPulse_1.4s_ease-in-out_infinite]" />
                                <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-[softPulse_1.4s_ease-in-out_0.2s_infinite]" />
                                <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-[softPulse_1.4s_ease-in-out_0.4s_infinite]" />
                            </div>
                        </div>
                    )}
                    {error && !loading && (
                        <div className="text-sm text-black/30">
                            <p>Eroare la încărcare</p>
                            <p className="text-xs text-black/20 mt-1">Încercați să derulați din nou</p>
                        </div>
                    )}
                </div>
            )}

            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                index={lightboxIndex}
                slides={lightboxSlides}
            />
        </>
    );
}
