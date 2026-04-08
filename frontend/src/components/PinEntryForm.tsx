'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { verifyPin } from '@/lib/api';

export default function PinEntryForm() {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await verifyPin(pin);
            router.push(`/client/${data.album_id}`);
        } catch (err: any) {
            setError(err.message || 'PIN invalid');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md p-10 md:p-12 bg-white rounded-[var(--radius-xl)] shadow-[var(--card-shadow-lg)]">
            <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                    <label htmlFor="pin" className="block text-sm font-medium text-black/50 mb-4 tracking-wide">
                        Introduceți PIN-ul de 4 cifre
                    </label>
                    <input
                        type="tel"
                        inputMode="numeric"
                        id="pin"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        maxLength={4}
                        pattern="\d{4}"
                        className="w-full px-6 py-5 bg-[var(--muted)] border border-black/[0.06] text-black text-center text-3xl tracking-[0.5em] rounded-[var(--radius-md)] focus:outline-none focus:border-black/20 focus:ring-0 transition-colors duration-500 font-medium"
                        placeholder="0000"
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
                    disabled={loading}
                    className="w-full py-4 bg-[var(--accent)] text-white text-sm font-medium tracking-[0.03em] rounded-full hover:bg-[#333] transition-all duration-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {loading ? 'Se verifică...' : 'Accesează Albumul'}
                </button>
            </form>
        </div>
    );
}
