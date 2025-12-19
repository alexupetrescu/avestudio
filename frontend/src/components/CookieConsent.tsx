'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Show banner after a short delay for better UX
      setTimeout(() => setShowBanner(true), 500);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      necessary: true,
      analytics: true,
      marketing: false,
      timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
    // Trigger custom event for Google Analytics initialization
    window.dispatchEvent(new Event('cookie-consent-updated'));
  };

  const acceptNecessary = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
    window.dispatchEvent(new Event('cookie-consent-updated'));
  };

  const savePreferences = () => {
    const necessary = true; // Always true
    const analytics = (document.getElementById('analytics-cookies') as HTMLInputElement)?.checked || false;
    const marketing = (document.getElementById('marketing-cookies') as HTMLInputElement)?.checked || false;

    localStorage.setItem('cookie-consent', JSON.stringify({
      necessary,
      analytics,
      marketing,
      timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
    setShowSettings(false);
    window.dispatchEvent(new Event('cookie-consent-updated'));
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-black shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-black mb-2">
                Utilizăm cookie-uri
              </h3>
              <p className="text-sm text-black/70 leading-relaxed">
                Utilizăm cookie-uri pentru a îmbunătăți experiența dumneavoastră, pentru a analiza traficul site-ului și pentru a personaliza conținutul. 
                Continuând să navigați pe site, sunteți de acord cu{' '}
                <Link href="/politica-de-cookies" className="underline hover:text-black">
                  utilizarea cookie-urilor
                </Link>
                {' '}și cu{' '}
                <Link href="/politica-de-confidentialitate" className="underline hover:text-black">
                  politica noastră de confidențialitate
                </Link>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={openSettings}
                className="px-6 py-2.5 text-sm font-medium text-black border-2 border-black hover:bg-black hover:text-white transition-all duration-300 whitespace-nowrap"
              >
                Setări
              </button>
              <button
                onClick={acceptNecessary}
                className="px-6 py-2.5 text-sm font-medium text-black/60 hover:text-black border-2 border-black/20 hover:border-black transition-all duration-300 whitespace-nowrap"
              >
                Doar necesare
              </button>
              <button
                onClick={acceptAll}
                className="px-6 py-2.5 text-sm font-medium text-white bg-black hover:bg-black/90 transition-all duration-300 whitespace-nowrap"
              >
                Accept toate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cookie Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 lg:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-black">
                  Setări cookie-uri
                </h2>
                <button
                  onClick={closeSettings}
                  className="text-black/60 hover:text-black transition-colors"
                  aria-label="Închide"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-black/70 mb-6">
                Puteți alege ce tipuri de cookie-uri să acceptăm. Cookie-urile necesare sunt întotdeauna active pentru funcționarea site-ului.
                Pentru mai multe informații, consultați{' '}
                <Link href="/politica-de-cookies" className="underline hover:text-black">
                  politica noastră de cookie-uri
                </Link>.
              </p>

              <div className="space-y-6">
                {/* Necessary Cookies */}
                <div className="border-b border-black/10 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-black mb-1">
                        Cookie-uri necesare
                      </h3>
                      <p className="text-sm text-black/60">
                        Aceste cookie-uri sunt esențiale pentru funcționarea site-ului și nu pot fi dezactivate.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked
                      disabled
                      className="w-5 h-5 mt-1"
                    />
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="border-b border-black/10 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-black mb-1">
                        Cookie-uri de analiză
                      </h3>
                      <p className="text-sm text-black/60 mb-2">
                        Aceste cookie-uri ne ajută să înțelegem cum vizitatorii interacționează cu site-ul nostru prin colectarea și raportarea informațiilor anonime. 
                        Utilizăm Google Analytics pentru a analiza traficul site-ului.
                      </p>
                    </div>
                    <input
                      id="analytics-cookies"
                      type="checkbox"
                      defaultChecked
                      className="w-5 h-5 mt-1"
                    />
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-black mb-1">
                        Cookie-uri de marketing
                      </h3>
                      <p className="text-sm text-black/60">
                        Aceste cookie-uri sunt folosite pentru a vă oferi conținut relevant și personalizat. 
                        Momentan nu utilizăm cookie-uri de marketing.
                      </p>
                    </div>
                    <input
                      id="marketing-cookies"
                      type="checkbox"
                      disabled
                      className="w-5 h-5 mt-1 opacity-50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <button
                  onClick={savePreferences}
                  className="flex-1 px-6 py-3 text-sm font-medium text-white bg-black hover:bg-black/90 transition-all duration-300"
                >
                  Salvează preferințele
                </button>
                <button
                  onClick={closeSettings}
                  className="px-6 py-3 text-sm font-medium text-black border-2 border-black hover:bg-black hover:text-white transition-all duration-300"
                >
                  Anulează
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



