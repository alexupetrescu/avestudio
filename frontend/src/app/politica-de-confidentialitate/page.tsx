import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Politica de Confidențialitate | AVE Studio',
  description: 'Politica de confidențialitate a AVE Studio - Cum colectăm, utilizăm și protejăm datele dumneavoastră personale',
};

export default function PoliticaDeConfidentialitatePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-black mb-8">Politica de Confidențialitate</h1>
        
        <div className="prose prose-lg max-w-none text-black/80 space-y-6">
          <p className="text-sm text-black/60 mb-8">
            Ultima actualizare: {new Date().toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">1. Introducere</h2>
            <p>
              AVE Studio („noi”, „noastre”, „al nostru”) respectă confidențialitatea dumneavoastră și este 
              angajat să protejeze datele personale pe care ni le furnizați. Această Politică de Confidențialitate 
              explică cum colectăm, utilizăm, stocăm și protejăm informațiile dumneavoastră personale în conformitate 
              cu Regulamentul General privind Protecția Datelor (GDPR) și legislația română aplicabilă.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">2. Datele pe care le colectăm</h2>
            <p className="mb-3">Colectăm următoarele tipuri de date personale:</p>
            
            <h3 className="text-xl font-semibold text-black mb-3 mt-4">2.1. Date furnizate de dvs.</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Informații de contact:</strong> nume, adresă de email, număr de telefon</li>
              <li><strong>Informații despre eveniment:</strong> data, locația și detalii despre evenimentul pentru care solicitați servicii</li>
              <li><strong>Informații de plată:</strong> date necesare pentru procesarea plăților (furnizate prin intermediul procesatorilor de plăți securizați)</li>
              <li><strong>Comunicări:</strong> mesaje trimise prin formulare de contact sau email</li>
            </ul>

            <h3 className="text-xl font-semibold text-black mb-3 mt-4">2.2. Date colectate automat</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Date tehnice:</strong> adresă IP, tip de browser, sistem de operare, pagini vizitate</li>
              <li><strong>Cookie-uri:</strong> pentru detalii, consultați{' '}
                <Link href="/politica-de-cookies" className="underline hover:text-black">
                  Politica noastră de Cookie-uri
                </Link>
              </li>
              <li><strong>Date de analiză:</strong> informații despre modul în care utilizați site-ul nostru (prin Google Analytics, doar cu consimțământul dumneavoastră)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">3. Cum utilizăm datele dumneavoastră</h2>
            <p className="mb-3">Utilizăm datele personale pentru următoarele scopuri:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Furnizarea serviciilor:</strong> pentru a procesa rezervările, a comunica despre evenimente și a furniza servicii de fotografie</li>
              <li><strong>Comunicare:</strong> pentru a răspunde la întrebări, a trimite confirmări și a gestiona relația cu clienții</li>
              <li><strong>Facturare și plată:</strong> pentru a procesa plățile și a emite facturi</li>
              <li><strong>Îmbunătățirea serviciilor:</strong> pentru a analiza utilizarea site-ului și a îmbunătăți experiența utilizatorilor (doar cu consimțământ)</li>
              <li><strong>Conformitate legală:</strong> pentru a respecta obligațiile legale și de reglementare</li>
              <li><strong>Marketing:</strong> doar cu consimțământul dumneavoastră explicit, pentru a trimite informații despre serviciile noastre</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">4. Baza legală pentru prelucrare</h2>
            <p className="mb-3">Prelucrăm datele dumneavoastră personale pe baza următoarelor:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Executarea contractului:</strong> pentru a furniza serviciile solicitate</li>
              <li><strong>Consimțământ:</strong> pentru cookie-uri de analiză și marketing (puteți retrage consimțământul oricând)</li>
              <li><strong>Obligații legale:</strong> pentru facturare și raportare fiscală</li>
              <li><strong>Interese legitime:</strong> pentru îmbunătățirea serviciilor și securitatea site-ului</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">5. Partajarea datelor</h2>
            <p className="mb-3">
              Nu vindem datele dumneavoastră personale. Putem partaja datele cu:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Furnizori de servicii:</strong> companii care ne ajută să operăm site-ul (găzduire web, procesatori de plăți) - doar datele necesare pentru serviciile lor</li>
              <li><strong>Google Analytics:</strong> pentru analiza traficului site-ului (doar cu consimțământul dumneavoastră, date anonimizate)</li>
              <li><strong>Autorități legale:</strong> dacă este necesar pentru a respecta obligațiile legale sau pentru a răspunde la cereri legale</li>
            </ul>
            <p className="mt-3">
              Toți furnizorii noștri de servicii sunt obligați să protejeze datele dumneavoastră și să le utilizeze 
              doar în scopurile specificate.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">6. Stocarea și securitatea datelor</h2>
            <p className="mb-3">
              Păstrăm datele dumneavoastră personale doar atât timp cât este necesar pentru scopurile pentru care 
              au fost colectate sau conform cerințelor legale.
            </p>
            <p className="mb-3">
              Implementăm măsuri tehnice și organizatorice adecvate pentru a proteja datele dumneavoastră împotriva 
              accesului neautorizat, pierderii, distrugerii sau modificării, inclusiv:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Criptarea datelor sensibile</li>
              <li>Acces restricționat la date personale</li>
              <li>Monitorizare regulată a securității</li>
              <li>Backup-uri regulate</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">7. Drepturile dumneavoastră</h2>
            <p className="mb-3">Conform GDPR, aveți următoarele drepturi:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Dreptul de acces:</strong> puteți solicita o copie a datelor personale pe care le deținem despre dvs.</li>
              <li><strong>Dreptul la rectificare:</strong> puteți solicita corectarea datelor inexacte sau incomplete</li>
              <li><strong>Dreptul la ștergere:</strong> puteți solicita ștergerea datelor în anumite circumstanțe („dreptul de a fi uitat")</li>
              <li><strong>Dreptul la restricționarea prelucrării:</strong> puteți solicita limitarea prelucrării datelor</li>
              <li><strong>Dreptul la portabilitatea datelor:</strong> puteți solicita transferul datelor către alt operator</li>
              <li><strong>Dreptul de opoziție:</strong> puteți vă opune anumitor tipuri de prelucrare</li>
              <li><strong>Dreptul de a retrage consimțământul:</strong> puteți retrage consimțământul oricând (pentru cookie-uri și marketing)</li>
            </ul>
            <p className="mt-3">
              Pentru a exercita oricare dintre aceste drepturi, vă rugăm să ne contactați la adresele de email 
              menționate mai jos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">8. Cookie-uri</h2>
            <p>
              Site-ul nostru utilizează cookie-uri pentru a îmbunătăți experiența utilizatorilor și pentru analiză. 
              Pentru informații detaliate despre tipurile de cookie-uri pe care le utilizăm și cum le gestionați, 
              vă rugăm să consultați{' '}
              <Link href="/politica-de-cookies" className="underline hover:text-black">
                Politica noastră de Cookie-uri
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">9. Transferuri internaționale</h2>
            <p>
              Datele dumneavoastră sunt stocate și prelucrate în România și în Uniunea Europeană. Dacă utilizăm 
              servicii care implică transferul datelor în afara UE (de exemplu, Google Analytics), asigurăm că 
              există garanții adecvate pentru protecția datelor, conform GDPR.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">10. Copiii</h2>
            <p>
              Site-ul nostru nu este destinat copiilor sub 16 ani. Nu colectăm în mod intenționat date personale 
              de la copiii sub 16 ani. Dacă devenim conștienți că am colectat date de la un copil sub 16 ani, 
              vom șterge aceste date imediat.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">11. Modificări ale politicii</h2>
            <p>
              Ne rezervăm dreptul de a actualiza această Politică de Confidențialitate periodic. Vă vom notifica 
              despre orice modificări semnificative prin publicarea noii politici pe site-ul nostru sau prin email, 
              dacă este cazul. Vă recomandăm să verificați periodic această pagină pentru a fi la curent cu 
              modificările.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">12. Contact și reclamații</h2>
            <p className="mb-3">
              Pentru întrebări, solicitări sau pentru a exercita drepturile dumneavoastră, vă rugăm să ne contactați:
            </p>
            <div className="bg-black/5 p-4 rounded-lg mb-4">
              <p className="mb-2"><strong>AVE Studio</strong></p>
              <p className="mb-1">Email: adina@aveletter.ro sau alexupetrescu@pm.me</p>
              <p>Telefon: +40746986415 sau +40756538455</p>
            </div>
            <p>
              Aveți, de asemenea, dreptul de a depune o plângere la Autoritatea Națională de Supraveghere a 
              Prelucrării Datelor cu Caracter Personal (ANSPDCP) dacă considerați că prelucrarea datelor dumneavoastră 
              încalcă GDPR. Pentru mai multe informații, vizitați{' '}
              <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer" className="underline hover:text-black">
                www.dataprotection.ro
              </a>.
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



