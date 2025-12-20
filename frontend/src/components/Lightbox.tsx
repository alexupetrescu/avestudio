'use client';

import { useEffect, useState, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LightboxProps {
    images: Array<{ id: number; image: string }>;
    currentIndex: number;
    onClose: () => void;
    onNavigate: (index: number) => void;
}

export default function Lightbox({ images, currentIndex, onClose, onNavigate }: LightboxProps) {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [lastTouchDistance, setLastTouchDistance] = useState(0);
    const [isZooming, setIsZooming] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset zoom and loading state when image changes
    useEffect(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setImageLoading(true);
    }, [currentIndex]);

    // Handle touch events for pinch-to-zoom
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            setIsZooming(true);
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            setLastTouchDistance(distance);
        } else if (e.touches.length === 1 && scale > 1) {
            setIsDragging(true);
            setDragStart({
                x: e.touches[0].clientX - position.x,
                y: e.touches[0].clientY - position.y,
            });
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && isZooming) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );

            if (lastTouchDistance > 0) {
                const scaleChange = distance / lastTouchDistance;
                const newScale = Math.max(1, Math.min(5, scale * scaleChange));
                setScale(newScale);
                setLastTouchDistance(distance);
            }
        } else if (e.touches.length === 1 && isDragging && scale > 1) {
            const newX = e.touches[0].clientX - dragStart.x;
            const newY = e.touches[0].clientY - dragStart.y;
            
            // Constrain position to keep image within bounds
            if (imageRef.current && containerRef.current) {
                const imgRect = imageRef.current.getBoundingClientRect();
                const containerRect = containerRef.current.getBoundingClientRect();
                const maxX = (imgRect.width * scale - containerRect.width) / 2;
                const maxY = (imgRect.height * scale - containerRect.height) / 2;
                
                setPosition({
                    x: Math.max(-maxX, Math.min(maxX, newX)),
                    y: Math.max(-maxY, Math.min(maxY, newY)),
                });
            }
        }
    };

    const handleTouchEnd = () => {
        setIsZooming(false);
        setIsDragging(false);
        setLastTouchDistance(0);
        
        // Reset to 1 if zoomed out too much
        if (scale < 1) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        }
    };

    // Handle mouse wheel zoom
    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.max(1, Math.min(5, scale * delta));
            setScale(newScale);
            if (newScale === 1) {
                setPosition({ x: 0, y: 0 });
            }
        }
    };

    // Handle mouse drag
    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale > 1) {
            setIsDragging(true);
            setDragStart({
                x: e.clientX - position.x,
                y: e.clientY - position.y,
            });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && scale > 1) {
            const newX = e.clientX - dragStart.x;
            const newY = e.clientY - dragStart.y;
            
            if (imageRef.current && containerRef.current) {
                const imgRect = imageRef.current.getBoundingClientRect();
                const containerRect = containerRef.current.getBoundingClientRect();
                const maxX = (imgRect.width * scale - containerRect.width) / 2;
                const maxY = (imgRect.height * scale - containerRect.height) / 2;
                
                setPosition({
                    x: Math.max(-maxX, Math.min(maxX, newX)),
                    y: Math.max(-maxY, Math.min(maxY, newY)),
                });
            }
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
                onNavigate(currentIndex - 1);
            } else if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
                onNavigate(currentIndex + 1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, images.length, onClose, onNavigate]);

    const currentImage = images[currentIndex];

    if (!currentImage) return null;

    return (
        <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={(e) => {
                if (e.target === e.currentTarget && scale === 1) {
                    onClose();
                }
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors p-2"
                aria-label="Close"
            >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Navigation buttons */}
            {currentIndex > 0 && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(currentIndex - 1);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:text-gray-300 transition-colors p-2"
                    aria-label="Previous image"
                >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            )}

            {currentIndex < images.length - 1 && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(currentIndex + 1);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:text-gray-300 transition-colors p-2"
                    aria-label="Next image"
                >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            )}

            {/* Image counter */}
            <div className="absolute top-4 left-4 z-10 text-white text-sm">
                {currentIndex + 1} / {images.length}
            </div>

            {/* Image container */}
            <div
                ref={containerRef}
                className="relative w-full h-full flex items-center justify-center overflow-hidden"
                style={{ touchAction: 'none' }}
            >
                {/* Loading spinner */}
                {imageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-50">
                        <LoadingSpinner size="lg" className="text-white" />
                    </div>
                )}
                
                <img
                    ref={imageRef}
                    src={currentImage.image}
                    alt={`Image ${currentIndex + 1}`}
                    className={`max-w-full max-h-full object-contain select-none ${
                        imageLoading ? 'opacity-0' : 'opacity-100'
                    } transition-opacity duration-300`}
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transition: isDragging || isZooming ? 'none' : 'transform 0.3s ease-out',
                    }}
                    draggable={false}
                    onLoad={() => setImageLoading(false)}
                    onError={() => setImageLoading(false)}
                />
            </div>

            {/* Zoom indicator */}
            {scale > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-white text-sm bg-black/50 px-4 py-2 rounded">
                    {Math.round(scale * 100)}%
                </div>
            )}
        </div>
    );
}

