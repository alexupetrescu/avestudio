from datetime import date
from django.db import migrations

# Frozen Christmas 2026 definitions; later catalog edits do not change this migration.
PACKAGES = [{'key': 'a',
  'name': 'Standard',
  'kind': 'base',
  'description': 'Calendar 20x30 cm cu design 2027, 2x Fotografie 15x20 cm (fără grafică), Fotografie retro '
                 '10x12 cm',
  'digital_included': True,
  'list_price': 65,
  'new_price': 50,
  'returning_price': 45,
  'items': [(1, 'Calendar 20x30 cm cu design 2027'),
            (2, 'Fotografie 15x20 cm (fără grafică)'),
            (1, 'Fotografie retro 10x12 cm')]},
 {'key': 'b',
  'name': 'Extra',
  'kind': 'base',
  'description': 'Calendar 20x30 cm cu design 2027, Felicitare 15x21 cm, Felicitare 21x15 cm, Fotografie '
                 '20x30 cm, 2x Fotografie 15x20 cm, 2x Fotografie retro 10x12 cm',
  'digital_included': True,
  'list_price': 85,
  'new_price': 75,
  'returning_price': 65,
  'items': [(1, 'Calendar 20x30 cm cu design 2027'),
            (1, 'Felicitare 15x21 cm'),
            (1, 'Felicitare 21x15 cm'),
            (1, 'Fotografie 20x30 cm'),
            (2, 'Fotografie 15x20 cm'),
            (2, 'Fotografie retro 10x12 cm')]},
 {'key': 'c',
  'name': 'Breloc 7x5 cm',
  'kind': 'extra',
  'description': 'Breloc 7x5 cm',
  'digital_included': False,
  'list_price': None,
  'new_price': 40,
  'returning_price': 40,
  'items': []},
 {'key': 'd',
  'name': 'Magnet frigider 6.5x6.5 cm',
  'kind': 'extra',
  'description': 'Magnet frigider 6.5x6.5 cm',
  'digital_included': False,
  'list_price': None,
  'new_price': 20,
  'returning_price': 20,
  'items': []},
 {'key': 'e',
  'name': 'Puzzle 45 piese',
  'kind': 'extra',
  'description': 'Puzzle 45 piese',
  'digital_included': False,
  'list_price': None,
  'new_price': 105,
  'returning_price': 105,
  'items': []}]


def seed_current_offers(apps, schema_editor):
    database = schema_editor.connection.alias
    Package = apps.get_model('schools', 'PhotoPackage')
    Item = apps.get_model('schools', 'PackageItem')
    Session = apps.get_model('schools', 'PhotoSession')
    Offer = apps.get_model('schools', 'SessionPackage')
    Child = apps.get_model('schools', 'Child')
    Choice = apps.get_model('schools', 'ChildPackageChoice')
    catalog = {}
    for definition in PACKAGES:
        values = {key: value for key, value in definition.items() if key not in ('key', 'items')}
        package = Package.objects.using(database).create(**values)
        catalog[definition['key']] = package
        for order, (quantity, name) in enumerate(definition['items']):
            Item.objects.using(database).create(package=package, quantity=quantity, name=name, sort_order=order)
    assigned = {}
    for session in Session.objects.using(database).all():
        if session.year == 2026 and any(word in session.name.lower() for word in ('crăciun', 'craciun', 'christmas')):
            session.offer_start, session.offer_end = date(2026, 11, 9), date(2026, 12, 5)
            session.save(update_fields=['offer_start', 'offer_end'])
        assigned[session.pk] = {}
        for order, definition in enumerate(PACKAGES):
            key = definition['key']
            offer = Offer.objects.using(database).create(session=session, package=catalog[key], code=key.upper(), sort_order=order, legacy_key=key)
            assigned[session.pk][key] = offer.pk
    batch = []
    for child in Child.objects.using(database).select_related('school_class').all().iterator(chunk_size=500):
        offers = assigned.get(child.school_class.session_id)
        if not offers:
            continue
        for key, offer_id in offers.items():
            if getattr(child, 'package_' + key):
                batch.append(Choice(child_id=child.pk, offer_id=offer_id))
        if len(batch) >= 500:
            Choice.objects.using(database).bulk_create(batch, batch_size=500)
            batch = []
    if batch:
        Choice.objects.using(database).bulk_create(batch, batch_size=500)


class Migration(migrations.Migration):
    dependencies = [('schools', '0008_session_package_catalog')]
    operations = [migrations.RunPython(seed_current_offers, migrations.RunPython.noop)]
