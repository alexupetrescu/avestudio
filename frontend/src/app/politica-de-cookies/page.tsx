import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Politica de Cookie-uri | AVE Studio',
  description: 'Politica de cookie-uri a AVE Studio - Ce sunt cookie-urile, cum le utilizăm și cum le gestionați',
};

export default function PoliticaDeCookiesPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-black mb-8">Politica de Cookie-uri</h1>
        
        <div className="prose prose-lg max-w-none text-black/80 space-y-6">
          <p className="text-sm text-black/60 mb-8">
            Ultima actualizare: {new Date().toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">1. Ce sunt cookie-urile?</h2>
            <p>
              Cookie-urile sunt fișiere text mici care sunt plasate pe dispozitivul dumneavoastră (computer, 
              tabletă sau telefon mobil) când vizitați un site web. Cookie-urile permit site-ului să-și amintească 
              acțiunile și preferințele dumneavoastră (cum ar fi autentificarea, limba, dimensiunea fontului și 
              alte preferințe de afișare) pe o perioadă de timp, astfel încât să nu trebuiască să le reintroduceți 
              de fiecare dată când reveniți pe site sau navigați de la o pagină la alta.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">2. Cum utilizăm cookie-urile?</h2>
            <p className="mb-3">
              AVE Studio utilizează cookie-uri pentru a îmbunătăți experiența dumneavoastră pe site-ul nostru și 
              pentru a înțelege modul în care vizitatorii interacționează cu conținutul nostru. Utilizăm cookie-uri 
              în conformitate cu Regulamentul General privind Protecția Datelor (GDPR) și legislația română aplicabilă.
            </p>
            <p>
              Înainte de a plasa cookie-uri non-esențiale pe dispozitivul dumneavoastră, vă solicităm consimțământul 
              explicit prin banner-ul de consimțământ pentru cookie-uri.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">3. Tipuri de cookie-uri pe care le utilizăm</h2>
            
            <h3 className="text-xl font-semibold text-black mb-3 mt-4">3.1. Cookie-uri necesare (esențiale)</h3>
            <p className="mb-3">
              Aceste cookie-uri sunt esențiale pentru funcționarea site-ului și nu pot fi dezactivate în sistemele 
              noastre. Ele sunt de obicei setate doar ca răspuns la acțiuni pe care le efectuați și care echivalează 
              cu o solicitare de servicii, cum ar fi setarea preferințelor de confidențialitate, conectarea sau 
              completarea formularelor.
            </p>
            <p className="mb-3"><strong>Exemple:</strong></p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cookie-uri de sesiune pentru menținerea sesiunii utilizatorului</li>
              <li>Cookie-uri pentru preferințele de consimțământ pentru cookie-uri</li>
              <li>Cookie-uri de securitate pentru protecția împotriva atacurilor</li>
            </ul>
            <p className="mt-3">
              <strong>Durata:</strong> Aceste cookie-uri sunt de obicei șterse când închideți browserul (cookie-uri 
              de sesiune) sau pot persista pentru o perioadă limitată (de exemplu, preferințele de consimțământ).
            </p>

            <h3 className="text-xl font-semibold text-black mb-3 mt-6">3.2. Cookie-uri de analiză</h3>
            <p className="mb-3">
              Aceste cookie-uri ne permit să numărăm vizitele și sursele de trafic, astfel încât să putem măsura 
              și îmbunătăți performanța site-ului nostru. Ele ne ajută să înțelegem ce pagini sunt cele mai populare 
              și cum vizitatorii navighează pe site.
            </p>
            <p className="mb-3">
              <strong>Serviciu utilizat:</strong> Google Analytics (doar cu consimțământul dumneavoastră explicit)
            </p>
            <p className="mb-3"><strong>Ce colectăm:</strong></p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Numărul de vizitatori</li>
              <li>Pagini vizitate și timpul petrecut pe fiecare pagină</li>
              <li>Surse de trafic (de unde provin vizitatorii)</li>
              <li>Dispozitive și browsere utilizate</li>
              <li>Locație geografică generală (la nivel de țară/oraș, nu adrese IP complete)</li>
            </ul>
            <p className="mt-3">
              <strong>Anonimizare:</strong> Google Analytics este configurat pentru a anonimiza adresele IP, 
              ceea ce înseamnă că ultimul octet al adresei IP este eliminat înainte de stocare.
            </p>
            <p>
              <strong>Durata:</strong> Cookie-urile Google Analytics pot persista până la 2 ani, dar puteți 
              șterge cookie-urile oricând prin setările browserului.
            </p>
            <p className="mt-3">
              <strong>Opt-out:</strong> Puteți dezactiva cookie-urile Google Analytics prin{' '}
              <a 
                href="https://tools.google.com/dlpage/gaoptout" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-black"
              >
                extensia Google Analytics Opt-out
              </a>{' '}
              sau prin setările de consimțământ pentru cookie-uri de pe site-ul nostru.
            </p>

            <h3 className="text-xl font-semibold text-black mb-3 mt-6">3.3. Cookie-uri de marketing</h3>
            <p>
              Momentan, AVE Studio nu utilizează cookie-uri de marketing. Dacă vom introduce astfel de cookie-uri 
              în viitor, vă vom solicita consimțământul explicit și vă vom informa despre tipurile de cookie-uri 
              și scopurile lor.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">4. Cookie-uri terțe</h2>
            <p className="mb-3">
              Unele cookie-uri sunt plasate de servicii terțe care apar pe paginile noastre. Acestea includ:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Google Analytics:</strong> Pentru analiza traficului site-ului (doar cu consimțământ). 
                Pentru mai multe informații, consultați{' '}
                <a 
                  href="https://policies.google.com/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-black"
                >
                  Politica de Confidențialitate Google
                </a>.
              </li>
            </ul>
            <p className="mt-3">
              Nu avem control asupra cookie-urilor plasate de terți. Vă recomandăm să consultați politicile de 
              confidențialitate ale acestor terți pentru mai multe informații.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">5. Cum gestionați cookie-urile</h2>
            <p className="mb-3">
              Aveți controlul asupra cookie-urilor și puteți gestiona preferințele dumneavoastră în mai multe moduri:
            </p>

            <h3 className="text-xl font-semibold text-black mb-3 mt-4">5.1. Prin banner-ul de consimțământ</h3>
            <p>
              Când vizitați site-ul pentru prima dată, veți vedea un banner care vă permite să alegeți ce tipuri 
              de cookie-uri acceptați. Puteți modifica aceste preferințe oricând prin setările de cookie-uri 
              (accesibile prin link-ul din footer sau prin ștergerea cookie-urilor și reîncărcarea paginii).
            </p>

            <h3 className="text-xl font-semibold text-black mb-3 mt-4">5.2. Prin setările browserului</h3>
            <p className="mb-3">
              Majoritatea browserelor web acceptă cookie-uri în mod implicit, dar puteți modifica setările browserului 
              pentru a refuza cookie-uri sau pentru a fi notificat când un site încearcă să plaseze un cookie. 
              Iată cum puteți gestiona cookie-urile în browserele populare:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Google Chrome:</strong> Setări → Confidențialitate și securitate → Cookie-uri și alte date 
                de site
              </li>
              <li>
                <strong>Mozilla Firefox:</strong> Opțiuni → Confidențialitate și securitate → Cookie-uri și date 
                de site
              </li>
              <li>
                <strong>Safari:</strong> Preferințe → Confidențialitate → Cookie-uri și date de site web
              </li>
              <li>
                <strong>Microsoft Edge:</strong> Setări → Cookie-uri și permisiuni de site → Cookie-uri și date 
                de site stocate
              </li>
            </ul>
            <p className="mt-3">
              <strong>Notă:</strong> Dezactivarea cookie-urilor necesare poate afecta funcționalitatea site-ului 
              și poate împiedica accesul la anumite caracteristici.
            </p>

            <h3 className="text-xl font-semibold text-black mb-3 mt-4">5.3. Ștergerea cookie-urilor existente</h3>
            <p>
              Puteți șterge cookie-urile existente oricând prin setările browserului. După ștergere, veți fi 
              întrebați din nou despre preferințele dumneavoastră pentru cookie-uri la următoarea vizită.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">6. Impactul refuzării cookie-urilor</h2>
            <p className="mb-3">
              Dacă alegeți să refuzați cookie-urile non-esențiale:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Site-ul va funcționa în continuare normal</li>
              <li>Nu veți primi analize personalizate despre utilizarea site-ului</li>
              <li>Unele funcționalități pot fi limitate</li>
            </ul>
            <p className="mt-3">
              Cookie-urile necesare nu pot fi dezactivate, deoarece sunt esențiale pentru funcționarea de bază 
              a site-ului.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">7. Actualizări ale acestei politici</h2>
            <p>
              Ne rezervăm dreptul de a actualiza această Politică de Cookie-uri periodic pentru a reflecta 
              modificările în utilizarea cookie-urilor sau în legislație. Vă recomandăm să verificați periodic 
              această pagină pentru a fi la curent cu orice modificări. Data ultimei actualizări este indicată 
              în partea de sus a acestei pagini.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">8. Contact</h2>
            <p className="mb-3">
              Pentru întrebări despre utilizarea cookie-urilor pe site-ul nostru, vă rugăm să ne contactați:
            </p>
            <div className="bg-black/5 p-4 rounded-lg">
              <p className="mb-2"><strong>AVE Studio</strong></p>
              <p className="mb-1">Email: adina@aveletter.ro sau alexupetrescu@pm.me</p>
              <p>Telefon: +40746986415 sau +40756538455</p>
            </div>
            <p className="mt-4">
              Pentru informații generale despre protecția datelor, consultați și{' '}
              <Link href="/politica-de-confidentialitate" className="underline hover:text-black">
                Politica noastră de Confidențialitate
              </Link>.
            </p>
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




