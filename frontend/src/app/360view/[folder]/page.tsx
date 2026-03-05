'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const PanoramaViewer = dynamic(
  () => import('@/components/PanoramaViewer'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-screen min-h-[100dvh] flex items-center justify-center bg-black/5">
        <div className="text-black/60 text-lg">Se încarcă...</div>
      </div>
    ),
  }
);

interface Tour {
  slug: string;
  images: string[];
}

export default function Panorama360FolderPage() {
  const params = useParams();
  const folder = params.folder as string;
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch('/api/360-tours')
      .then((res) => res.json())
      .then((data: { tours: Tour[] }) => {
        const found = (data.tours || []).find((t) => t.slug === folder);
        setTour(found || null);
        setNotFound(!found);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [folder]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black/60 text-lg">Se încarcă...</div>
      </div>
    );
  }

  if (notFound || !tour) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-semibold text-black/80 mb-4">
          Tur negăsit
        </h1>
        <a
          href="/360view"
          className="text-black/70 hover:text-black underline"
        >
          Înapoi la lista de tururi
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <PanoramaViewer images={tour.images} />
    </div>
  );
}
