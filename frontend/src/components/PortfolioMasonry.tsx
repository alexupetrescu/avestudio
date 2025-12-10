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
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function PortfolioMasonry({ initialItems, category, categories }: PortfolioMasonryProps) {
    const [items, setItems] = useState<PortfolioItem[]>(initialItems);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const observerTarget = useRef<HTMLDivElement>(null);

    // Fetch more items
    const fetchMoreItems = useCallback(async () => {
        if (loading || !hasMore) return;

        setLoading(true);
        try {
            const nextPage = page + 1;
            const url = category
                ? `${API_URL}/portfolio/?category=${category}&page=${nextPage}`
                : `${API_URL}/portfolio/?page=${nextPage}`;
            
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to fetch portfolio');
            
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
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, [page, category, loading, hasMore]);

    // Reset when category changes
    useEffect(() => {
        setItems(initialItems);
        setPage(1);
        setHasMore(true);
    }, [category, initialItems]);

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
                    return (
                        <div
                            key={item.id}
                            className="break-inside-avoid mb-4 md:mb-6 group cursor-pointer relative overflow-hidden rounded-lg bg-gray-100"
                            onClick={() => {
                                setLightboxIndex(index);
                                setLightboxOpen(true);
                            }}
                        >
                            <div className="relative w-full" style={{ height: `${imageHeight}px` }}>
                                <img
                                    src={item.image}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                
                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex flex-col justify-end p-4 md:p-6">
                                    <div className="transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                        <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                                            {getName(item.title)}
                                        </h3>
                                        {item.description && (
                                            <p className="text-white/90 text-sm md:text-base">
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

            {/* Load More / Infinite Scroll Trigger */}
            {hasMore && (
                <div ref={observerTarget} className="py-8 text-center">
                    {loading && (
                        <p className="text-black/60">Se încarcă...</p>
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

