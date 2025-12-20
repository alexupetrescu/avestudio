'use client';

import { useEffect, useState } from 'react';

interface ProgressBarProps {
    isLoading: boolean;
    className?: string;
}

export default function ProgressBar({ isLoading, className = '' }: ProgressBarProps) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!isLoading) {
            // Complete the progress bar quickly when loading finishes
            setProgress(100);
            setTimeout(() => setProgress(0), 300);
            return;
        }

        // Simulate progress (fake progress bar)
        let currentProgress = 0;
        const interval = setInterval(() => {
            // Slow down as it approaches 90%
            if (currentProgress < 90) {
                currentProgress += Math.random() * 15;
            } else if (currentProgress < 95) {
                currentProgress += Math.random() * 3;
            } else {
                currentProgress += Math.random() * 0.5;
            }
            
            // Cap at 95% until loading actually finishes
            currentProgress = Math.min(currentProgress, 95);
            setProgress(currentProgress);
        }, 200);

        return () => clearInterval(interval);
    }, [isLoading]);

    if (!isLoading && progress === 0) return null;

    return (
        <div className={`w-full h-1 bg-gray-200 overflow-hidden ${className}`}>
            <div
                className="h-full bg-black transition-all duration-300 ease-out"
                style={{
                    width: `${progress}%`,
                    transition: isLoading ? 'width 0.2s ease-out' : 'width 0.3s ease-out',
                }}
            />
        </div>
    );
}

