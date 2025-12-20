import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Termeni și Condiții | AVE Studio',
  description: 'Termenii și condițiile de utilizare a site-ului AVE Studio - Fotografie Profesională',
};

export default function TermeniSiConditiiPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-black mb-8">Termeni și Condiții</h1>
        
        <div className="prose prose-lg max-w-none text-black/80 space-y-6">
          <p className="text-sm text-black/60 mb-8">
            Ultima actualizare: {new Date().toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">1. Prezentare generală</h2>
            <p>
              Bun venit pe site-ul AVE Studio. Prin accesarea și utilizarea acestui site, acceptați să respectați 
              acești Termeni și Condiții de utilizare. Dacă nu sunteți de acord cu oricare dintre aceste termeni, 
              vă rugăm să nu utilizați site-ul nostru.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">2. Despre serviciile noastre</h2>
            <p>
              AVE Studio oferă servicii de fotografie profesională pentru evenimente speciale, inclusiv dar fără 
              a se limita la: nunti, botezuri, evenimente corporative și alte ocazii speciale. Toate serviciile 
              sunt furnizate în conformitate cu standardele profesionale ale industriei.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">3. Utilizarea site-ului</h2>
            <p className="mb-3">Vă angajați să utilizați site-ul nostru doar în scopuri legale și în moduri care nu:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Încalcă sau încurajează încălcarea oricăror legi locale, naționale sau internaționale</li>
              <li>Văionează drepturile de proprietate intelectuală ale altora</li>
              <li>Transmit sau distribuie viruși sau coduri malicioase</li>
              <li>Încearcă să acceseze neautorizat orice parte a site-ului</li>
              <li>Interferează cu funcționarea normală a site-ului</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">4. Proprietate intelectuală</h2>
            <p className="mb-3">
              Toate conținuturile de pe acest site, inclusiv dar fără a se limita la texte, imagini, logo-uri, 
              grafice și software, sunt proprietatea AVE Studio sau a furnizorilor săi de conținut și sunt protejate 
              de legile române și internaționale privind drepturile de autor.
            </p>
            <p>
              Fotografiile prezentate pe site sunt proprietatea AVE Studio și nu pot fi reproduse, distribuite sau 
              utilizate fără permisiunea scrisă prealabilă. Orice utilizare neautorizată a conținutului poate duce 
              la acțiuni legale.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">5. Rezervări și contracte</h2>
            <p className="mb-3">
              Rezervările pentru serviciile de fotografie se fac prin contact direct cu echipa AVE Studio. 
              Toate rezervările sunt supuse disponibilității și confirmării scrise.
            </p>
            <p>
              Un contract scris va fi furnizat pentru fiecare eveniment, care va include detalii despre servicii, 
              prețuri, termeni de plată și drepturi de utilizare a fotografiilor.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">6. Prețuri și plăți</h2>
            <p className="mb-3">
              Prețurile pentru serviciile noastre sunt comunicate individual în funcție de cerințele fiecărui 
              eveniment. Toate prețurile sunt exprimate în RON și includ TVA, dacă este cazul.
            </p>
            <p>
              Termenii de plată vor fi specificați în contractul individual. În general, se solicită un avans 
              pentru confirmarea rezervării, iar restul sumei se plătește conform termenilor conveniți.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">7. Anulări și modificări</h2>
            <p className="mb-3">
              Anulările trebuie comunicate cât mai devreme posibil. Politica noastră de anulare va fi detaliată 
              în contractul individual.
            </p>
            <p>
              AVE Studio își rezervă dreptul de a modifica sau anula serviciile în caz de forță majoră sau 
              circumstanțe imprevizibile. În astfel de cazuri, vom face tot posibilul pentru a găsi o soluție 
              alternativă sau pentru a restitui plățile efectuate.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">8. Limitarea răspunderii</h2>
            <p>
              AVE Studio nu poate fi făcut responsabil pentru întârzieri sau neîndepliniri cauzate de circumstanțe 
              în afara controlului nostru rezonabil, inclusiv dar fără a se limita la: dezastre naturale, război, 
              greve, accidente sau boală. În astfel de situații, vom face tot posibilul pentru a găsi un fotograf 
              de înlocuire sau pentru a restitui plățile.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">9. Confidențialitate</h2>
            <p>
              Respectăm confidențialitatea clienților noștri. Informațiile personale colectate prin intermediul 
              site-ului sau în timpul comunicărilor sunt utilizate conform{' '}
              <Link href="/politica-de-confidentialitate" className="underline hover:text-black">
                Politicii noastre de Confidențialitate
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">10. Modificări ale termenilor</h2>
            <p>
              AVE Studio își rezervă dreptul de a modifica acești Termeni și Condiții în orice moment. 
              Modificările vor intra în vigoare imediat ce sunt publicate pe site. Este responsabilitatea 
              dumneavoastră să verificați periodic acești termeni pentru a fi la curent cu orice modificări.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">11. Legea aplicabilă</h2>
            <p>
              Acești Termeni și Condiții sunt guvernați de legile României. Orice dispute vor fi rezolvate 
              prin negocieri directe, iar dacă este necesar, prin instanțele competente din România.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">12. Contact</h2>
            <p className="mb-3">
              Pentru întrebări despre acești Termeni și Condiții, vă rugăm să ne contactați:
            </p>
            <div className="bg-black/5 p-4 rounded-lg">
              <p className="mb-2"><strong>AVE Studio</strong></p>
              <p className="mb-1">Email: adina@aveletter.ro sau alexupetrescu@pm.me</p>
              <p>Telefon: +40746986415 sau +40756538455</p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-black/10">
          <Link 
            href="/" 
            className="text-black/60 hover:text-black transition-colors underline"
          >
            ← Înapoi la pagina principală
          </Link>
        </div>
      </div>
    </div>
  );
}




