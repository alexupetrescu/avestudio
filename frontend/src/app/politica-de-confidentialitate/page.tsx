import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Politica de Confidențialitate | AVE Studio',
  description: 'Politica de confidențialitate a AVE Studio - Cum colectăm, utilizăm și protejăm datele dumneavoastră personale',
};

export default function PoliticaDeConfidentialitatePage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-6 lg:px-12 pt-36 pb-20">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-black/30 mb-4">Legal</p>
        <h1 className="text-3xl md:text-4xl font-semibold text-black mb-4 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
          Politica de Confidențialitate
        </h1>
        <div className="luxury-line mb-8" />

        <div className="max-w-none text-black/60 space-y-8 text-[15px] leading-relaxed">
          <p className="text-xs text-black/30">
            Ultima actualizare: {new Date().toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>1. Introducere</h2>
            <p>
              AVE Studio (&ldquo;noi&rdquo;, &ldquo;noastre&rdquo;, &ldquo;al nostru&rdquo;) respectă confidențialitatea dumneavoastră și este
              angajat să protejeze datele personale pe care ni le furnizați. Această Politică de Confidențialitate
              explică cum colectăm, utilizăm, stocăm și protejăm informațiile dumneavoastră personale în conformitate
              cu Regulamentul General privind Protecția Datelor (GDPR) și legislația română aplicabilă.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>2. Datele pe care le colectăm</h2>
            <p className="mb-3">Colectăm următoarele tipuri de date personale:</p>

            <h3 className="text-base font-semibold text-black mb-2 mt-4">2.1. Date furnizate de dvs.</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong className="text-black">Informații de contact:</strong> nume, adresă de email, număr de telefon</li>
              <li><strong className="text-black">Informații despre eveniment:</strong> data, locația și detalii despre evenimentul pentru care solicitați servicii</li>
              <li><strong className="text-black">Informații de plată:</strong> date necesare pentru procesarea plăților</li>
              <li><strong className="text-black">Comunicări:</strong> mesaje trimise prin formulare de contact sau email</li>
            </ul>

            <h3 className="text-base font-semibold text-black mb-2 mt-4">2.2. Date colectate automat</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong className="text-black">Date tehnice:</strong> adresă IP, tip de browser, sistem de operare, pagini vizitate</li>
              <li><strong className="text-black">Cookie-uri:</strong> pentru detalii, consultați{' '}
                <Link href="/politica-de-cookies" className="underline underline-offset-2 text-black/70 hover:text-black transition-colors">
                  Politica noastră de Cookie-uri
                </Link>
              </li>
              <li><strong className="text-black">Date de analiză:</strong> informații despre modul în care utilizați site-ul nostru (prin Google Analytics, doar cu consimțământul dumneavoastră)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>3. Cum utilizăm datele dumneavoastră</h2>
            <p className="mb-3">Utilizăm datele personale pentru următoarele scopuri:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong className="text-black">Furnizarea serviciilor:</strong> pentru a procesa rezervările și a furniza servicii de fotografie</li>
              <li><strong className="text-black">Comunicare:</strong> pentru a răspunde la întrebări și a gestiona relația cu clienții</li>
              <li><strong className="text-black">Facturare și plată:</strong> pentru a procesa plățile și a emite facturi</li>
              <li><strong className="text-black">Îmbunătățirea serviciilor:</strong> pentru a analiza utilizarea site-ului (doar cu consimțământ)</li>
              <li><strong className="text-black">Conformitate legală:</strong> pentru a respecta obligațiile legale</li>
              <li><strong className="text-black">Marketing:</strong> doar cu consimțământul dumneavoastră explicit</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>4. Baza legală pentru prelucrare</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong className="text-black">Executarea contractului:</strong> pentru a furniza serviciile solicitate</li>
              <li><strong className="text-black">Consimțământ:</strong> pentru cookie-uri de analiză și marketing</li>
              <li><strong className="text-black">Obligații legale:</strong> pentru facturare și raportare fiscală</li>
              <li><strong className="text-black">Interese legitime:</strong> pentru îmbunătățirea serviciilor și securitatea site-ului</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>5. Partajarea datelor</h2>
            <p className="mb-3">Nu vindem datele dumneavoastră personale. Putem partaja datele cu:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong className="text-black">Furnizori de servicii:</strong> companii care ne ajută să operăm site-ul</li>
              <li><strong className="text-black">Google Analytics:</strong> pentru analiza traficului (doar cu consimțământ)</li>
              <li><strong className="text-black">Autorități legale:</strong> dacă este necesar conform legii</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>6. Stocarea și securitatea datelor</h2>
            <p className="mb-3">
              Păstrăm datele doar atât timp cât este necesar. Implementăm măsuri de protecție inclusiv:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Criptarea datelor sensibile</li>
              <li>Acces restricționat la date personale</li>
              <li>Monitorizare regulată a securității</li>
              <li>Backup-uri regulate</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>7. Drepturile dumneavoastră</h2>
            <p className="mb-3">Conform GDPR, aveți următoarele drepturi:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong className="text-black">Dreptul de acces</strong></li>
              <li><strong className="text-black">Dreptul la rectificare</strong></li>
              <li><strong className="text-black">Dreptul la ștergere</strong></li>
              <li><strong className="text-black">Dreptul la restricționarea prelucrării</strong></li>
              <li><strong className="text-black">Dreptul la portabilitatea datelor</strong></li>
              <li><strong className="text-black">Dreptul de opoziție</strong></li>
              <li><strong className="text-black">Dreptul de a retrage consimțământul</strong></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>8. Cookie-uri</h2>
            <p>
              Consultați{' '}
              <Link href="/politica-de-cookies" className="underline underline-offset-2 text-black/70 hover:text-black transition-colors">
                Politica noastră de Cookie-uri
              </Link>{' '}
              pentru informații detaliate.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>9. Contact</h2>
            <p className="mb-3">Pentru întrebări sau pentru a exercita drepturile dumneavoastră:</p>
            <div className="bg-[var(--muted)] p-5 rounded-[var(--radius-md)]">
              <p className="mb-1.5 font-medium text-black">AVE Studio</p>
              <p className="mb-0.5">Email: adina@aveletter.ro sau alexupetrescu@pm.me</p>
              <p>Telefon: +40746986415 sau +40756538455</p>
            </div>
            <p className="mt-4">
              Puteți depune plângeri la{' '}
              <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-black/70 hover:text-black transition-colors">
                ANSPDCP
              </a>.
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
