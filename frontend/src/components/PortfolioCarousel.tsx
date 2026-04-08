'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface PortfolioItem {
    id: number;
    title: string;
    image: string;
    description?: string | null;
    category?: {
        name: string;
    };
}

interface PortfolioCarouselProps {
    items: PortfolioItem[];
}

interface ImageDimensions {
    width: number;
    height: number;
    isPortrait: boolean;
}

export default function PortfolioCarousel({ items }: PortfolioCarouselProps) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [imageDimensions, setImageDimensions] = useState<ImageDimensions[]>([]);

    const stories = useMemo(() => {
        return items.slice(0, 6).map((item) => {
            const name = item.title.split(' ')[0] || item.title;
            const displayName = name.length > 20 ? name.substring(0, 20) : name;
            const moment = item.description || item.title;

            return {
                name: displayName,
                moment: moment,
                image: item.image,
                id: item.id,
            };
        });
    }, [items]);

    const itemsKey = useMemo(() => {
        return items.slice(0, 6).map(item => item.id).join(',');
    }, [items]);

    const loadedItemsKey = useRef<string>('');
    const isLoadingRef = useRef(false);

    useEffect(() => {
        if (itemsKey === loadedItemsKey.current || isLoadingRef.current) return;
        if (stories.length === 0) return;

        isLoadingRef.current = true;
        loadedItemsKey.current = itemsKey;
        let isMounted = true;

        const loadImageDimensions = async () => {
            const dimensions: ImageDimensions[] = [];

            for (const story of stories) {
                try {
                    const img = new window.Image();
                    const loadPromise = new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                        img.src = story.image;
                    });

                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Image load timeout')), 10000);
                    });

                    await Promise.race([loadPromise, timeoutPromise]);
                    if (!isMounted) return;

                    dimensions.push({
                        width: img.width,
                        height: img.height,
                        isPortrait: img.height > img.width,
                    });
                } catch {
                    if (!isMounted) return;
                    dimensions.push({ width: 1920, height: 1080, isPortrait: false });
                }
            }

            if (isMounted) {
                setImageDimensions(dimensions);
                isLoadingRef.current = false;
            }
        };

        loadImageDimensions();
        return () => { isMounted = false; isLoadingRef.current = false; };
    }, [itemsKey, stories.length]);

    useEffect(() => {
        if (stories.length === 0) return;
        for (let i = 1; i <= 3; i++) {
            const nextIndex = (currentSlide + i) % stories.length;
            const img = new window.Image();
            img.src = stories[nextIndex].image;
        }
    }, [currentSlide, stories]);

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % stories.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + stories.length) % stories.length);
    const goToSlide = (index: number) => setCurrentSlide(index);

    if (stories.length === 0) return null;

    return (
        <div className="relative">
            {/* Carousel with rounded corners */}
            <div className="mx-4 md:mx-8 lg:mx-12">
                <div
                    className="relative overflow-hidden w-full rounded-[var(--radius-xl)]"
                    style={{ aspectRatio: '16/9' }}
                >
                    <div
                        className="flex transition-transform duration-700 ease-[var(--ease-luxury)] h-full"
                        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                    >
                        {stories.map((story, index) => {
                            const dimensions = imageDimensions[index];
                            const isPortrait = dimensions?.isPortrait ?? false;
                            const isCurrentSlide = index === currentSlide;
                            const isPreload = index === (currentSlide + 1) % stories.length ||
                                             index === (currentSlide + 2) % stories.length;

                            return (
                                <div key={index} className="min-w-full h-full relative flex-shrink-0">
                                    <div className="absolute inset-0">
                                        {isPortrait && (
                                            <Image
                                                src={story.image}
                                                alt=""
                                                fill
                                                sizes="100vw"
                                                className="object-cover blur-3xl scale-125 opacity-40"
                                                priority={index === 0}
                                                loading={index === 0 ? 'eager' : isPreload ? 'eager' : 'lazy'}
                                                quality={60}
                                                aria-hidden="true"
                                            />
                                        )}
                                        <Image
                                            src={story.image}
                                            alt={story.name}
                                            fill
                                            sizes="100vw"
                                            className={`transition-all duration-1000 relative z-10 ${
                                                isCurrentSlide ? 'opacity-100 scale-100' : 'opacity-80 scale-[1.02]'
                                            } ${isPortrait ? 'object-contain' : 'object-cover'}`}
                                            priority={index === 0}
                                            loading={index === 0 ? 'eager' : isPreload ? 'eager' : 'lazy'}
                                            quality={90}
                                        />
                                    </div>

                                    <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/20 pointer-events-none z-20" />

                                    {/* Content overlay */}
                                    <div className="absolute left-0 bottom-0 w-full md:w-auto p-6 md:p-10 lg:p-14 z-30">
                                        <div className={`bg-black/50 backdrop-blur-xl p-6 md:p-8 rounded-[var(--radius-lg)] max-w-md border border-white/[0.08] transition-all duration-700 ${
                                            isCurrentSlide
                                                ? 'opacity-100 translate-y-0'
                                                : 'opacity-0 translate-y-4'
                                        }`}>
                                            <h3
                                                className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white mb-3"
                                                style={{ fontFamily: 'var(--font-heading)' }}
                                            >
                                                {story.name}
                                            </h3>
                                            <p className="text-sm md:text-base text-white/60 leading-relaxed font-light">
                                                {story.moment}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Nav arrows */}
                    <button
                        onClick={prevSlide}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl hover:bg-white/20 text-white flex items-center justify-center transition-all duration-500 z-40 border border-white/[0.08]"
                        aria-label="Previous slide"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl hover:bg-white/20 text-white flex items-center justify-center transition-all duration-500 z-40 border border-white/[0.08]"
                        aria-label="Next slide"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </button>

                    {/* Dots */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-40">
                        {stories.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToSlide(index)}
                                className={`h-1.5 rounded-full transition-all duration-500 ${
                                    index === currentSlide
                                        ? 'bg-white w-8'
                                        : 'bg-white/30 hover:bg-white/50 w-1.5'
                                }`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom CTA */}
            <div className="py-20 text-center">
                <Link
                    href="/portfolio"
                    className="inline-flex items-center gap-3 px-10 py-4 bg-[var(--accent)] text-white text-sm font-medium tracking-[0.03em] rounded-full hover:bg-[#333] transition-all duration-500 hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:-translate-y-0.5"
                >
                    <span>Hai să imortalizăm și povestea voastră</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                    </svg>
                </Link>
            </div>
        </div>
    );
}
