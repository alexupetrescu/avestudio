'use client';

import Image from 'next/image';
import { useEffect, useRef, type CSSProperties } from 'react';

interface Layer {
  src: string;
  alt: string;
  w: number;
  h: number;
  depth: number; // 0..1, higher = moves more with the pointer
  className: string;
  delay: number;
}

const LAYERS: Layer[] = [
  {
    src: '/oferta/felicitare-21x15.webp',
    alt: 'Felicitare 21x15 cm',
    w: 1400,
    h: 1000,
    depth: 0.35,
    className: 'offer-hero-card offer-hero-card--wide',
    delay: 1000,
  },
  {
    src: '/oferta/calendar.webp',
    alt: 'Calendar 2027',
    w: 933,
    h: 1400,
    depth: 0.6,
    className: 'offer-hero-card offer-hero-card--main',
    delay: 800,
  },
  {
    src: '/oferta/poza-retro-10x12.webp',
    alt: 'Fotografie retro 10x12 cm',
    w: 1167,
    h: 1400,
    depth: 0.95,
    className: 'offer-hero-card offer-hero-card--retro',
    delay: 1200,
  },
];

/**
 * Fanned stack of product mockups with a slow idle drift and a light
 * pointer parallax on fine-pointer devices.
 */
export default function HeroVisual() {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;

    const loop = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      el.style.setProperty('--px', cx.toFixed(4));
      el.style.setProperty('--py', cy.toFixed(4));
      if (Math.abs(tx - cx) > 0.0005 || Math.abs(ty - cy) > 0.0005) raf = requestAnimationFrame(loop);
      else raf = 0;
    };
    const onMove = (e: PointerEvent) => {
      const r = section.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const section: HTMLElement = el.closest('section') ?? el;
    section.addEventListener('pointermove', onMove);
    section.addEventListener('pointerleave', onLeave);
    return () => {
      section.removeEventListener('pointermove', onMove);
      section.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrap} className="offer-hero-visual" aria-hidden="true">
      <div className="offer-hero-glow" />
      <div className="offer-hero-ring" />
      {LAYERS.map((l) => (
        <div
          key={l.src}
          className={l.className}
          style={{ '--depth': l.depth, '--enter-delay': `${l.delay}ms` } as CSSProperties}
        >
          <Image src={l.src} alt="" width={l.w} height={l.h} sizes="(max-width: 1024px) 70vw, 30vw" priority />
        </div>
      ))}
    </div>
  );
}
