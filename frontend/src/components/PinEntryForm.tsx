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
        <div className="w-full max-w-md p-12 bg-white border border-black/10">
            <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                    <label htmlFor="pin" className="block text-sm font-medium text-black mb-4">
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
                        className="w-full px-6 py-4 bg-gray-50 border border-black/10 text-black text-center text-3xl tracking-[0.5em] focus:outline-none focus:border-black transition-colors duration-300 font-medium"
                        placeholder="0000"
                        required
                    />
                </div>

                {error && (
                    <div className="text-red-600 text-sm text-center bg-red-50 py-4 border border-red-200">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Se verifică...' : 'Accesează Albumul'}
                </button>
            </form>
        </div>
    );
}
