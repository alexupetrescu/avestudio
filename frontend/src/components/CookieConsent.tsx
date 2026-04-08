'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setTimeout(() => setShowBanner(true), 800);
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
    const necessary = true;
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

  if (!showBanner) return null;

  return (
    <>
      {/* Banner */}
      <div className={`fixed bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 z-50 transition-all duration-700 ${showBanner ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="max-w-3xl mx-auto bg-white rounded-[var(--radius-xl)] shadow-[var(--card-shadow-lg)] border border-black/[0.04] p-6 md:p-8">
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-base font-semibold text-black mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                Utilizăm cookie-uri
              </h3>
              <p className="text-sm text-black/40 leading-relaxed">
                Utilizăm cookie-uri pentru a îmbunătăți experiența dumneavoastră.
                Continuând, sunteți de acord cu{' '}
                <Link href="/politica-de-cookies" className="text-black/60 underline underline-offset-2 hover:text-black transition-colors duration-300">
                  utilizarea cookie-urilor
                </Link>.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowSettings(true)}
                className="px-5 py-2.5 text-[13px] font-medium text-black/50 border border-black/10 rounded-full hover:border-black/30 hover:text-black transition-all duration-500"
              >
                Setări
              </button>
              <button
                onClick={acceptNecessary}
                className="px-5 py-2.5 text-[13px] font-medium text-black/40 hover:text-black transition-all duration-500"
              >
                Doar necesare
              </button>
              <button
                onClick={acceptAll}
                className="px-6 py-2.5 text-[13px] font-medium text-white bg-[var(--accent)] rounded-full hover:bg-[#333] transition-all duration-500 shadow-[0_2px_12px_rgba(0,0,0,0.1)]"
              >
                Accept toate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          />
          <div className="relative bg-white rounded-[var(--radius-xl)] shadow-[var(--card-shadow-lg)] max-w-lg w-full max-h-[85vh] overflow-y-auto animate-scale-in">
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-black" style={{ fontFamily: 'var(--font-heading)' }}>
                  Setări cookie-uri
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center transition-colors duration-300"
                  aria-label="Închide"
                >
                  <svg className="w-4 h-4 text-black/40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-black/40 mb-6 leading-relaxed">
                Alegeți ce tipuri de cookie-uri acceptați.{' '}
                <Link href="/politica-de-cookies" className="underline underline-offset-2 text-black/50 hover:text-black transition-colors">
                  Mai multe informații
                </Link>.
              </p>

              <div className="space-y-5">
                {/* Necessary */}
                <div className="p-4 rounded-[var(--radius-md)] bg-[var(--muted)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-black mb-1">Cookie-uri necesare</h3>
                      <p className="text-xs text-black/40 leading-relaxed">
                        Esențiale pentru funcționarea site-ului.
                      </p>
                    </div>
                    <div className="w-10 h-6 bg-black/20 rounded-full flex items-center px-0.5 mt-0.5">
                      <div className="w-5 h-5 bg-white rounded-full shadow-sm translate-x-4" />
                    </div>
                  </div>
                </div>

                {/* Analytics */}
                <div className="p-4 rounded-[var(--radius-md)] border border-black/[0.06]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-black mb-1">Cookie-uri de analiză</h3>
                      <p className="text-xs text-black/40 leading-relaxed">
                        Ne ajută să înțelegem cum interacționați cu site-ul.
                      </p>
                    </div>
                    <label className="relative cursor-pointer mt-0.5">
                      <input id="analytics-cookies" type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-10 h-6 bg-black/10 rounded-full peer-checked:bg-[var(--accent)] transition-colors duration-300" />
                      <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform duration-300" />
                    </label>
                  </div>
                </div>

                {/* Marketing */}
                <div className="p-4 rounded-[var(--radius-md)] border border-black/[0.06] opacity-50">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-black mb-1">Cookie-uri de marketing</h3>
                      <p className="text-xs text-black/40 leading-relaxed">
                        Momentan nu utilizăm cookie-uri de marketing.
                      </p>
                    </div>
                    <div className="w-10 h-6 bg-black/10 rounded-full flex items-center px-0.5 mt-0.5">
                      <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={savePreferences}
                  className="flex-1 px-6 py-3 text-[13px] font-medium text-white bg-[var(--accent)] rounded-full hover:bg-[#333] transition-all duration-500"
                >
                  Salvează preferințele
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-3 text-[13px] font-medium text-black/40 border border-black/10 rounded-full hover:border-black/30 hover:text-black transition-all duration-500"
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
