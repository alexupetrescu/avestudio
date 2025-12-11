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
    hasNextPage?: boolean; // Add this to track if there are more pages
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

    // Fetch more items
    const fetchMoreItems = useCallback(async () => {
        if (loading || !hasMore) return;

        setLoading(true);
        setError(null); // Clear previous errors
        try {
            const nextPage = page + 1;
            // Build URL consistently with api.ts format
            const params = new URLSearchParams();
            if (category) params.append('category', category);
            params.append('page', nextPage.toString());
            const url = `${API_URL}/portfolio/?${params.toString()}`;
            
            // Debug: log the URL being fetched (only in development)
            if (process.env.NODE_ENV === 'development') {
                console.log('Fetching portfolio from:', url);
                console.log('API_URL:', API_URL);
            }
            
            const res = await fetch(url, { 
                cache: 'no-store',
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            if (!res.ok) {
                // Try to get error details from response
                let errorMessage = `Failed to fetch portfolio (${res.status})`;
                try {
                    const errorData = await res.json();
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch {
                    // If response is not JSON, use status text
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
            
            // Handle "Invalid page" error - means we've reached the end
            if (error instanceof Error) {
                const isInvalidPage = error.message.includes('Invalid page');
                if (isInvalidPage) {
                    setHasMore(false);
                    return; // Don't show error for invalid page, just stop loading
                }
                
                // Check if it's a network error or server error
                const isNetworkError = error.message.includes('fetch') || error.message.includes('Network') || error.message.includes('Failed');
                const isServerError = error.message.includes('500') || error.message.includes('502') || error.message.includes('503');
                
                // Don't disable hasMore for network/server errors - user can retry by scrolling
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

    // Reset when category changes
    useEffect(() => {
        setItems(initialItems);
        setPage(1);
        setHasMore(initialHasNext ?? true);
        setError(null); // Clear error when category changes
    }, [category, initialItems, initialHasNext]);

    // Intersection Observer for infinite scroll
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
        if (currentTarget) {
            observer.observe(currentTarget);
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
    }, [fetchMoreItems, hasMore, loading]);

    // Prepare lightbox slides
    const lightboxSlides = items.map(item => ({
        src: item.image,
        alt: item.title,
    }));

    // Extract name from title
    const getName = (title: string) => {
        return title.split(' ')[0] || title;
    };

    // Generate varied heights for masonry effect
    const getImageHeight = (index: number) => {
        const heights = [300, 400, 350, 450, 380, 320];
        return heights[index % heights.length];
    };

    return (
        <>
            {/* Masonry Grid */}
            <div className="columns-1 md:columns-2 lg:columns-3 gap-4 md:gap-6 px-4 md:px-8 lg:px-16 py-8">
                {items.map((item, index) => {
                    const imageHeight = getImageHeight(index);
                    const staggerDelay = (index % 6) * 0.1;
                    return (
                        <div
                            key={item.id}
                            className="break-inside-avoid mb-4 md:mb-6 group cursor-pointer relative overflow-hidden rounded-xl bg-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500"
                            onClick={() => {
                                setLightboxIndex(index);
                                setLightboxOpen(true);
                            }}
                            style={{
                                animation: `fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${staggerDelay}s both`
                            }}
                        >
                            <div className="relative w-full" style={{ height: `${imageHeight}px` }}>
                                <img
                                    src={item.image}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                                    loading="lazy"
                                    decoding="async"
                                    style={{ imageRendering: 'auto' }}
                                />
                                
                                {/* Gradient overlay for better text readability */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                
                                {/* Hover Overlay with enhanced animation */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-500 flex flex-col justify-end p-4 md:p-6">
                                    <div className="transform translate-y-6 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out">
                                        <h3 className="text-xl md:text-2xl font-bold text-white mb-2 drop-shadow-lg">
                                            {getName(item.title)}
                                        </h3>
                                        {item.description && (
                                            <p className="text-white/95 text-sm md:text-base leading-relaxed drop-shadow-md">
                                                {item.description}
                                            </p>
                                        )}
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

            {/* Load More / Infinite Scroll Trigger */}
            {hasMore && (
                <div ref={observerTarget} className="py-12 text-center">
                    {loading && (
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 bg-black/40 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-black/40 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-black/40 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                            <span className="ml-3 text-black/60">Se încarcă...</span>
                        </div>
                    )}
                    {error && !loading && (
                        <div className="text-sm text-red-600/80 mb-2">
                            <p>Eroare la încărcare: {error}</p>
                            <p className="text-xs text-black/40 mt-1">Încercați să derulați din nou</p>
                        </div>
                    )}
                </div>
            )}

            {/* Lightbox */}
            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                index={lightboxIndex}
                slides={lightboxSlides}
            />
        </>
    );
}

