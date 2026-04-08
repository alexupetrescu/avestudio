'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Tour {
  slug: string;
  images: string[];
}

export default function Panorama360Page() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/360-tours')
      .then((res) => res.json())
      .then((data: { tours: Tour[] }) => {
        setTours(data.tours || []);
        setLoading(false);
      })
      .catch(() => {
        setTours([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!loading && tours.length === 1) {
      router.replace(`/360view/${tours[0].slug}`);
    }
  }, [loading, tours, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-[softPulse_1.4s_ease-in-out_infinite]" />
          <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-[softPulse_1.4s_ease-in-out_0.2s_infinite]" />
          <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-[softPulse_1.4s_ease-in-out_0.4s_infinite]" />
        </div>
      </div>
    );
  }

  if (tours.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-6">
        <h1 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
          Nu există tururi 360° disponibile
        </h1>
        <p className="text-sm text-black/40 text-center max-w-md">
          Adăugați foldere în <code className="bg-black/5 px-2 py-0.5 rounded-md text-xs">public/360s/</code> cu
          imagini panoramice.
        </p>
      </div>
    );
  }

  if (tours.length === 1) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <p className="text-sm text-black/40">Redirecționare...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pt-36 pb-20 px-6 lg:px-12">
      <div className="max-w-4xl mx-auto">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-black/30 mb-4">Experiență</p>
        <h1 className="text-3xl md:text-4xl font-semibold text-black mb-8 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
          Tururi 360°
        </h1>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour) => (
            <Link
              key={tour.slug}
              href={`/360view/${tour.slug}`}
              className="group block p-6 bg-white rounded-[var(--radius-lg)] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] transition-all duration-500 hover:-translate-y-1"
            >
              <h2 className="text-lg font-medium text-black capitalize" style={{ fontFamily: 'var(--font-heading)' }}>
                {tour.slug.replace(/-/g, ' ')}
              </h2>
              <p className="mt-2 text-black/40 text-sm">
                {tour.images.length} panorame
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
