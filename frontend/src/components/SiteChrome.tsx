'use client';

import { usePathname } from 'next/navigation';
import type { CSSProperties } from 'react';
import TeamBar, { useTeamSession } from './TeamBar';
import Navbar from './Navbar';
import Footer from './Footer';
import CookieConsent from './CookieConsent';
import GoogleAnalytics from './GoogleAnalytics';

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useTeamSession();
  const showTeamBar = !!user && (user.can_admin || user.can_crm);
  const isCrm = pathname === '/crm' || pathname.startsWith('/crm/');
  return <div className="site-frame" style={{ '--team-bar-height': showTeamBar ? '44px' : '0px' } as CSSProperties}>
    {showTeamBar && <TeamBar user={user} />}
    {isCrm ? children : <>
    <GoogleAnalytics />
    <Navbar />
    <main className="flex-grow">{children}</main>
    <Footer />
    <CookieConsent />
    </>}
  </div>;
}
