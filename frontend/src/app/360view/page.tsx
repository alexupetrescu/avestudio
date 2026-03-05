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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black/60 text-lg">Se încarcă...</div>
      </div>
    );
  }

  if (tours.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-semibold text-black/80 mb-4">
          Nu există tururi 360° disponibile
        </h1>
        <p className="text-black/60 text-center max-w-md">
          Adăugați foldere în <code className="bg-black/5 px-2 py-1 rounded">public/360s/</code> cu imagini în formatul <code className="bg-black/5 px-2 py-1 rounded">nume-001.jpeg</code>, <code className="bg-black/5 px-2 py-1 rounded">nume-002.jpeg</code>, etc.
        </p>
      </div>
    );
  }

  if (tours.length === 1) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black/60 text-lg">Redirecționare...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-3xl font-semibold text-black/90 mb-8 text-center">
        Tururi 360°
      </h1>
      <div className="max-w-4xl mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tours.map((tour) => (
          <Link
            key={tour.slug}
            href={`/360view/${tour.slug}`}
            className="block p-6 bg-black/5 hover:bg-black/10 rounded-xl transition-colors border border-black/5"
          >
            <h2 className="text-xl font-medium text-black/90 capitalize">
              {tour.slug.replace(/-/g, ' ')}
            </h2>
            <p className="mt-2 text-black/60 text-sm">
              {tour.images.length} panorame
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
