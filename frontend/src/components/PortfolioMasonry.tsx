'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

interface PortfolioItem {
    id: number;
    title: string;
    image: string;
    width?: number;
    height?: number;
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
const DEFAULT_RATIO = 3 / 4; // width / height used until the real size is known

/** Column count for a container width (same breakpoints as the rest of the site). */
function columnsFor(width: number) {
    if (width >= 1280) return 4;
    if (width >= 1024) return 3;
    if (width >= 640) return 2;
    return 1;
}

export default function PortfolioMasonry({ initialItems, category, hasNextPage: initialHasNext }: PortfolioMasonryProps) {
    const [items, setItems] = useState<PortfolioItem[]>(initialItems);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(initialHasNext ?? true);
    const [page, setPage] = useState(1);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [columnCount, setColumnCount] = useState(3);
    // Sizes measured in the browser for items the API did not report a size for
    const [measured, setMeasured] = useState<Record<number, number>>({});
    const observerTarget = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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
            }
            if (newItems.length > 0) {
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

    // Responsive column count driven by the real container width
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => setColumnCount(columnsFor(el.clientWidth));
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const ratioOf = useCallback((item: PortfolioItem) => {
        if (item.width && item.height) return item.width / item.height;
        return measured[item.id] ?? DEFAULT_RATIO;
    }, [measured]);

    /**
     * True masonry: every item goes to the currently shortest column, so the
     * columns end at (nearly) the same height regardless of the mix of
     * portrait and landscape photos. Heights are compared in "width units"
     * (1 / aspect ratio) because all columns share the same width.
     */
    const columns = useMemo(() => {
        const cols: Array<{ items: Array<{ item: PortfolioItem; index: number }>; height: number }> =
            Array.from({ length: columnCount }, () => ({ items: [], height: 0 }));
        items.forEach((item, index) => {
            let target = 0;
            for (let i = 1; i < cols.length; i++) {
                if (cols[i].height < cols[target].height - 0.001) target = i;
            }
            cols[target].items.push({ item, index });
            cols[target].height += 1 / ratioOf(item);
        });
        return cols;
    }, [items, columnCount, ratioOf]);

    const lightboxSlides = items.map(item => ({
        src: item.image,
        alt: item.title,
        width: item.width || undefined,
        height: item.height || undefined,
    }));

    const getName = (title: string) => title.split(' ')[0] || title;

    const onImageLoad = (item: PortfolioItem) => (e: React.SyntheticEvent<HTMLImageElement>) => {
        if (item.width && item.height) return;
        const img = e.currentTarget;
        if (img.naturalWidth && img.naturalHeight) {
            setMeasured(prev => prev[item.id] ? prev : { ...prev, [item.id]: img.naturalWidth / img.naturalHeight });
        }
    };

    return (
        <>
            <div ref={containerRef} className="flex gap-4 md:gap-5 px-4 md:px-8 lg:px-12 py-8 items-start">
                {columns.map((col, colIndex) => (
                    <div key={colIndex} className="flex-1 min-w-0 flex flex-col gap-4 md:gap-5">
                        {col.items.map(({ item, index }) => {
                            const staggerDelay = (index % 6) * 0.08;
                            return (
                                <div
                                    key={item.id}
                                    className="group cursor-pointer relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--muted)] photo-card"
                                    onClick={() => {
                                        setLightboxIndex(index);
                                        setLightboxOpen(true);
                                    }}
                                    style={{
                                        animation: `fadeInUp 0.8s var(--ease-luxury) ${staggerDelay}s both`
                                    }}
                                >
                                    <div className="relative w-full" style={{ aspectRatio: `${ratioOf(item)}` }}>
                                        <img
                                            src={item.image}
                                            alt={item.title}
                                            onLoad={onImageLoad(item)}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-[var(--ease-luxury)] group-hover:scale-[1.06]"
                                            loading={index < 8 ? 'eager' : 'lazy'}
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
                ))}
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
