# Ghid: Oferta Școli & Grădinițe 2026

Ce trebuie instalat și ce faci, pas cu pas, de la pregătirea serverului până la livrarea albumelor.
Aplicația veche `clients` (albumele de anul trecut) rămâne neatinsă și funcționează în continuare.

---

## 1. Instalare (o singură dată)

### Backend (Django)

```bash
# din folderul proiectului
venv\Scripts\pip install -r backend/requirements.txt
venv\Scripts\python manage.py migrate
venv\Scripts\python manage.py collectstatic --noinput     # doar pe server
```

### Recunoaștere facială (opțional, dar recomandat)

Rulează pe procesor, nu are nevoie de placă video. Descarcă ~200 MB de pachete și, la prima rulare, ~107 MB de modele.

```bash
venv\Scripts\pip install torch --index-url https://download.pytorch.org/whl/cpu
venv\Scripts\pip install facenet-pytorch
```

Verificare:

```bash
venv\Scripts\python -c "import django,os;os.environ['DJANGO_SETTINGS_MODULE']='backend.settings';django.setup();from schools import face_engine;print(face_engine.available(), face_engine.unavailable_reason())"
```

Trebuie să afișeze `True`. Dacă afișează `False`, aplicația merge în continuare, dar pozele se potrivesc doar după numele fișierului.

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run build
npm run start        # sau npm run dev local
```

### Variabile în `backend/.env` (opționale)

| Variabilă | Implicit | Rol |
|---|---|---|
| `FRONTEND_URL` | `http://localhost:3000` | Adresa site-ului, folosită în link-uri și coduri QR. Pe server: `https://avestudio.ro`. |
| `FACE_MATCH_THRESHOLD` | `0.9` | Distanța maximă acceptată între fețe. Mai mic = mai strict (mai puține potriviri greșite, mai multe de verificat manual). |
| `FACE_MATCH_MARGIN` | `0.15` | Cea mai bună potrivire trebuie să fie cu atât mai bună decât a doua. Evită confuzia între frați. |
| `IMAGE_WEB_MAX` / `IMAGE_THUMB_MAX` | `1600` / `400` | Latura lungă a variantelor web și thumbnail generate la upload. |

Dacă schimbi `FRONTEND_URL` după ce ai creat clase sau copii, regenerează codurile QR (vezi secțiunea 8).

### Imaginile pentru paginile de ofertă

Mockup-urile vin din folderul `designs/` (nu e în git). Dacă schimbi designurile:

```bash
venv\Scripts\python scripts/prepare_offer_images.py
```

Rezultatul merge în `frontend/public/oferta/` și se publică odată cu site-ul.

---

## 2. Paginile de ofertă

| Pagină | Pentru cine | Preț pachet A |
|---|---|---|
| `/oferta-scoli` | școli și grădinițe noi | 75 lei (în loc de 85) |
| `/oferta-scoli/clienti-fideli` | cei cu care am lucrat anul trecut | 70 lei (în loc de 85) |

Extra: B breloc 40 lei, C magnet 25 lei, D puzzle 105 lei, fiecare se poate comanda separat.
Perioada afișată: 9 noiembrie - 5 decembrie 2026. Toate prețurile și perioada sunt în `schools/pricing.py`.

Pentru PDF: deschide pagina în browser, Ctrl+P, "Salvează ca PDF". Meniul și footerul se ascund automat la printare.

---

## 3. Înainte de ședința foto: școala, clasele, cadrele didactice

1. Admin → **Schools & Kindergartens → Schools → Add**.
   Bifează **Is returning customer** dacă am mai lucrat cu ei (asta dă prețul de 70 lei în loc de 75).
2. În aceeași pagină adaugă clasele (nume, educatoare / învățătoare, telefon). Salvează.
3. Deschide clasa. În panoul **Teacher access** ai link-ul, PIN-ul și codul QR.
4. **Print QR cards** (buton sus) → prima carte din foaie e cea pentru cadrul didactic. Tipărește-o sau trimite link + PIN pe WhatsApp.

Cadrul didactic intră pe `/scoala/<id>` cu PIN-ul, adaugă copiii (nume, prenume) și bifează A/B/C/D pentru fiecare. Se salvează automat. Tu vezi lista în admin, pe pagina clasei, cu totaluri pe pachet.

**Export CSV** (pe pagina clasei) dă lista de comenzi cu total în lei, deschide direct în Excel.

---

## 4. După ședința foto: încărcarea pozelor

Pregătește pe calculator, pentru fiecare clasă:

- un folder cu **pozele clasei** (toate, inclusiv de grup)
- un folder cu **câte un portret clar pentru fiecare copil**, fișierul numit **Nume-Prenume.jpg** (ex. `Popescu-Ana.jpg`, `Ionescu-Luca-Andrei.jpg`). Se acceptă și `ana popescu.jpg` sau `Popescu_Ana.jpg`; diacriticele nu contează.

Apoi:

1. Admin → **Classes → Bulk upload photos** (sau butonul **Upload photos** de pe pagina clasei).
2. Alege școala și clasa. Dacă clasa nu există încă, lasă "new class" și scrie numele ei.
3. Trage portretele în caseta **Reference faces** și pozele în caseta **Class photos**.
   - Dacă educatoarea a adăugat deja copilul în listă, portretul se leagă de el după nume.
   - Dacă nu, copilul se creează automat din numele fișierului.
4. Lasă bifat **Run face matching after upload** și apasă **Upload**.

La upload se generează automat varianta web (1600 px) și thumbnail (400 px) pentru fiecare poză. Potrivirea fețelor rulează în fundal și ești dus pe pagina **Face review**.

Poți încărca în mai multe reprize. Pozele noi se potrivesc doar cu portretele existente; dacă adaugi portrete noi, potrivirea se reia pentru toată clasa.

Convenția veche (`nume prenume (1).jpg`) funcționează și ea: poza se leagă de copilul cu acel nume chiar fără recunoaștere facială.

---

## 5. Face review: verificarea potrivirilor

Pagina **Face review** a clasei arată:

- **Last matching run**: progresul (se actualizează singur) și un jurnal cu ce nu a mers (ex. "no face found" la un portret neclar).
- **Children**: fiecare copil cu numărul de poze, câteva thumbnails, PIN-ul și link-ul la album.
- **Needs review - unassigned**: poze în care nu a fost recunoscut nimeni. Pentru fiecare:
  - selectează unul sau mai mulți copii din listă → **Assign**
  - **Whole class** pentru poza de grup (ajunge în albumul tuturor)
  - **Clear** șterge toate legăturile pozei
- **Low confidence**: potriviri nesigure; confirmă sau corectează cu ×.
- **Assigned photos**: restul, ascunse într-un panou pliabil, dacă vrei să corectezi ceva.

Butoane: **Match unprocessed** rulează potrivirea doar pe pozele noi; **Re-run all** reia totul (ce ai asignat manual rămâne).

Dacă prea multe poze cad la "unassigned", crește `FACE_MATCH_THRESHOLD` (ex. 1.0). Dacă apar potriviri greșite, scade-l (ex. 0.8). Schimbarea se aplică la următoarea rulare.

---

## 6. Livrarea către părinți

1. Pe pagina clasei: **Print QR cards** → o foaie A4 cu câte un card per copil (nume, cod QR, PIN, link). Se pot tipări doar anumiți copii din **Children → selectează → Print QR + PIN cards**.
2. Părintele scanează codul sau deschide `/copil/<id>`, introduce PIN-ul și vede albumul: grilă cu thumbnails, lightbox cu varianta web, buton **Descarcă toate pozele** (ZIP cu originalele).
3. Dacă un copil a fost adăugat după tipărire, cardul lui se tipărește separat din pagina copilului (Admin → Children).

---

## 7. Comenzi utile

```bash
# potrivirea fețelor pentru o clasă, din terminal (la fel ca din admin, dar vezi jurnalul direct)
venv\Scripts\python manage.py process_faces --class <uuid-clasa>
venv\Scripts\python manage.py process_faces --class <uuid-clasa> --reset   # reia tot

# regenerează variantele web/thumb (ex. după schimbarea IMAGE_WEB_MAX)
venv\Scripts\python manage.py rebuild_variants
venv\Scripts\python manage.py rebuild_variants --class <uuid-clasa> --missing-only
```

UUID-ul clasei e în adresa paginii ei din admin.

---

## 8. Probleme frecvente

| Simptom | Cauză / rezolvare |
|---|---|
| În Bulk upload apare "Face recognition is not installed" | Instalează torch + facenet-pytorch (secțiunea 1) și repornește serverul Django. |
| Jurnalul spune "no face found" la un portret | Portretul e prea mic sau fața e întoarsă. Încarcă alt portret pentru copilul respectiv (Admin → Children → copil → Face references) și apasă **Re-run all**. |
| Prima potrivire durează mult | La prima rulare se descarcă modelul (~107 MB). Rulările următoare sunt rapide (sub o secundă pe poză). |
| Codul QR duce la localhost | `FRONTEND_URL` nu era setat la crearea clasei. Setează-l, apoi în admin deschide clasa / copilul și salvează din nou după ce ștergi câmpul QR, sau rulează: `manage.py shell -c "from schools.models import *; [ (c.generate_qr_code(), c.save()) for c in list(SchoolClass.objects.all())+list(Child.objects.all()) ]"` |
| Educatoarea nu poate șterge un copil | Copiii cu poze în album nu se pot șterge din pagina clasei, doar din admin. |
| Doi copii cu același nume în clasă | Adaugă al doilea prenume sau inițiala (ex. `Popescu-Ana-M.jpg`); numele trebuie să fie unic în clasă. |

---

## 9. Pasul următor planificat

Mutarea pozelor pe Cloudflare (R2 / Images). Variantele se generează deja prin API-ul de storage al Django, deci trecerea înseamnă configurarea unui backend de storage, fără modificări în logica de upload.
