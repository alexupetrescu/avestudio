'use client';

import { Suspense, useRef, useState, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import { XR, createXRStore } from '@react-three/xr';
import * as THREE from 'three';
import LoadingSpinner from './LoadingSpinner';

function PanoramaSphere({ imageSrc }: { imageSrc: string }) {
  const texture = useTexture(imageSrc);
  texture.mapping = THREE.EquirectangularReflectionMapping;

  return (
    <mesh scale={[-500, 500, 500]}>
      <sphereGeometry args={[1, 60, 40]} />
      <meshBasicMaterial side={THREE.BackSide} map={texture} />
    </mesh>
  );
}

function PanoramaScene({ imageSrc }: { imageSrc: string }) {
  return (
    <>
      <PanoramaSphere key={imageSrc} imageSrc={imageSrc} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
      />
    </>
  );
}

interface PanoramaViewerProps {
  images?: string[];
  imageSrc?: string;
}

export default function PanoramaViewer({
  images,
  imageSrc,
}: PanoramaViewerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [overlayEl, setOverlayEl] = useState<HTMLDivElement | null>(null);

  const store = useMemo(
    () =>
      createXRStore({
        // Pass overlay root for VR DOM overlay (WebXR dom-overlay feature)
        domOverlay: overlayEl ? { root: overlayEl } : true,
      } as Parameters<typeof createXRStore>[0]),
    [overlayEl]
  );

  const imageList =
    images && images.length > 0
      ? images
      : imageSrc
        ? [imageSrc]
        : ['/360s/DSC07454-Panorama.jpg'];

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentImage = imageList[currentIndex];
  const hasMultiple = imageList.length > 1;

  const goBack = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const goForward = useCallback(() => {
    setCurrentIndex((i) =>
      Math.min(imageList.length - 1, i + 1)
    );
  }, [imageList.length]);

  const overlayRefCallback = useCallback((el: HTMLDivElement | null) => {
    overlayRef.current = el;
    setOverlayEl(el);
  }, []);

  return (
    <div className="relative w-full h-screen min-h-[100dvh]">
      <div
        ref={overlayRefCallback}
        className="absolute inset-0 pointer-events-none z-50"
      >
        <button
          onClick={() => store.enterVR()}
          className="absolute top-4 right-4 px-4 py-2 bg-black/80 text-white rounded-lg hover:bg-black/90 transition-colors text-sm font-medium pointer-events-auto"
        >
          Enter VR
        </button>
        {hasMultiple && (
          <>
            <button
              onClick={goBack}
              disabled={currentIndex === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-black/80 text-white rounded-lg hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium pointer-events-auto"
            >
              Înapoi
            </button>
            <button
              onClick={goForward}
              disabled={currentIndex === imageList.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-black/80 text-white rounded-lg hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium pointer-events-auto"
            >
              Înainte
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 text-white rounded-lg text-sm">
              {currentIndex + 1} / {imageList.length}
            </div>
          </>
        )}
      </div>
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-black/5">
            <LoadingSpinner size="lg" className="text-black/60" />
          </div>
        }
      >
        <Canvas
          gl={{ antialias: true }}
          camera={{ position: [0, 0, 0.1], fov: 75 }}
          dpr={[1, 2]}
        >
          <XR store={store}>
            <PanoramaScene imageSrc={currentImage} />
          </XR>
        </Canvas>
      </Suspense>
    </div>
  );
}
