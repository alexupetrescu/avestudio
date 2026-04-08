'use client';

import { useEffect, useRef } from 'react';

export default function HeroParallax() {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (imageRef.current) {
        const scrolled = window.scrollY;
        const rate = scrolled * 0.25;
        imageRef.current.style.transform = `translateY(${rate}px) scale(1.05)`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-black">
      {/* Desktop */}
      <img
        ref={imageRef}
        src="/avestudio-heroimage.jpg"
        alt="Hero"
        className="hidden md:block w-full h-full object-cover animate-fade-in scale-105"
        style={{ animationDuration: '1.5s', willChange: 'transform', filter: 'grayscale(15%) contrast(1.05)' }}
      />
      {/* Mobile */}
      <img
        src="/avestudio-heroimage-mobile.jpg"
        alt="Hero"
        className="md:hidden w-full h-full object-cover animate-fade-in"
        style={{ animationDuration: '1.5s', filter: 'grayscale(15%) contrast(1.05)' }}
      />
    </div>
  );
}
