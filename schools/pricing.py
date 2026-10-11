"""
Season pricing for the school / kindergarten offer (lei).

A and B are alternative packages (a child gets one or the other);
C, D and E are add-ons that can be ordered on their own or on top.
"""

SEASON = 2026
PERIOD = '9 noiembrie - 5 decembrie 2026'

PACKAGES = {
    'a': {
        'name': 'Pachet Standard',
        'list': 65,
        'new': 50,
        'returning': 45,
        'items': [
            (1, f'Calendar 20x30 cm cu design {SEASON + 1}'),
            (2, 'Fotografie 15x20 cm (fără grafică)'),
            (1, 'Fotografie retro 10x12 cm'),
        ],
    },
    'b': {
        'name': 'Pachet Extra',
        'list': 85,
        'new': 75,
        'returning': 65,
        'items': [
            (1, f'Calendar 20x30 cm cu design {SEASON + 1}'),
            (1, 'Felicitare 15x21 cm'),
            (1, 'Felicitare 21x15 cm'),
            (1, 'Fotografie 20x30 cm'),
            (2, 'Fotografie 15x20 cm'),
            (2, 'Fotografie retro 10x12 cm'),
        ],
    },
}

EXTRAS = {
    'c': {'label': 'Breloc 7x5 cm', 'price': 40},
    'd': {'label': 'Magnet frigider 6.5x6.5 cm', 'price': 20},
    'e': {'label': 'Puzzle 45 piese', 'price': 105},
}

LETTERS = ('a', 'b', 'c', 'd', 'e')
DIGITAL_NOTE = 'format digital inclus'


def package_price(key: str, is_returning: bool) -> int:
    pkg = PACKAGES[key]
    return pkg['returning'] if is_returning else pkg['new']


def price(key: str, is_returning: bool) -> int:
    """Price of any letter A-E for a school tier."""
    if key in PACKAGES:
        return package_price(key, is_returning)
    return EXTRAS[key]['price']


def contents(key: str) -> str:
    """'calendar 20x30, 2x foto 15x20, ...' for packages; label for extras."""
    if key in PACKAGES:
        parts = [f"{q}x {name}" if q > 1 else name for q, name in PACKAGES[key]['items']]
        return ', '.join(parts) + f' + {DIGITAL_NOTE}'
    return EXTRAS[key]['label']


def label(key: str) -> str:
    return PACKAGES[key]['name'] if key in PACKAGES else EXTRAS[key]['label']


def legend(is_returning: bool) -> list[dict]:
    """Rows for the PDF / admin legend."""
    return [
        {
            'letter': k.upper(),
            'key': k,
            'label': label(k),
            'contents': contents(k),
            'price': price(k, is_returning),
            'list': PACKAGES[k]['list'] if k in PACKAGES else None,
        }
        for k in LETTERS
    ]


def prices_for(is_returning: bool) -> dict:
    out = {k: price(k, is_returning) for k in LETTERS}
    out['list_a'] = PACKAGES['a']['list']
    out['list_b'] = PACKAGES['b']['list']
    return out


def tier_display(is_returning: bool) -> str:
    return f"Standard {package_price('a', is_returning)} · Extra {package_price('b', is_returning)} lei"
