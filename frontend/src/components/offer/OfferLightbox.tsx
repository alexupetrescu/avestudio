'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/captions.css';

export interface OfferSlide {
  src: string;
  width: number;
  height: number;
  title?: string;
  description?: string;
}

const OpenContext = createContext<((index: number) => void) | null>(null);

/** Holds one lightbox for a set of product images; triggers inside open it at their slide. */
export function LightboxGroup({ slides, children }: { slides: OfferSlide[]; children: React.ReactNode }) {
  const [index, setIndex] = useState(-1);
  const open = useCallback((i: number) => setIndex(i), []);
  const lbSlides = useMemo(
    () => slides.map((s) => ({ src: s.src, width: s.width, height: s.height, alt: s.title, title: s.title, description: s.description })),
    [slides],
  );

  return (
    <OpenContext.Provider value={open}>
      {children}
      <Lightbox
        open={index >= 0}
        index={Math.max(index, 0)}
        close={() => setIndex(-1)}
        slides={lbSlides}
        plugins={[Captions, Zoom]}
        captions={{ descriptionTextAlign: 'center' }}
        zoom={{ maxZoomPixelRatio: 2 }}
        carousel={{ finite: slides.length < 3, padding: 56 }}
        controller={{ closeOnBackdropClick: true }}
        className="offer-lb"
        styles={{ container: { backgroundColor: 'rgba(21, 41, 31, 0.96)' } }}
      />
    </OpenContext.Provider>
  );
}

export function LightboxTrigger({
  index,
  label,
  className = '',
  children,
}: {
  index: number;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const open = useContext(OpenContext);
  return (
    <button
      type="button"
      className={`offer-zoom ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        open?.(index);
      }}
      aria-label={`Mărește: ${label}`}
    >
      {children}
      <span className="offer-zoom-hint" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5M11 8.5v5M8.5 11h5" />
        </svg>
      </span>
    </button>
  );
}
