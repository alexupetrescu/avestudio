'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
import CookieConsent from './CookieConsent';
import GoogleAnalytics from './GoogleAnalytics';

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/crm' || pathname.startsWith('/crm/')) return <>{children}</>;
  return <>
    <GoogleAnalytics />
    <Navbar />
    <main className="flex-grow">{children}</main>
    <Footer />
    <CookieConsent />
  </>;
}
