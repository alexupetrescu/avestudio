'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMenuOpen]);

    const isActive = (path: string) => pathname === path;
    const isHomePage = pathname === '/';

    const showLogo = isHomePage ? scrolled : true;
    const navBg = isHomePage
        ? (scrolled ? 'bg-white/90 backdrop-blur-xl shadow-[0_1px_20px_rgba(0,0,0,0.04)]' : 'bg-transparent')
        : 'bg-white/90 backdrop-blur-xl shadow-[0_1px_20px_rgba(0,0,0,0.04)]';
    const textColor = isHomePage
        ? (scrolled ? 'text-black' : 'text-white')
        : 'text-black';

    const getLinkClass = (path: string) => {
        const active = isActive(path);
        if (isHomePage && !scrolled) {
            return active ? 'text-white' : 'text-white/70 hover:text-white';
        }
        return active ? 'text-black' : 'text-black/50 hover:text-black';
    };

    return (
        <>
            <nav className={`fixed w-full z-50 transition-all duration-700 ease-[var(--ease-luxury)] ${navBg}`}>
                <div className="max-w-7xl mx-auto px-6 lg:px-12">
                    <div className="flex items-center justify-between h-20">
                        <div className="w-[180px]">
                            {showLogo && (
                                <Link
                                    href="/"
                                    className="inline-block transition-all duration-500 hover:opacity-70"
                                >
                                    <Image
                                        src="/logo/avephotostudio.svg"
                                        alt="AVE Studio"
                                        width={180}
                                        height={48}
                                        className={`h-10 w-auto transition-all duration-500 ${
                                            isHomePage && !scrolled ? 'brightness-0 invert' : ''
                                        }`}
                                        priority
                                    />
                                </Link>
                            )}
                        </div>

                        <div className="hidden md:flex items-center gap-10">
                            <Link
                                href="/"
                                className={`text-[13px] font-medium tracking-[0.08em] uppercase transition-all duration-500 relative ${getLinkClass('/')}`}
                            >
                                Acasă
                                {isActive('/') && (
                                    <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-current animate-[lineGrow_0.3s_var(--ease-luxury)] origin-left" />
                                )}
                            </Link>
                            <Link
                                href="/portfolio"
                                className={`text-[13px] font-medium tracking-[0.08em] uppercase transition-all duration-500 relative ${getLinkClass('/portfolio')}`}
                            >
                                Portofoliu
                                {isActive('/portfolio') && (
                                    <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-current animate-[lineGrow_0.3s_var(--ease-luxury)] origin-left" />
                                )}
                            </Link>
                        </div>

                        <button
                            className={`md:hidden w-10 h-10 flex items-center justify-center rounded-full transition-all duration-500 ${
                                isHomePage && !scrolled
                                    ? 'text-white hover:bg-white/10'
                                    : 'text-black hover:bg-black/5'
                            }`}
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label="Comutare meniu"
                        >
                            <div className="relative w-5 h-4 flex flex-col justify-between">
                                <span className={`block w-full h-[1.5px] bg-current transition-all duration-500 origin-center ${isMenuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
                                <span className={`block w-full h-[1.5px] bg-current transition-all duration-300 ${isMenuOpen ? 'opacity-0 scale-x-0' : ''}`} />
                                <span className={`block w-full h-[1.5px] bg-current transition-all duration-500 origin-center ${isMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
                            </div>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu - Full Screen Overlay */}
            <div className={`fixed inset-0 z-[60] md:hidden transition-all duration-700 ${
                isMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
            }`}>
                <div className={`absolute inset-0 bg-white transition-opacity duration-700 ${
                    isMenuOpen ? 'opacity-100' : 'opacity-0'
                }`} />

                <div className={`relative h-full flex flex-col items-center justify-center gap-8 transition-all duration-700 ${
                    isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                    <button
                        onClick={() => setIsMenuOpen(false)}
                        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors duration-300"
                        aria-label="Închide meniu"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <Link
                        href="/"
                        className={`text-3xl font-[var(--font-heading)] tracking-tight transition-all duration-300 ${
                            isActive('/') ? 'text-black' : 'text-black/40 hover:text-black'
                        }`}
                        onClick={() => setIsMenuOpen(false)}
                        style={{ fontFamily: 'var(--font-heading)' }}
                    >
                        Acasă
                    </Link>
                    <Link
                        href="/portfolio"
                        className={`text-3xl tracking-tight transition-all duration-300 ${
                            isActive('/portfolio') ? 'text-black' : 'text-black/40 hover:text-black'
                        }`}
                        onClick={() => setIsMenuOpen(false)}
                        style={{ fontFamily: 'var(--font-heading)' }}
                    >
                        Portofoliu
                    </Link>

                    <div className="luxury-line mt-4" />

                    <div className="flex gap-6 mt-2">
                        <a
                            href={process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/avephoto.studio/'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-black/30 hover:text-black transition-colors duration-300"
                            aria-label="Instagram"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                        </a>
                        <a
                            href={process.env.NEXT_PUBLIC_FACEBOOK_URL || 'https://www.facebook.com/profile.php?id=61578330532230'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-black/30 hover:text-black transition-colors duration-300"
                            aria-label="Facebook"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}
