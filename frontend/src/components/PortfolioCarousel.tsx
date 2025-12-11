'use client';

import { useState } from 'react';
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

export default function PortfolioCarousel({ items }: PortfolioCarouselProps) {
    const [currentSlide, setCurrentSlide] = useState(0);
    
    // Create stories from portfolio items using fetched data
    const stories = items.slice(0, 6).map((item) => {
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
                    className="flex transition-transform duration-700 ease-out h-full"
                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                    {stories.map((story, index) => (
                        <div key={index} className="min-w-full h-full relative flex-shrink-0">
                            {/* Full-width Image with fade effect */}
                            <div className="absolute inset-0">
                                <img
                                    src={story.image}
                                    alt={story.name}
                                    className={`w-full h-full object-cover transition-opacity duration-700 ${
                                        index === currentSlide ? 'opacity-100' : 'opacity-90'
                                    }`}
                                />
                            </div>
                            
                            {/* Subtle gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/40 pointer-events-none" />

                            {/* Minimal Left Overlay Panel with animation */}
                            <div className="absolute left-0 top-0 bottom-0 w-full md:w-auto flex items-end md:items-center p-8 md:p-12 lg:p-16">
                                <div className={`bg-black/70 backdrop-blur-glass p-6 md:p-8 lg:p-10 rounded-xl max-w-md border border-white/10 shadow-2xl transition-all duration-700 ${
                                    index === currentSlide 
                                        ? 'opacity-100 translate-x-0' 
                                        : 'opacity-0 -translate-x-8'
                                }`}>
                                    {/* Family/Child Name */}
                                    <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                        {story.name}
                                    </h3>

                                    {/* Brief Emotional Moment / Description */}
                                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 mb-4 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                                        {story.moment}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Navigation Arrows with enhanced styling */}
                <button
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-4 rounded-full transition-all duration-300 z-10 backdrop-blur-sm border border-white/10 shadow-lg transform hover:scale-110 active:scale-95"
                    aria-label="Previous slide"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-4 rounded-full transition-all duration-300 z-10 backdrop-blur-sm border border-white/10 shadow-lg transform hover:scale-110 active:scale-95"
                    aria-label="Next slide"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                {/* Dots Navigation with enhanced styling */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10 backdrop-blur-sm bg-black/20 px-4 py-2 rounded-full">
                    {stories.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`h-2 rounded-full transition-all duration-500 ease-out ${
                                index === currentSlide
                                    ? 'bg-white w-8 shadow-lg'
                                    : 'bg-white/50 hover:bg-white/75 w-2'
                            }`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            </div>

            {/* Bottom CTA with enhanced styling */}
            <div className="bg-black text-white py-16 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                        backgroundSize: '30px 30px'
                    }}></div>
                </div>
                <Link
                    href="/client"
                    className="relative z-10 inline-block px-10 py-4 bg-white text-black font-medium hover:bg-gray-100 transition-all duration-300 text-lg rounded-sm transform hover:scale-105 hover:shadow-xl"
                >
                    Hai să imortalizăm și povestea voastră
                </Link>
            </div>
        </div>
    );
}

