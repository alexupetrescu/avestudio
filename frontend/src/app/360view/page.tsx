'use client';

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

export default function Panorama360Page() {
  return (
    <div className="min-h-screen bg-white">
      <PanoramaViewer imageSrc="/360s/DSC07454-Panorama.jpg" />
    </div>
  );
}
