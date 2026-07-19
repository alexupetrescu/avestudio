'use client';

import { useEffect, useRef, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const DEFAULT_HERO_DESKTOP = '/avestudio-heroimage.jpg';
const DEFAULT_HERO_MOBILE = '/avestudio-heroimage-mobile.jpg';

export default function HeroParallax() {
  const imageRef = useRef<HTMLImageElement>(null);
  const [heroDesktop, setHeroDesktop] = useState(DEFAULT_HERO_DESKTOP);
  const [heroMobile, setHeroMobile] = useState(DEFAULT_HERO_MOBILE);

  useEffect(() => {
    // Hero images are managed from the Django admin (Site Settings);
    // fall back to the bundled defaults when none are set or the API is down.
    let cancelled = false;
    fetch(`${API_URL}/site-settings/`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.hero_image) setHeroDesktop(data.hero_image);
        if (data.hero_image_mobile) setHeroMobile(data.hero_image_mobile);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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
        src={heroDesktop}
        alt="Hero"
        className="hidden md:block w-full h-full object-cover animate-fade-in scale-105"
        style={{ animationDuration: '1.5s', willChange: 'transform', filter: 'grayscale(15%) contrast(1.05)' }}
      />
      {/* Mobile */}
      <img
        src={heroMobile}
        alt="Hero"
        className="md:hidden w-full h-full object-cover animate-fade-in"
        style={{ animationDuration: '1.5s', filter: 'grayscale(15%) contrast(1.05)' }}
      />
    </div>
  );
}
