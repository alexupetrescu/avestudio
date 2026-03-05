'use client';

import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import { XR, createXRStore } from '@react-three/xr';
import * as THREE from 'three';
import LoadingSpinner from './LoadingSpinner';

const store = createXRStore();

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
      <PanoramaSphere imageSrc={imageSrc} />
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
  imageSrc?: string;
}

export default function PanoramaViewer({
  imageSrc = '/360s/DSC07454-Panorama.jpg',
}: PanoramaViewerProps) {
  return (
    <div className="relative w-full h-screen min-h-[100dvh]">
      <button
        onClick={() => store.enterVR()}
        className="absolute top-4 right-4 z-10 px-4 py-2 bg-black/80 text-white rounded-lg hover:bg-black/90 transition-colors text-sm font-medium"
      >
        Enter VR
      </button>
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
            <PanoramaScene imageSrc={imageSrc} />
          </XR>
        </Canvas>
      </Suspense>
    </div>
  );
}
