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
    
    // Create stories from portfolio items using fetched data
    const stories = items.slice(0, 12).map((item) => {
        // Extract name from title (first word) or use title if short
        const name = item.title.split(' ')[0] || item.title;
        const displayName = name.length > 20 ? name.substring(0, 20) : name;
        
        // Use description from API, fallback to title if no description
        const moment = item.description || item.title;
        
        return {
            name: displayName,
            moment: moment,
            image: item.image,
            id: item.id,
        };
    });

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % stories.length);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + stories.length) % stories.length);
    };

    const goToSlide = (index: number) => {
        setCurrentSlide(index);
    };

    if (stories.length === 0) return null;

    return (
        <div className="relative">
            {/* Carousel Container */}
            <div className="relative h-[80vh] md:h-screen overflow-hidden">
                {/* Slides */}
                <div 
                    className="flex transition-transform duration-500 ease-in-out h-full"
                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                    {stories.map((story, index) => (
                        <div key={index} className="min-w-full h-full relative flex-shrink-0">
                            {/* Full-width Hero Image */}
                            <div className="absolute inset-0">
                                <img
                                    src={story.image}
                                    alt={story.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Minimal Left Overlay Panel */}
                            <div className="absolute left-0 top-0 bottom-0 w-full md:w-auto flex items-end md:items-center p-8 md:p-12 lg:p-16">
                                <div className="bg-black/60 backdrop-blur-sm p-6 md:p-8 lg:p-10 rounded-lg max-w-md">
                                    {/* Family/Child Name */}
                                    <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                                        {story.name}
                                    </h3>

                                    {/* Brief Emotional Moment / Description */}
                                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 mb-4 leading-relaxed">
                                        {story.moment}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Navigation Arrows */}
                <button
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all duration-300 z-10"
                    aria-label="Previous slide"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all duration-300 z-10"
                    aria-label="Next slide"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                {/* Dots Navigation */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {stories.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                index === currentSlide
                                    ? 'bg-white w-8'
                                    : 'bg-white/50 hover:bg-white/75'
                            }`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            </div>

            {/* Bottom CTA */}
            <div className="bg-black text-white py-16 text-center">
                <Link
                    href="/client"
                    className="inline-block px-10 py-4 bg-white text-black font-medium hover:bg-gray-100 transition-colors duration-300 text-lg"
                >
                    Hai Să Creăm Și Povestea Voastră
                </Link>
            </div>
        </div>
    );
}

