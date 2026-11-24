# Assistant CRM

The Next.js CMS lives at **`/crm/`**, for example `https://avestudio.ro/crm/`.
Using the existing domain avoids extra DNS, TLS and cross-domain session setup.
The Django administration at `/admin/` (and `admin.avestudio.ro` when routed to
Django) remains the place for the owner to manage schools, classes and accounts.

## Enable the CRM

Deploy both backend and frontend through the existing GitHub release workflow.
The backend needs the additive migrations **`schools.0006_assistant_crm`** and
**`schools.0007_child_entry_index`**;
review and apply it with the deployment controller's migration option. No
existing children, albums, photos, packages or PINs are changed by the migration.

For local development, run:

```powershell
venv\Scripts\python manage.py migrate
venv\Scripts\python manage.py runserver
```

In another terminal:

```powershell
cd frontend
npm ci --legacy-peer-deps
npm run dev
```

Open `http://localhost:3000/crm/`. The Next.js rewrite sends only
`/api/assistant/*` requests to Django at `http://localhost:8000` by default.
Set `DJANGO_API_PROXY_TARGET` to the backend origin when using a different
backend address. `FRONTEND_URL` or `CSRF_TRUSTED_ORIGINS` must include the
development frontend origin. Production already trusts the main site's HTTPS
origins and sends `/api/` to Django through its existing reverse proxy.

## Give an assistant access

An existing superuser can sign in to the CRM immediately and see every class.
For a separate assistant account, either:

1. In Django administration, add a user with a username and password. Leave
   **Staff status** and **Superuser status** off.
2. Under **Schools & Kindergartens → CRM class access**, add a grant selecting
   that user and an existing class. Repeat for each class they may manage.
3. Give the assistant their credentials and the `/crm/` URL.

Or use the interactive management command on the intended backend:

```powershell
venv\Scripts\python manage.py create_crm_assistant adina --first-name Adina --class EXISTING-CLASS-UUID
```

It asks for the password twice, applies Django's password validators and creates
a nonstaff account. Repeat `--class UUID` to assign several existing classes.
Passwords are never accepted as command arguments or stored in frontend code.
The command refuses to modify an existing username; manage that account's
class grants in Django administration instead.

Removing a class grant immediately revokes that class, including its preview
endpoints, for an assistant already signed in. Marking a user inactive revokes
their sign-in and session access. Reset passwords through Django's user admin or
`python manage.py changepassword USERNAME`.

## Assistant workflow

- Search assigned classes by class, school, city or session, then open a class.
- Add a child's surname, given name, packages and optional notes. New children
  start with A selected; choosing B clears A. C/D/E are optional extras on top
  of A or B. The roster shows the school's prices, each child's total, package
  counts and the class total. Package changes save to the same order records
  used by the teacher page, with the same validation.
- Sort either the class list or child roster by name A–Z/Z–A or time added
  (newest/oldest first). Each list remembers its selected order in this browser.
  Search accepts names without Romanian diacritics and words in either order.
- A/B are an exclusive choice. Extras remain unavailable until a base package
  is selected. New CRM children default to A; empty base selections are rejected.
  Existing rows without an order show a prompt rather than being assigned a
  package automatically. Changing just their name or notes preserves the order.
- Package changes save independently per child. Rapid changes are queued, with
  the latest complete selection saved after an in-flight request; other rows
  remain usable. A failed save restores the last confirmed selection and offers
  an explicit retry of the intended selection.
- **Adaugă foto** beside a child opens the file picker immediately. The camera
  icon opens capture directly. The inline panel defaults to a reference portrait
  and also supports album photos. A portrait preview appears before saving;
  saving refreshes the child's thumbnail and photo count without leaving the list.
- Pending saves/uploads block accidental in-app navigation and sign-out. The
  file queue remains attached to the same child when sorting changes.
- Open the child to edit their name and notes, add a reference portrait from a
  file or phone camera, or upload multiple album photos.
- A **reference portrait** is for the existing face-matching workflow. It is
  separate from the parent's album. Matching continues to be started from the
  owner's existing Django tools.
- **Album photos** are matched directly to the selected child and appear in
  that child's existing parent album. Web and thumbnail variants are generated
  through the current local/R2 storage implementation.
- Uploads are explicit, one file per request, with progress by saved file,
  pause after the current file, per-file errors and retries. Keep the page open;
  the selected files are held only in browser memory. Durable upload receipts
  prevent a retry of the same selection from creating a duplicate.

JPEG, PNG and WebP are supported by the file picker, up to 64 MB per image.
Camera uploads are validated by Django/Pillow; unsupported formats need to be
exported as JPEG. Album previews are paginated in sets of 24. All CRM image
requests require the current session and class assignment, including R2 images;
the API does not return public storage URLs or parent PINs.

The CRM has Romanian labels, responsive layouts, no marketing navigation,
cookie banner or analytics component, and `noindex` metadata. Authentication
uses Django's password hashing, session cookies and CSRF tokens, with a 12-hour
session and a login attempt limit. The limit uses Django's configured cache;
the default local-memory cache applies per process. A shared cache provides a
single limit across multiple backend workers.

## Verification

`schools.test_assistant` covers login, CSRF, access grants, revocation, input
validation, safe retries, image previews and isolation between classes/children.
It uses synthetic images and in-memory storage. Run it through the existing
backend test configuration; the standard release CI already discovers tests in
`schools`. Run `npm run build` in `frontend` for the Next.js production build.

Implementation verification: TypeScript and the production Next.js build passed.
The backend release test set completed with 99 passing tests and 5 skips
(including the Linux symlink test, which this Windows session cannot execute).
Headless Chrome checks at phone and desktop widths passed sign-in, child
creation, both upload modes, private previews, session persistence, logout,
and a retry after a simulated lost upload response without creating duplicates.
All browser checks used a disposable database and synthetic images.

## Roster sorting

Both the CRM and the class inline in Django admin expose four visible sorting
buttons: **Ordinea adăugării**, **Ultimii adăugați**, **Nume A–Z**, and **Nume Z–A**.
CRM remembers the selection; a new roster view starts in entry order.

Each child has a stored `created_at` timestamp and a readonly `entry_index` within
the class. New entries receive an increasing index under a parent row lock; edits
preserve it, and moving an enrollment to another class assigns an index there.
Insertion sorting uses this stored index, including when timestamps are missing
or identical to the second. CRM displays both the index and timestamp with seconds.

Migration 0007 backfills existing indexes using their stored creation timestamps,
then UUID for exact timestamp ties. Historical insertion order cannot be recovered
for exact ties; the fallback is deterministic. Original timestamps and photos are
unchanged. Admin sorting moves existing form rows without reloading or renumbering
form fields, so unsaved edits stay with the correct child.
