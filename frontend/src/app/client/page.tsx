import type { Metadata } from 'next';
import Link from 'next/link';
import { generateMetadata as generateSEOMetadata, SITE_URL } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Portal Client - AVE Studio | Acces Album Privat',
  description: 'Accesați albumul dvs. privat de fotografii de la AVE Studio. Introduceți PIN-ul furnizat pentru a vizualiza pozele dvs.',
  url: `${SITE_URL}/client`,
  type: 'website',
});

export default function ClientLoginPage() {
    return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6 py-32">
            <div className="w-full max-w-xl text-center">
                <div className="animate-fade-in-up" style={{ animationFillMode: 'both' }}>
                    <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-black/30 mb-4">
                        Portal Client
                    </p>
                    <h1
                        className="text-4xl md:text-5xl font-semibold text-black mb-6 tracking-tight"
                        style={{ fontFamily: 'var(--font-heading)' }}
                    >
                        Bun venit
                    </h1>
                    <div className="luxury-line mx-auto mb-8" />

                    <div className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                        <div className="p-6 rounded-[var(--radius-lg)] bg-white shadow-[var(--card-shadow)]">
                            <p className="text-sm font-medium text-black mb-2">Adina</p>
                            <a href="tel:0746986415" className="text-sm text-black/40 hover:text-black transition-colors duration-500 block mb-0.5">
                                0746 986 415
                            </a>
                            <a href="mailto:adina@aveletter.ro" className="text-sm text-black/40 hover:text-black transition-colors duration-500">
                                adina@aveletter.ro
                            </a>
                        </div>
                        <div className="p-6 rounded-[var(--radius-lg)] bg-white shadow-[var(--card-shadow)]">
                            <p className="text-sm font-medium text-black mb-2">Alex</p>
                            <a href="tel:0756538455" className="text-sm text-black/40 hover:text-black transition-colors duration-500 block mb-0.5">
                                0756 538 455
                            </a>
                            <a href="mailto:alexupetrescu@pm.me" className="text-sm text-black/40 hover:text-black transition-colors duration-500">
                                alexupetrescu@pm.me
                            </a>
                        </div>
                    </div>

                    <p className="text-sm text-black/40 leading-relaxed max-w-md mx-auto mb-10">
                        Vă rugăm să folosiți linkul direct furnizat pentru a accesa albumul dvs. privat.
                        Fiecare album are propriul link unic și PIN pentru acces securizat.
                    </p>

                    <Link
                        href="/portfolio"
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-[var(--accent)] text-white text-sm font-medium tracking-[0.03em] rounded-full hover:bg-[#333] transition-all duration-500"
                    >
                        Vezi Portofoliul
                    </Link>
                </div>
            </div>
        </div>
    );
}
