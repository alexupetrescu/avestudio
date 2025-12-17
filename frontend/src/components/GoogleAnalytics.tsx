'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export default function GoogleAnalytics() {
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-VHJTMBBL43';
  const [hasConsent, setHasConsent] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Check cookie consent on mount
    const checkConsent = () => {
      if (typeof window === 'undefined') return false;
      const consent = localStorage.getItem('cookie-consent');
      if (consent) {
        try {
          const consentData = JSON.parse(consent);
          return consentData.analytics === true;
        } catch {
          return false;
        }
      }
      return false;
    };

    const consent = checkConsent();
    setHasConsent(consent);

    // Listen for consent updates
    const handleConsentUpdate = () => {
      const newConsent = checkConsent();
      setHasConsent(newConsent);
      
      if (newConsent && typeof window !== 'undefined') {
        // Initialize if scripts are already loaded
        if (scriptsLoaded && window.gtag) {
          window.gtag('consent', 'update', {
            analytics_storage: 'granted'
          });
          window.gtag('config', GA_MEASUREMENT_ID, {
            page_path: window.location.pathname,
          });
        }
      } else if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('consent', 'update', {
          analytics_storage: 'denied'
        });
      }
    };

    window.addEventListener('cookie-consent-updated', handleConsentUpdate);

    return () => {
      window.removeEventListener('cookie-consent-updated', handleConsentUpdate);
    };
  }, [GA_MEASUREMENT_ID, scriptsLoaded]);

  // Initialize gtag when scripts are loaded and consent is given
  useEffect(() => {
    if (hasConsent && scriptsLoaded && typeof window !== 'undefined') {
      if (!window.dataLayer) {
        window.dataLayer = [];
      }
      if (!window.gtag) {
        window.gtag = function() {
          window.dataLayer.push(arguments);
        };
        window.gtag('js', new Date());
      }
      window.gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: window.location.pathname,
      });
    }
  }, [hasConsent, scriptsLoaded, GA_MEASUREMENT_ID]);

  // Track page views on route changes
  useEffect(() => {
    if (hasConsent && scriptsLoaded && typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: pathname,
      });
    }
  }, [pathname, hasConsent, scriptsLoaded, GA_MEASUREMENT_ID]);

  if (!hasConsent) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        onLoad={() => setScriptsLoaded(true)}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('consent', 'default', {
              'analytics_storage': 'granted'
            });
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
        onLoad={() => setScriptsLoaded(true)}
      />
    </>
  );
}

