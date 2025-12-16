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
        <div className="min-h-screen bg-white flex items-center justify-center px-8 py-32">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-16 animate-slide-up">
                    <h1 className="text-5xl md:text-6xl font-bold text-black mb-6 tracking-tight">
                        Portal Client
                    </h1>
                    
                    {/* Contact Information */}
                    <div className="mb-12 space-y-6">
                        <div>
                            <p className="font-semibold text-black mb-2 text-lg">Adina</p>
                            <a href="tel:0746986415" className="text-black/70 hover:text-black transition-colors duration-300 block mb-1">
                                0746986415
                            </a>
                            <a href="mailto:adina@aveletter.ro" className="text-black/70 hover:text-black transition-colors duration-300">
                                adina@aveletter.ro
                            </a>
                        </div>
                        <div>
                            <p className="font-semibold text-black mb-2 text-lg">Alex</p>
                            <a href="tel:0756538455" className="text-black/70 hover:text-black transition-colors duration-300 block mb-1">
                                0756538455
                            </a>
                            <a href="mailto:alexupetrescu@pm.me" className="text-black/70 hover:text-black transition-colors duration-300">
                                alexupetrescu@pm.me
                            </a>
                        </div>
                    </div>

                    {/* Rezervă Ședința Button */}
                    <div className="mb-12">
                        <Link
                            href="/client"
                            className="inline-block px-8 py-4 bg-black text-white font-medium hover:bg-gray-800 transition-colors duration-300"
                        >
                            Rezervă Ședința
                        </Link>
                    </div>

                    <p className="text-lg text-black/60 leading-relaxed max-w-xl mx-auto">
                        Vă rugăm să folosiți linkul direct furnizat pentru a accesa albumul dvs. privat. 
                        Fiecare album are propriul link unic și PIN pentru acces securizat.
                    </p>
                </div>
            </div>
        </div>
    );
}
