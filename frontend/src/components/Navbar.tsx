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

    const isActive = (path: string) => pathname === path;
    const isHomePage = pathname === '/';
    
    // On home page: dynamic behavior based on scroll
    // On other pages: always show constant menu
    const showLogo = isHomePage ? scrolled : true;
    const navBg = isHomePage 
        ? (scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-black/5' : 'bg-transparent')
        : 'bg-white/80 backdrop-blur-xl border-b border-black/5';
    const textColor = isHomePage 
        ? (scrolled ? 'text-black' : 'text-white')
        : 'text-black';

    return (
        <nav className={`fixed w-full z-50 transition-all duration-300 ${navBg}`}>
            <div className="max-w-7xl mx-auto px-8 lg:px-16">
                <div className="flex items-center justify-between h-20">
                    {/* Logo - Hidden when not scrolled on home page, always visible on other pages */}
                    {showLogo && (
                        <Link 
                            href="/" 
                            className="hover:opacity-70 transition-opacity duration-300"
                        >
                            <Image
                                src="/logo/avephotostudio.svg"
                                alt="AveStudio"
                                width={300}
                                height={80}
                                className="h-16 w-auto"
                                priority
                            />
                        </Link>
                    )}
                    
                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-12">
                        <Link 
                            href="/" 
                            className={`text-sm font-medium transition-colors duration-300 ${
                                isHomePage
                                    ? (scrolled
                                        ? (isActive('/') ? 'text-black' : 'text-black/60 hover:text-black')
                                        : (isActive('/') ? 'text-white' : 'text-white/80 hover:text-white'))
                                    : (isActive('/') ? 'text-black' : 'text-black/60 hover:text-black')
                            }`}
                        >
                            Acasă
                        </Link>
                        <Link 
                            href="/portfolio" 
                            className={`text-sm font-medium transition-colors duration-300 ${
                                isHomePage
                                    ? (scrolled
                                        ? (isActive('/portfolio') ? 'text-black' : 'text-black/60 hover:text-black')
                                        : (isActive('/portfolio') ? 'text-white' : 'text-white/80 hover:text-white'))
                                    : (isActive('/portfolio') ? 'text-black' : 'text-black/60 hover:text-black')
                            }`}
                        >
                            Portofoliu
                        </Link>
                        {/* Hidden from menu - but page still accessible */}
                        {/* <Link 
                            href="/albums" 
                            className={`text-sm font-medium transition-colors duration-300 ${
                                isActive('/albums') 
                                    ? 'text-black' 
                                    : 'text-black/60 hover:text-black'
                            }`}
                        >
                            Albume
                        </Link>
                        <Link 
                            href="/client" 
                            className="text-sm font-medium text-black/60 hover:text-black transition-colors duration-300"
                        >
                            Client
                        </Link> */}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className={`md:hidden focus:outline-none transition-colors duration-300 ${
                            isHomePage ? (scrolled ? 'text-black' : 'text-white') : 'text-black'
                        }`}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Comutare meniu"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            {isMenuOpen ? (
                                <path d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className={`md:hidden py-6 border-t animate-fade-in ${
                        isHomePage ? (scrolled ? 'border-black/10' : 'border-white/20') : 'border-black/10'
                    }`}>
                        <div className="flex flex-col space-y-4">
                            <Link 
                                href="/" 
                                className={`text-sm font-medium transition-colors ${
                                    isHomePage
                                        ? (scrolled
                                            ? (isActive('/') ? 'text-black' : 'text-black/60')
                                            : (isActive('/') ? 'text-white' : 'text-white/80'))
                                        : (isActive('/') ? 'text-black' : 'text-black/60')
                                }`}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Acasă
                            </Link>
                            <Link 
                                href="/portfolio" 
                                className={`text-sm font-medium transition-colors ${
                                    isHomePage
                                        ? (scrolled
                                            ? (isActive('/portfolio') ? 'text-black' : 'text-black/60')
                                            : (isActive('/portfolio') ? 'text-white' : 'text-white/80'))
                                        : (isActive('/portfolio') ? 'text-black' : 'text-black/60')
                                }`}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Portofoliu
                            </Link>
                            {/* Hidden from menu - but page still accessible */}
                            {/* <Link 
                                href="/albums" 
                                className={`text-sm font-medium transition-colors ${
                                    isActive('/albums') ? 'text-black' : 'text-black/60'
                                }`}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Albume
                            </Link>
                            <Link 
                                href="/client" 
                                className="text-sm font-medium text-black/60"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Client
                            </Link> */}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
