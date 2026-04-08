import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/avephoto.studio/';
    const facebookUrl = process.env.NEXT_PUBLIC_FACEBOOK_URL || 'https://www.facebook.com/profile.php?id=61578330532230';
    const adinaName = process.env.NEXT_PUBLIC_CONTACT_ADINA_NAME || 'Adina';
    const adinaPhone = process.env.NEXT_PUBLIC_CONTACT_ADINA_PHONE || '0746986415';
    const adinaEmail = process.env.NEXT_PUBLIC_CONTACT_ADINA_EMAIL || 'adina@aveletter.ro';
    const alexName = process.env.NEXT_PUBLIC_CONTACT_ALEX_NAME || 'Alex';
    const alexPhone = process.env.NEXT_PUBLIC_CONTACT_ALEX_PHONE || '0756538455';
    const alexEmail = process.env.NEXT_PUBLIC_CONTACT_ALEX_EMAIL || 'alexupetrescu@pm.me';

    return (
        <footer className="bg-white relative">
            <div className="luxury-separator" />

            <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-20 pb-12">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 mb-16">
                    {/* Brand */}
                    <div className="md:col-span-5">
                        <div className="mb-6">
                            <Image
                                src="/logo/avephotostudio.svg"
                                alt="AVE Studio"
                                width={140}
                                height={36}
                                className="h-8 w-auto"
                            />
                        </div>
                        <p className="text-black/40 text-sm leading-relaxed max-w-sm mb-8" style={{ fontFamily: 'var(--font-body)' }}>
                            Momente prețioase ale vieții capturate cu artă și precizie.
                            Fotografie profesională pentru familii.
                        </p>
                        <div className="flex gap-4">
                            <a
                                href={instagramUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center text-black/30 hover:text-black hover:border-black/30 transition-all duration-500"
                                aria-label="Instagram"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                </svg>
                            </a>
                            <a
                                href={facebookUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center text-black/30 hover:text-black hover:border-black/30 transition-all duration-500"
                                aria-label="Facebook"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="md:col-span-3">
                        <h4 className="text-[11px] font-semibold tracking-[0.15em] uppercase text-black/30 mb-6">
                            Navigare
                        </h4>
                        <ul className="space-y-4">
                            <li>
                                <Link href="/" className="text-black/50 hover:text-black transition-colors duration-500 text-sm">
                                    Acasă
                                </Link>
                            </li>
                            <li>
                                <Link href="/portfolio" className="text-black/50 hover:text-black transition-colors duration-500 text-sm">
                                    Portofoliu
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="md:col-span-4">
                        <h4 className="text-[11px] font-semibold tracking-[0.15em] uppercase text-black/30 mb-6">
                            Contact
                        </h4>
                        <div className="space-y-5">
                            <div>
                                <p className="text-sm font-medium text-black mb-1">{adinaName}</p>
                                <a href={`tel:${adinaPhone}`} className="text-black/40 hover:text-black transition-colors duration-500 text-sm block">{adinaPhone}</a>
                                <a href={`mailto:${adinaEmail}`} className="text-black/40 hover:text-black transition-colors duration-500 text-sm block">{adinaEmail}</a>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-black mb-1">{alexName}</p>
                                <a href={`tel:${alexPhone}`} className="text-black/40 hover:text-black transition-colors duration-500 text-sm block">{alexPhone}</a>
                                <a href={`mailto:${alexEmail}`} className="text-black/40 hover:text-black transition-colors duration-500 text-sm block">{alexEmail}</a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom */}
                <div className="luxury-separator" />
                <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-black/25 text-xs tracking-wide">
                        &copy; {currentYear} AVE Studio. Toate drepturile rezervate.
                    </p>
                    <div className="flex gap-8 text-xs">
                        <Link href="/politica-de-confidentialitate" className="text-black/25 hover:text-black/60 transition-colors duration-500">
                            Confidențialitate
                        </Link>
                        <Link href="/termeni-si-conditii" className="text-black/25 hover:text-black/60 transition-colors duration-500">
                            Termeni
                        </Link>
                        <Link href="/politica-de-cookies" className="text-black/25 hover:text-black/60 transition-colors duration-500">
                            Cookie-uri
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
