'use client';

import { useState } from 'react';
import Link from 'next/link';

interface PortfolioItem {
    id: number;
    title: string;
    image: string;
    description?: string | null;
    category?: {
        name: string;
    };
}

interface PortfolioPageCarouselProps {
    items: PortfolioItem[];
}

export default function PortfolioPageCarousel({ items }: PortfolioPageCarouselProps) {
    const [currentSlide, setCurrentSlide] = useState(0);

    const stories = items.slice(0, 12).map((item) => {
        const name = item.title.split(' ')[0] || item.title;
        const displayName = name.length > 20 ? name.substring(0, 20) : name;
        const moment = item.description || item.title;

        return { name: displayName, moment, image: item.image, id: item.id };
    });

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % stories.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + stories.length) % stories.length);
    const goToSlide = (index: number) => setCurrentSlide(index);

    if (stories.length === 0) return null;

    return (
        <div className="relative">
            <div className="relative h-[80vh] md:h-screen overflow-hidden rounded-[var(--radius-xl)] mx-4 md:mx-8 lg:mx-12">
                <div
                    className="flex transition-transform duration-700 ease-[var(--ease-luxury)] h-full"
                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                    {stories.map((story, index) => (
                        <div key={index} className="min-w-full h-full relative flex-shrink-0">
                            <div className="absolute inset-0">
                                <img
                                    src={story.image}
                                    alt={story.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            <div className="absolute left-0 bottom-0 w-full md:w-auto p-6 md:p-10 lg:p-14">
                                <div className="bg-black/50 backdrop-blur-xl p-6 md:p-8 rounded-[var(--radius-lg)] max-w-md border border-white/[0.08]">
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
                    ))}
                </div>

                {/* Arrows */}
                <button
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl hover:bg-white/20 text-white flex items-center justify-center transition-all duration-500 z-10 border border-white/[0.08]"
                    aria-label="Previous slide"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </button>
                <button
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl hover:bg-white/20 text-white flex items-center justify-center transition-all duration-500 z-10 border border-white/[0.08]"
                    aria-label="Next slide"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                </button>

                {/* Dots */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
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

            <div className="py-20 text-center">
                <Link
                    href="/client"
                    className="inline-flex items-center gap-3 px-10 py-4 bg-[var(--accent)] text-white text-sm font-medium tracking-[0.03em] rounded-full hover:bg-[#333] transition-all duration-500 hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:-translate-y-0.5"
                >
                    Hai Să Creăm Și Povestea Voastră
                </Link>
            </div>
        </div>
    );
}
