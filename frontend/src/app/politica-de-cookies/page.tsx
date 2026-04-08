import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Politica de Cookie-uri | AVE Studio',
  description: 'Politica de cookie-uri a AVE Studio - Ce sunt cookie-urile, cum le utilizăm și cum le gestionați',
};

export default function PoliticaDeCookiesPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-6 lg:px-12 pt-36 pb-20">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-black/30 mb-4">Legal</p>
        <h1 className="text-3xl md:text-4xl font-semibold text-black mb-4 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
          Politica de Cookie-uri
        </h1>
        <div className="luxury-line mb-8" />

        <div className="max-w-none text-black/60 space-y-8 text-[15px] leading-relaxed">
          <p className="text-xs text-black/30">
            Ultima actualizare: {new Date().toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>1. Ce sunt cookie-urile?</h2>
            <p>
              Cookie-urile sunt fișiere text mici plasate pe dispozitivul dumneavoastră când vizitați un site web.
              Ele permit site-ului să-și amintească acțiunile și preferințele dumneavoastră pe o perioadă de timp.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>2. Cum utilizăm cookie-urile?</h2>
            <p className="mb-3">
              AVE Studio utilizează cookie-uri pentru a îmbunătăți experiența dumneavoastră în conformitate cu GDPR
              și legislația română aplicabilă.
            </p>
            <p>
              Înainte de a plasa cookie-uri non-esențiale, vă solicităm consimțământul explicit.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>3. Tipuri de cookie-uri</h2>

            <h3 className="text-base font-semibold text-black mb-2 mt-4">3.1. Cookie-uri necesare</h3>
            <p className="mb-3">
              Esențiale pentru funcționarea site-ului. Nu pot fi dezactivate.
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Cookie-uri de sesiune</li>
              <li>Cookie-uri pentru preferințele de consimțământ</li>
              <li>Cookie-uri de securitate</li>
            </ul>

            <h3 className="text-base font-semibold text-black mb-2 mt-6">3.2. Cookie-uri de analiză</h3>
            <p className="mb-3">
              Ne permit să măsurăm și să îmbunătățim performanța site-ului prin Google Analytics (doar cu consimțământ).
            </p>
            <p className="mb-3"><strong className="text-black">Ce colectăm:</strong></p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Numărul de vizitatori și pagini vizitate</li>
              <li>Surse de trafic și dispozitive utilizate</li>
              <li>Locație geografică generală (anonimizată)</li>
            </ul>
            <p className="mt-3">
              <strong className="text-black">Opt-out:</strong> Dezactivați prin{' '}
              <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer"
                className="underline underline-offset-2 text-black/70 hover:text-black transition-colors">
                extensia Google Analytics Opt-out
              </a>{' '}
              sau prin setările de cookie-uri ale site-ului.
            </p>

            <h3 className="text-base font-semibold text-black mb-2 mt-6">3.3. Cookie-uri de marketing</h3>
            <p>
              Momentan nu utilizăm cookie-uri de marketing. Dacă le vom introduce, vă vom solicita consimțământul.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>4. Cookie-uri terțe</h2>
            <p className="mb-3">Unele cookie-uri sunt plasate de servicii terțe:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                <strong className="text-black">Google Analytics:</strong> pentru analiza traficului.{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
                  className="underline underline-offset-2 text-black/70 hover:text-black transition-colors">
                  Politica de Confidențialitate Google
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>5. Cum gestionați cookie-urile</h2>

            <h3 className="text-base font-semibold text-black mb-2 mt-4">5.1. Prin banner-ul de consimțământ</h3>
            <p>Alegeți ce tipuri de cookie-uri acceptați la prima vizită.</p>

            <h3 className="text-base font-semibold text-black mb-2 mt-4">5.2. Prin setările browserului</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong className="text-black">Chrome:</strong> Setări → Confidențialitate → Cookie-uri</li>
              <li><strong className="text-black">Firefox:</strong> Opțiuni → Confidențialitate → Cookie-uri</li>
              <li><strong className="text-black">Safari:</strong> Preferințe → Confidențialitate</li>
              <li><strong className="text-black">Edge:</strong> Setări → Cookie-uri și permisiuni</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>6. Contact</h2>
            <p className="mb-3">Pentru întrebări despre cookie-uri:</p>
            <div className="bg-[var(--muted)] p-5 rounded-[var(--radius-md)]">
              <p className="mb-1.5 font-medium text-black">AVE Studio</p>
              <p className="mb-0.5">Email: adina@aveletter.ro sau alexupetrescu@pm.me</p>
              <p>Telefon: +40746986415 sau +40756538455</p>
            </div>
            <p className="mt-4">
              Consultați și{' '}
              <Link href="/politica-de-confidentialitate" className="underline underline-offset-2 text-black/70 hover:text-black transition-colors">
                Politica noastră de Confidențialitate
              </Link>.
            </p>
          </section>
        </div>

        <div className="luxury-separator mt-12 mb-8" />
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-black/30 hover:text-black transition-colors duration-500"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Înapoi la pagina principală
        </Link>
      </div>
    </div>
  );
}
