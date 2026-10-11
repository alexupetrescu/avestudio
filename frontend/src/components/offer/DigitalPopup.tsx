'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'offer-digital-popup-seen';
const OPEN_DELAY_MS = 6000;

type Phase = 'hidden' | 'open' | 'closing';

function readSeen(): boolean {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* private mode: the pop-up may show again, which is fine */
  }
}

/**
 * "Digital format included" pop-up for the offer pages.
 * Opens once per session, after a few seconds or when the packages section
 * scrolls into view. After it is closed, a small pill keeps it one tap away.
 */
export default function DigitalPopup({ triggerId, targetId }: { triggerId: string; targetId: string }) {
  const [phase, setPhase] = useState<Phase>('hidden');
  const [pill, setPill] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const open = useCallback(() => {
    lastFocus.current = document.activeElement as HTMLElement | null;
    setPhase('open');
    markSeen();
  }, []);

  const close = useCallback(() => {
    setPhase((p) => (p === 'open' ? 'closing' : p));
  }, []);

  // Auto-open once per session.
  useEffect(() => {
    if (readSeen()) {
      const t = window.setTimeout(() => setPill(true), 0);
      return () => window.clearTimeout(t);
    }
    let done = false;
    const fire = () => {
      if (done) return;
      done = true;
      open();
    };
    const timer = window.setTimeout(fire, OPEN_DELAY_MS);
    const target = document.getElementById(triggerId);
    let io: IntersectionObserver | null = null;
    if (target && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) fire();
        },
        { threshold: 0.2 },
      );
      io.observe(target);
    }
    return () => {
      done = true;
      window.clearTimeout(timer);
      io?.disconnect();
    };
  }, [open, triggerId]);

  // Esc to close, focus management, scroll lock while open.
  useEffect(() => {
    if (phase !== 'open') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => closeRef.current?.focus(), 60);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [phase, close]);

  // Finish the exit animation, then unmount.
  useEffect(() => {
    if (phase !== 'closing') return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = window.setTimeout(() => {
      setPhase('hidden');
      setPill(true);
      lastFocus.current?.focus?.();
    }, reduce ? 0 : 380);
    return () => window.clearTimeout(t);
  }, [phase]);

  const goToPackages = () => {
    close();
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      {pill && phase === 'hidden' && (
        <button type="button" className="offer-digital-pill no-print" onClick={open}>
          <span className="offer-digital-pill-dot" />
          Format digital inclus
        </button>
      )}

      {phase !== 'hidden' && (
        <div
          className={`offer-pop no-print ${phase === 'closing' ? 'is-closing' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="offer-pop-title"
          aria-describedby="offer-pop-desc"
        >
          <div className="offer-pop-backdrop" onClick={close} />
          <div className="offer-pop-card">
            <button ref={closeRef} type="button" className="offer-pop-close" onClick={close} aria-label="Închide">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <div className="offer-pop-visual" aria-hidden="true">
              <div className="offer-pop-shot offer-pop-shot--1">
                <Image src="/oferta/poza-15x20.webp" alt="" width={425} height={595} sizes="140px" />
              </div>
              <div className="offer-pop-shot offer-pop-shot--2">
                <Image src="/oferta/poza-retro-10x12.webp" alt="" width={1167} height={1400} sizes="160px" />
              </div>
              <div className="offer-pop-shot offer-pop-shot--3">
                <Image src="/oferta/poza-20x30.webp" alt="" width={567} height={850} sizes="140px" />
              </div>
              <span className="offer-pop-badge">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14" />
                </svg>
              </span>
            </div>

            <div className="offer-pop-body">
              <p className="offer-pop-eyebrow">Inclus în ambele pachete · 0 lei în plus</p>
              <h2 id="offer-pop-title" className="offer-pop-title">
                Toate fotografiile, <em>și în format digital</em>
              </h2>
              <p id="offer-pop-desc" className="offer-pop-text">
                Pe lângă produsele tipărite, fiecare părinte primește albumul online al copilului, cu toate fotografiile din ședință.
              </p>
              <ul className="offer-pop-list">
                <li>Toate fotografiile copilului, nu doar cele tipărite</li>
                <li>Rezoluție mare, bune de tipărit sau de trimis bunicilor</li>
                <li>Acces cu link și PIN personal, direct de pe telefon</li>
              </ul>
              <div className="offer-pop-actions">
                <button type="button" className="offer-btn offer-btn--green" onClick={goToPackages}>
                  Vezi pachetele
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
                <button type="button" className="offer-pop-later" onClick={close}>
                  Am înțeles
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
