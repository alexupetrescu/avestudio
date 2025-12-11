'use client';

import { useEffect, useRef } from 'react';

export default function HeroParallax() {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (imageRef.current) {
        const scrolled = window.scrollY;
        const rate = scrolled * 0.3;
        imageRef.current.style.transform = `translateY(${rate}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {/* Desktop image */}
      <img
        ref={imageRef}
        src="/avestudio-heroimage.jpg"
        alt="Hero"
        className="hidden md:block w-full h-full object-cover animate-fade-in"
        style={{ animationDuration: '1.2s', willChange: 'transform' }}
      />
      {/* Mobile image */}
      <img
        src="/avestudio-heroimage-mobile.jpg"
        alt="Hero"
        className="md:hidden w-full h-full object-cover animate-fade-in"
        style={{ animationDuration: '1.2s' }}
      />
    </div>
  );
}

