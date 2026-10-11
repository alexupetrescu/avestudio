'use client';

import { useEffect, useState } from 'react';

interface PinGateProps {
    /** localStorage key under which a verified PIN is remembered */
    storageKey: string;
    /** Returns true when the PIN is accepted by the backend */
    verify: (pin: string) => Promise<boolean>;
    /** Called once with the accepted PIN */
    onUnlocked: (pin: string) => void;
    eyebrow: string;
    title: string;
    hint: string;
    /** 'xmas' renders the green/gold Christmas treatment, default is the black-and-white site look */
    theme?: 'default' | 'xmas';
    children?: React.ReactNode;
}

/**
 * PIN screen shared by the teacher order form and the child album.
 * Renders `children` once unlocked.
 */
export default function PinGate({ storageKey, verify, onUnlocked, eyebrow, title, hint, theme = 'default', children }: PinGateProps) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [checking, setChecking] = useState(true);
    const [unlocked, setUnlocked] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let stored: string | null = null;
        try {
            stored = localStorage.getItem(storageKey);
        } catch {
            stored = null;
        }
        if (!stored) {
            setChecking(false);
            return;
        }
        verify(stored)
            .then((ok) => {
                if (cancelled) return;
                if (ok) {
                    setUnlocked(true);
                    onUnlocked(stored as string);
                } else {
                    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
                }
            })
            .catch(() => {
                try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
            })
            .finally(() => { if (!cancelled) setChecking(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storageKey]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const ok = await verify(pin);
            if (!ok) {
                setError('PIN invalid');
                return;
            }
            try { localStorage.setItem(storageKey, pin); } catch { /* ignore */ }
            setUnlocked(true);
            onUnlocked(pin);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'PIN invalid');
        }
    };

    if (unlocked) return <>{children}</>;

    const xmas = theme === 'xmas';
    const wrapClass = xmas ? 'xmas' : 'bg-[var(--background)]';
    const eyebrowStyle = xmas ? { color: 'var(--xmas-burgundy)' } : undefined;
    const titleStyle = { fontFamily: 'var(--font-heading)', color: xmas ? 'var(--xmas-green)' : undefined };

    if (checking) {
        return (
            <div className={`min-h-screen ${wrapClass} flex items-center justify-center`}>
                <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-[softPulse_1.4s_ease-in-out_infinite]" />
                    <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-[softPulse_1.4s_ease-in-out_0.2s_infinite]" />
                    <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-[softPulse_1.4s_ease-in-out_0.4s_infinite]" />
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${wrapClass} flex items-center justify-center px-6 py-32`}>
            <div className="w-full max-w-md text-center animate-fade-in-up" style={{ animationFillMode: 'both' }}>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-black/30 mb-4" style={eyebrowStyle}>
                    {eyebrow}
                </p>
                <h2 className="text-3xl md:text-4xl font-semibold text-black mb-4 tracking-tight" style={titleStyle}>
                    {title}
                </h2>
                {xmas ? <div className="xmas-rule max-w-[120px] mx-auto mb-6" /> : <div className="luxury-line mx-auto mb-6" />}
                <p className="text-sm text-black/40 mb-10">{hint}</p>

                <div className={`w-full p-8 md:p-10 ${xmas ? 'xmas-card' : 'bg-white rounded-[var(--radius-xl)] shadow-[var(--card-shadow-lg)]'}`}>
                    <form onSubmit={submit} className="space-y-6">
                        <div>
                            <label htmlFor="pin" className="block text-sm font-medium text-black/40 mb-3">
                                PIN de 4 cifre
                            </label>
                            <input
                                type="tel"
                                inputMode="numeric"
                                id="pin"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                maxLength={4}
                                className="w-full px-6 py-5 bg-[var(--muted)] border border-black/[0.06] text-black text-center text-3xl tracking-[0.5em] rounded-[var(--radius-md)] focus:outline-none focus:border-black/20 transition-colors duration-500 font-medium"
                                placeholder="0000"
                                autoFocus
                                required
                            />
                        </div>
                        {error && (
                            <div className="text-red-500/80 text-sm text-center bg-red-50 py-3 rounded-[var(--radius-sm)] border border-red-100">
                                {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={pin.length < 4}
                            className={xmas
                                ? 'xmas-btn w-full py-4'
                                : 'w-full py-4 bg-[var(--accent)] text-white text-sm font-medium tracking-[0.03em] rounded-full hover:bg-[#333] transition-all duration-500 disabled:opacity-40'}
                        >
                            Accesează
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
