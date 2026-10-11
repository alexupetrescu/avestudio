"""Season pricing for the school / kindergarten offer (lei)."""

SEASON = 2026
PERIOD = '9 noiembrie - 5 decembrie 2026'

LIST_PRICE = 85          # crossed-out list price
PRICE_NEW = 75           # package A, new schools
PRICE_RETURNING = 70     # package A, returning schools

EXTRAS = {
    'b': {'label': 'Breloc 7x5 cm', 'price': 40},
    'c': {'label': 'Magnet frigider 6.5x6.5 cm', 'price': 25},
    'd': {'label': 'Puzzle 45 piese', 'price': 105},
}

PACKAGE_A_LABEL = 'Pachet A - calendar, 2 felicitări, foto 20x30, 15x20, retro 10x12 + digital'


def price_a(is_returning: bool) -> int:
    return PRICE_RETURNING if is_returning else PRICE_NEW


def prices_for(is_returning: bool) -> dict:
    return {
        'list': LIST_PRICE,
        'a': price_a(is_returning),
        'b': EXTRAS['b']['price'],
        'c': EXTRAS['c']['price'],
        'd': EXTRAS['d']['price'],
    }
