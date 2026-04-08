import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Termeni și Condiții | AVE Studio',
  description: 'Termenii și condițiile de utilizare a site-ului AVE Studio - Fotografie Profesională',
};

export default function TermeniSiConditiiPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-6 lg:px-12 pt-36 pb-20">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-black/30 mb-4">Legal</p>
        <h1 className="text-3xl md:text-4xl font-semibold text-black mb-4 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
          Termeni și Condiții
        </h1>
        <div className="luxury-line mb-8" />

        <div className="max-w-none text-black/60 space-y-8 text-[15px] leading-relaxed">
          <p className="text-xs text-black/30">
            Ultima actualizare: {new Date().toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>1. Prezentare generală</h2>
            <p>
              Bun venit pe site-ul AVE Studio. Prin accesarea și utilizarea acestui site, acceptați să respectați
              acești Termeni și Condiții. Dacă nu sunteți de acord, vă rugăm să nu utilizați site-ul nostru.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>2. Despre serviciile noastre</h2>
            <p>
              AVE Studio oferă servicii de fotografie profesională pentru evenimente speciale, inclusiv nunți,
              botezuri, evenimente corporative și alte ocazii speciale.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>3. Utilizarea site-ului</h2>
            <p className="mb-3">Vă angajați să utilizați site-ul doar în scopuri legale și în moduri care nu:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Încalcă orice legi locale, naționale sau internaționale</li>
              <li>Lezează drepturile de proprietate intelectuală</li>
              <li>Transmit viruși sau coduri malicioase</li>
              <li>Încearcă accesul neautorizat la orice parte a site-ului</li>
              <li>Interferează cu funcționarea normală a site-ului</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>4. Proprietate intelectuală</h2>
            <p className="mb-3">
              Toate conținuturile de pe acest site sunt proprietatea AVE Studio și sunt protejate de legile
              privind drepturile de autor.
            </p>
            <p>
              Fotografiile nu pot fi reproduse sau utilizate fără permisiunea scrisă prealabilă.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>5. Rezervări și contracte</h2>
            <p className="mb-3">
              Rezervările se fac prin contact direct. Un contract scris va fi furnizat pentru fiecare eveniment.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>6. Prețuri și plăți</h2>
            <p>
              Prețurile sunt comunicate individual. Se solicită un avans pentru confirmare, iar restul se plătește
              conform termenilor conveniți.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>7. Anulări și modificări</h2>
            <p>
              Anulările trebuie comunicate cât mai devreme. AVE Studio își rezervă dreptul de a modifica serviciile
              în caz de forță majoră.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>8. Limitarea răspunderii</h2>
            <p>
              AVE Studio nu poate fi responsabil pentru circumstanțe în afara controlului nostru. Vom face tot
              posibilul pentru a găsi soluții alternative.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>9. Confidențialitate</h2>
            <p>
              Informațiile personale sunt utilizate conform{' '}
              <Link href="/politica-de-confidentialitate" className="underline underline-offset-2 text-black/70 hover:text-black transition-colors">
                Politicii noastre de Confidențialitate
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>10. Legea aplicabilă</h2>
            <p>
              Acești termeni sunt guvernați de legile României. Disputele vor fi rezolvate prin negocieri sau
              instanțele competente din România.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>11. Contact</h2>
            <div className="bg-[var(--muted)] p-5 rounded-[var(--radius-md)]">
              <p className="mb-1.5 font-medium text-black">AVE Studio</p>
              <p className="mb-0.5">Email: adina@aveletter.ro sau alexupetrescu@pm.me</p>
              <p>Telefon: +40746986415 sau +40756538455</p>
            </div>
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
