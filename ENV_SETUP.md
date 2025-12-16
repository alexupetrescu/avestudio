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

