import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
    const currentYear = new Date().getFullYear();
    
    // Get values from environment variables with fallbacks
    const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/avephoto.studio/';
    const facebookUrl = process.env.NEXT_PUBLIC_FACEBOOK_URL || 'https://www.facebook.com/profile.php?id=61578330532230';
    const adinaName = process.env.NEXT_PUBLIC_CONTACT_ADINA_NAME || 'Adina';
    const adinaPhone = process.env.NEXT_PUBLIC_CONTACT_ADINA_PHONE || '0746986415';
    const adinaEmail = process.env.NEXT_PUBLIC_CONTACT_ADINA_EMAIL || 'adina@aveletter.ro';
    const alexName = process.env.NEXT_PUBLIC_CONTACT_ALEX_NAME || 'Alex';
    const alexPhone = process.env.NEXT_PUBLIC_CONTACT_ALEX_PHONE || '0756538455';
    const alexEmail = process.env.NEXT_PUBLIC_CONTACT_ALEX_EMAIL || 'alexupetrescu@pm.me';

    return (
        <footer className="bg-white border-t border-black/10 relative">
            <div className="max-w-7xl mx-auto px-8 lg:px-16 py-16">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    {/* Brand Section */}
                    <div className="md:col-span-2">
                        <div className="mb-4 transform hover:scale-105 transition-transform duration-300 inline-block">
                            <Image
                                src="/logo/avephotostudio.svg"
                                alt="AveStudio"
                                width={150}
                                height={40}
                                className="h-8 w-auto"
                            />
                        </div>
                        <p className="text-black/60 text-sm leading-relaxed max-w-md mb-6">
                           Momente prețioase ale vieții cu artă și precizie.
                        </p>
                        <div className="flex space-x-4">
                            <a 
                                href={instagramUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-black/40 hover:text-black transition-all duration-300 transform hover:scale-110 hover:-translate-y-1"
                                aria-label="Instagram"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                </svg>
                            </a>
                            <a 
                                href={facebookUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-black/40 hover:text-black transition-all duration-300 transform hover:scale-110 hover:-translate-y-1"
                                aria-label="Facebook"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-black font-semibold text-sm mb-4">
                            Navigare
                        </h4>
                        <ul className="space-y-3">
                            <li>
                                <Link href="/" className="text-black/60 hover:text-black transition-all duration-300 text-sm inline-block transform hover:translate-x-1">
                                    Acasă
                                </Link>
                            </li>
                            <li>
                                <Link href="/portfolio" className="text-black/60 hover:text-black transition-all duration-300 text-sm inline-block transform hover:translate-x-1">
                                    Portofoliu
                                </Link>
                            </li>
                            {/* Hidden from menu - but page still accessible */}
                            {/* <li>
                                <Link href="/albums" className="text-black/60 hover:text-black transition-colors duration-300 text-sm">
                                    Albume
                                </Link>
                            </li>
                            <li>
                                <Link href="/client" className="text-black/60 hover:text-black transition-colors duration-300 text-sm">
                                    Acces Client
                                </Link>
                            </li> */}
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="text-black font-semibold text-sm mb-4">
                            Contact
                        </h4>
                        <div className="space-y-4 text-black/60 text-sm">
                            <div className="group">
                                <p className="font-semibold text-black mb-1">{adinaName}</p>
                                <a href={`tel:${adinaPhone}`} className="hover:text-black transition-all duration-300 block transform hover:translate-x-1">{adinaPhone}</a>
                                <a href={`mailto:${adinaEmail}`} className="hover:text-black transition-all duration-300 block transform hover:translate-x-1">{adinaEmail}</a>
                            </div>
                            <div className="group">
                                <p className="font-semibold text-black mb-1">{alexName}</p>
                                <a href={`tel:${alexPhone}`} className="hover:text-black transition-all duration-300 block transform hover:translate-x-1">{alexPhone}</a>
                                <a href={`mailto:${alexEmail}`} className="hover:text-black transition-all duration-300 block transform hover:translate-x-1">{alexEmail}</a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-black/10 pt-8">
                    <div className="flex flex-col md:flex-row justify-between items-center text-sm text-black/40">
                        <p className="mb-4 md:mb-0">
                            &copy; {currentYear} AveStudio. Toate drepturile rezervate.
                        </p>
                        <div className="flex space-x-6 text-xs">
                            <a href="#" className="hover:text-black transition-all duration-300 transform hover:translate-y-[-2px]">Confidențialitate</a>
                            <a href="#" className="hover:text-black transition-all duration-300 transform hover:translate-y-[-2px]">Termeni</a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
