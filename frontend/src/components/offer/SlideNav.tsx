'use client';

import { useEffect, useState } from 'react';

export interface Slide {
  id: string;
  label: string;
}

/** Fixed side indicator that tracks which "slide" (section) crosses the middle of the viewport. */
export default function SlideNav({ slides }: { slides: Slide[] }) {
  const [active, setActive] = useState(slides[0]?.id);

  useEffect(() => {
    const targets = slides.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (!targets.length) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.5;
      let current = targets[0].id;
      for (const t of targets) {
        if (t.getBoundingClientRect().top <= line) current = t.id;
      }
      setActive((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [slides]);

  const index = Math.max(0, slides.findIndex((s) => s.id === active));

  return (
    <nav className="offer-slidenav no-print" aria-label="Secțiuni">
      <span className="offer-slidenav-count">
        {String(index + 1).padStart(2, '0')}
        <i>/</i>
        {String(slides.length).padStart(2, '0')}
      </span>
      <ul>
        {slides.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={s.id === active ? 'is-active' : ''}
              aria-current={s.id === active ? 'true' : undefined}
            >
              <span className="offer-slidenav-label">{s.label}</span>
              <span className="offer-slidenav-dot" />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
