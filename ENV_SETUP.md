# Environment Variables Setup Guide

This project uses environment variables to manage configuration settings. Follow the instructions below to set up your environment.

## Backend Setup

1. **Install dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Create a `.env` file in the `backend/` directory:**
   ```bash
   cp backend/env.example backend/.env
   ```

3. **Edit `backend/.env` with your settings:**
   - `SECRET_KEY`: Generate a new secret key for production (use Django's `python manage.py shell -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)
   - `DEBUG`: Set to `False` in production
   - `ALLOWED_HOSTS`: Comma-separated list of allowed hosts (e.g., `yourdomain.com,www.yourdomain.com`)
   - `DATABASE_*`: Configure your database settings
   - `FRONTEND_URL`: Your frontend URL (e.g., `https://yourdomain.com`)
   - `CORS_ALLOW_ALL_ORIGINS`: Set to `False` in production
   - `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed origins if `CORS_ALLOW_ALL_ORIGINS` is `False`

## Frontend Setup

1. **Create a `.env.local` file in the `frontend/` directory:**
   ```bash
   # Copy the example file (if it exists) or create manually
   ```

2. **Add the following variables to `frontend/.env.local`:**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   NEXT_PUBLIC_INSTAGRAM_URL=https://www.instagram.com/avephoto.studio/
   NEXT_PUBLIC_FACEBOOK_URL=https://www.facebook.com/profile.php?id=61578330532230
   NEXT_PUBLIC_CONTACT_ADINA_NAME=Adina
   NEXT_PUBLIC_CONTACT_ADINA_PHONE=0746986415
   NEXT_PUBLIC_CONTACT_ADINA_EMAIL=adina@aveletter.ro
   NEXT_PUBLIC_CONTACT_ALEX_NAME=Alex
   NEXT_PUBLIC_CONTACT_ALEX_PHONE=0756538455
   NEXT_PUBLIC_CONTACT_ALEX_EMAIL=alexupetrescu@pm.me
   ```

3. **For production, update:**
   - `NEXT_PUBLIC_API_URL`: Your production API URL (e.g., `https://api.yourdomain.com/api`)
   - `NEXT_PUBLIC_SITE_URL`: Your production site URL (e.g., `https://avestudio.ro`)
   - Update contact information and social media links as needed

## Important Notes

- **Never commit `.env` or `.env.local` files to version control**
- The `.env.example` and `env.example` files are templates and can be safely committed
- In Next.js, only variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- Restart your development servers after changing environment variables

## Security Checklist

- [ ] Generate a new `SECRET_KEY` for production
- [ ] Set `DEBUG=False` in production
- [ ] Configure `ALLOWED_HOSTS` with your domain
- [ ] Set `CORS_ALLOW_ALL_ORIGINS=False` in production
- [ ] Use secure database credentials
- [ ] Use HTTPS URLs in production


## Schools app (season offer, teacher order list, face grouping)

New Django app `schools` (the older `clients` app and its albums are untouched and still work).

**Face recognition (optional, CPU only):**
```bash
venv\Scripts\pip install torch==2.2.2 torchvision==0.17.2 --index-url https://download.pytorch.org/whl/cpu
venv\Scripts\pip install facenet-pytorch
```
The first run downloads the VGGFace2 weights (~107 MB) into the user cache. Without these packages
everything still works, but photos are only matched by the `nume prenume (1).jpg` filename convention.

Tuning (in `.env`):
- `FACE_MATCH_THRESHOLD` (default `0.9`): max embedding distance to accept a match. Lower = stricter.
- `FACE_MATCH_MARGIN` (default `0.15`): best match must beat the runner-up by this much (avoids siblings).
- `IMAGE_WEB_MAX` / `IMAGE_THUMB_MAX` (default `1600` / `400`): long side of the generated variants.

**Workflow:**
1. Admin → Schools → add the school (tick *returning customer* for the 70 lei tier) and its classes.
2. Print the class card (teacher link + PIN) from the class page; the teacher fills the children + packages at `/scoala/<id>`.
3. After the shoot: *Bulk upload* → pick the class → drop the reference portraits (`Nume-Prenume.jpg`) and all photos.
4. *Face review* shows unassigned / low-confidence photos for a manual fix; *Print QR cards* gives one card per child; *Export CSV* is the order list.
5. Children open `/copil/<id>` with their PIN to view and download photos.

Commands: `python manage.py process_faces --class <uuid> [--reset]`, `python manage.py rebuild_variants [--class <uuid>] [--missing-only]`.

**Offer pages:** `/oferta-scoli` (new clients, 75 lei) and `/oferta-scoli/clienti-fideli` (returning, 70 lei).
Product mockups come from `designs/` (gitignored) via `python scripts/prepare_offer_images.py` → `frontend/public/oferta/`.
