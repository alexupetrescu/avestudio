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
            setProgress(100);
            setTimeout(() => setProgress(0), 300);
            return;
        }

        let currentProgress = 0;
        const interval = setInterval(() => {
            if (currentProgress < 90) {
                currentProgress += Math.random() * 15;
            } else if (currentProgress < 95) {
                currentProgress += Math.random() * 3;
            } else {
                currentProgress += Math.random() * 0.5;
            }

            currentProgress = Math.min(currentProgress, 95);
            setProgress(currentProgress);
        }, 200);

        return () => clearInterval(interval);
    }, [isLoading]);

    if (!isLoading && progress === 0) return null;

    return (
        <div className={`w-full h-0.5 bg-black/5 overflow-hidden rounded-full ${className}`}>
            <div
                className="h-full bg-black/40 rounded-full"
                style={{
                    width: `${progress}%`,
                    transition: isLoading ? 'width 0.2s ease-out' : 'width 0.3s ease-out',
                }}
            />
        </div>
    );
}
