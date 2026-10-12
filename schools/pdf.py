"""
PDFs for the schools offer, rendered with xhtml2pdf:

- class order list (teacher page "Descarcă PDF" / "Printează", admin "Order list (PDF)"),
  from templates/schools/class_list_pdf.html
- the public offer (/oferta-scoli "Salvați ca PDF"), from templates/schools/offer_pdf.html

DejaVu Sans is bundled in static/fonts because the built-in PDF fonts have no ș / ț.
"""

import tempfile
from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.template.loader import render_to_string
from PIL import Image
from reportlab.lib.fonts import addMapping
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from xhtml2pdf import default as xhtml2pdf_default
from xhtml2pdf import pisa

from . import pricing

FONT_DIR = Path(settings.BASE_DIR) / 'static' / 'fonts'
# Product mockups shared with the Next.js offer page
OFFER_IMG_DIR = Path(settings.BASE_DIR) / 'frontend' / 'public' / 'oferta'
FONT_FAMILY = 'DejaVu'
_fonts_ready = False


def ensure_fonts():
    """
    Register DejaVu with reportlab once and expose it to xhtml2pdf as 'DejaVu'.
    (xhtml2pdf's own @font-face loader breaks on Windows, so we bypass it.)
    """
    global _fonts_ready
    if _fonts_ready:
        return
    pdfmetrics.registerFont(TTFont(FONT_FAMILY, str(FONT_DIR / 'DejaVuSans.ttf')))
    pdfmetrics.registerFont(TTFont(f'{FONT_FAMILY}-Bold', str(FONT_DIR / 'DejaVuSans-Bold.ttf')))
    addMapping(FONT_FAMILY, 0, 0, FONT_FAMILY)
    addMapping(FONT_FAMILY, 0, 1, FONT_FAMILY)
    addMapping(FONT_FAMILY, 1, 0, f'{FONT_FAMILY}-Bold')
    addMapping(FONT_FAMILY, 1, 1, f'{FONT_FAMILY}-Bold')
    xhtml2pdf_default.DEFAULT_FONT[FONT_FAMILY.lower()] = FONT_FAMILY
    xhtml2pdf_default.DEFAULT_FONT[f'{FONT_FAMILY.lower()}-bold'] = f'{FONT_FAMILY}-Bold'
    _fonts_ready = True


def class_list_context(school_class) -> dict:
    children = list(school_class.children.all())
    totals = {k: 0 for k in pricing.LETTERS}
    total_lei = 0
    rows = []
    for i, child in enumerate(children, start=1):
        for k in pricing.LETTERS:
            totals[k] += child.has(k)
        total_lei += child.total_lei
        rows.append({
            'nr': i,
            'child': child,
            'marks': [child.has(k) for k in pricing.LETTERS],
            'total': child.total_lei,
        })
    is_returning = school_class.school.is_returning_customer
    return {
        'school_class': school_class,
        'school': school_class.school,
        'rows': rows,
        'letters': [k.upper() for k in pricing.LETTERS],
        'totals': [totals[k] for k in pricing.LETTERS],
        'total_lei': total_lei,
        'count': len(children),
        'legend': pricing.legend(is_returning),
        'period': pricing.PERIOD,
        'season': pricing.SEASON,
    }


def render_class_list_pdf(school_class) -> bytes:
    ensure_fonts()
    html = render_to_string('schools/class_list_pdf.html', class_list_context(school_class))
    out = BytesIO()
    result = pisa.CreatePDF(html, dest=out, encoding='utf-8')
    if result.err:
        raise RuntimeError(f"PDF rendering failed with {result.err} error(s)")
    return out.getvalue()


def class_list_filename(school_class) -> str:
    import re
    raw = f"lista_{school_class.school.name}_{school_class.name}"
    safe = re.sub(r'[^\w\- ]', '', raw, flags=re.UNICODE).strip().replace(' ', '_')
    return f"{safe or 'lista'}.pdf"


# --------------------------------------------------------------------------
# Public offer
# --------------------------------------------------------------------------

OFFER_IMG_PX = 360  # longest side; plenty for ~2.5 cm thumbnails, keeps the PDF small


def _offer_image(uri, rel):
    """
    xhtml2pdf link_callback: 'oferta/x.webp' -> a downscaled JPEG of
    frontend/public/oferta/x.webp (cached in the temp dir, rebuilt when the source changes).
    """
    if not uri.startswith('oferta/'):
        return uri
    src = OFFER_IMG_DIR / uri.removeprefix('oferta/')
    if not src.is_file():
        return uri
    cache = Path(tempfile.gettempdir()) / 'avestudio_offer_pdf'
    cache.mkdir(exist_ok=True)
    dst = cache / f'{src.stem}_{int(src.stat().st_mtime)}.jpg'
    if not dst.exists():
        with Image.open(src) as im:
            im = im.convert('RGBA')
            im.thumbnail((OFFER_IMG_PX, OFFER_IMG_PX))
            flat = Image.new('RGB', im.size, (255, 255, 255))
            flat.paste(im, mask=im.getchannel('A'))
            flat.save(dst, 'JPEG', quality=85)
    return str(dst)


def offer_context(is_returning: bool) -> dict:
    packages = []
    for key, pkg in pricing.PACKAGES.items():
        price = pricing.package_price(key, is_returning)
        packages.append({
            'letter': key.upper(),
            'name': pkg['name'],
            'list': pkg['list'],
            'price': price,
            'saving': pkg['list'] - price,
            'items': pkg['items'],
        })
    return {
        'is_returning': is_returning,
        'packages': packages,
        'extras': [
            {'letter': k.upper(), 'label': e['label'], 'price': e['price'], 'img': f'oferta/{OFFER_EXTRA_IMG[k]}'}
            for k, e in pricing.EXTRAS.items()
        ],
        'products': OFFER_PRODUCTS,
        'period': pricing.PERIOD,
        'season': pricing.SEASON,
    }


OFFER_EXTRA_IMG = {'c': 'breloc.webp', 'd': 'magnet.webp', 'e': 'puzzle.webp'}

# (image, title, quantity tag) - mirrors GALLERY in frontend/src/components/SchoolOffer.tsx
OFFER_PRODUCTS = [
    ('calendar.webp', 'Calendar 20x30 cm', 'A ×1 · B ×1'),
    ('poza-15x20.webp', 'Fotografie 15x20 cm', 'A ×2 · B ×2'),
    ('poza-retro-10x12.webp', 'Fotografie retro 10x12 cm', 'A ×1 · B ×2'),
    ('poza-20x30.webp', 'Fotografie 20x30 cm', 'Doar în Extra · ×1'),
    ('felicitare-15x21.webp', 'Felicitare 15x21 cm', 'Doar în Extra · ×1'),
    ('felicitare-21x15.webp', 'Felicitare 21x15 cm', 'Doar în Extra · ×1'),
]


def render_offer_pdf(is_returning: bool) -> bytes:
    ensure_fonts()
    html = render_to_string('schools/offer_pdf.html', offer_context(is_returning))
    out = BytesIO()
    result = pisa.CreatePDF(html, dest=out, encoding='utf-8', link_callback=_offer_image)
    if result.err:
        raise RuntimeError(f"PDF rendering failed with {result.err} error(s)")
    return out.getvalue()


def offer_filename(is_returning: bool) -> str:
    suffix = '_clase_care_revin' if is_returning else ''
    return f"oferta_foto_craciun_{pricing.SEASON}{suffix}.pdf"
