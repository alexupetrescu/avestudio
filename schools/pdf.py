"""
PDF order list for a class (teacher page "Descarcă PDF" / "Printează", admin "Order list (PDF)").

Rendered with xhtml2pdf from templates/schools/class_list_pdf.html. DejaVu Sans is
bundled in static/fonts because the built-in PDF fonts have no ș / ț.
"""

from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.template.loader import render_to_string
from reportlab.lib.fonts import addMapping
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from xhtml2pdf import default as xhtml2pdf_default
from xhtml2pdf import pisa

from . import pricing

FONT_DIR = Path(settings.BASE_DIR) / 'static' / 'fonts'
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
