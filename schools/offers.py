"""Session-specific offer definitions and validated child package selections."""
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

from . import pricing


def session_offers(school_class):
    if not school_class.session_id:
        return []
    session = school_class.session
    cached = getattr(session, '_prefetched_objects_cache', {}).get('package_offers')
    if cached is not None:
        return list(cached)
    return list(session.package_offers.select_related('package').prefetch_related('package__items'))


def catalog_for_class(school_class):
    offers = session_offers(school_class)
    if not offers:
        # Compatibility for classes that do not yet have a configured session offer.
        rows = []
        for key in pricing.LETTERS:
            base = key in pricing.PACKAGES
            package = pricing.PACKAGES.get(key, {})
            rows.append({
                'id': f'legacy:{key}', 'code': key.upper(), 'legacy_key': key,
                'name': pricing.label(key).removeprefix('Pachet '),
                'kind': 'base' if base else 'extra',
                'description': pricing.contents(key).removesuffix(' + ' + pricing.DIGITAL_NOTE),
                'digital_included': base, 'available': True,
                'price': Decimal(pricing.price(key, school_class.school.is_returning_customer)),
                'list_price': Decimal(package['list']) if base else None,
                'items': [{'quantity': quantity, 'name': name, 'format': ''} for quantity, name in package.get('items', [])],
                'image': None,
            })
        return rows
    rows = []
    for offer in offers:
        package = offer.package
        items = [{'quantity': item.quantity, 'name': item.name, 'format': item.format} for item in package.items.all()]
        contents = ', '.join(f"{item['quantity']} × {item['name']}" + (f" {item['format']}" if item['format'] else '') for item in items)
        rows.append({
            'id': str(offer.pk), 'code': offer.code, 'legacy_key': offer.legacy_key,
            'name': package.name, 'kind': package.kind,
            'description': package.description or contents,
            'digital_included': package.digital_included, 'available': offer.available,
            'price': offer.price_for(school_class.school.is_returning_customer),
            'list_price': offer.effective_list_price, 'items': items,
            'image': package.image.url if package.image else None,
        })
    return rows


def catalog_data(school_class):
    return [{**row, 'price': float(row['price']), 'list_price': float(row['list_price']) if row['list_price'] is not None else None} for row in catalog_for_class(school_class)]


def legacy_prices(school_class):
    values = pricing.prices_for(school_class.school.is_returning_customer)
    for offer in catalog_for_class(school_class):
        key = offer['legacy_key']
        if key:
            values[key] = float(offer['price'])
            if key in 'ab' and offer['list_price'] is not None:
                values['list_' + key] = float(offer['list_price'])
    return values


def offer_period(school_class):
    if school_class.session_id:
        session = school_class.session
        if session.offer_start or session.offer_end:
            start = session.offer_start.strftime('%d.%m.%Y') if session.offer_start else ''
            end = session.offer_end.strftime('%d.%m.%Y') if session.offer_end else ''
            return ' – '.join(value for value in (start, end) if value)
        if session_offers(school_class):
            return ''
    return pricing.PERIOD


def child_package_ids(child):
    if session_offers(child.school_class):
        if child._state.adding:
            return []
        return [str(offer.pk) for offer in child.package_choices.all()]
    return [f'legacy:{key}' for key in pricing.LETTERS if getattr(child, f'package_{key}')]


def validate_package_ids(school_class, values, child=None, require_base=True):
    if not isinstance(values, list) or len(values) > 256 or any(not isinstance(value, str) or not value or len(value) > 64 for value in values):
        raise ValidationError('Selecția pachetelor nu este validă.')
    if len(values) != len(set(values)):
        raise ValidationError('Un pachet nu poate fi selectat de două ori.')
    catalog = {offer['id']: offer for offer in catalog_for_class(school_class)}
    previous = set(child_package_ids(child)) if child is not None else set()
    chosen = []
    for value in values:
        if value not in catalog:
            raise ValidationError('Un pachet nu aparține acestei ședințe foto. Reîncărcați lista.')
        offer = catalog[value]
        if not offer['available'] and value not in previous:
            raise ValidationError('Acest pachet nu mai este disponibil pentru comenzi noi.')
        chosen.append(offer)
    bases = sum(offer['kind'] == 'base' for offer in chosen)
    if bases > 1:
        raise ValidationError('Alegeți un singur pachet de bază.')
    if bases == 0 and (require_base or chosen):
        raise ValidationError('Alegeți un pachet de bază înainte de a adăuga opționale.')
    return chosen


def set_child_packages(child, values, require_base=False):
    from .models import Child
    with transaction.atomic():
        # Lock only the child row; its nullable session relation must not be locked.
        locked = Child.objects.select_for_update().get(pk=child.pk)
        chosen = validate_package_ids(locked.school_class, values, child=locked, require_base=require_base)
        configured = bool(session_offers(locked.school_class))
        child.package_choices.set([offer['id'] for offer in chosen] if configured else [])
        selected_legacy = {offer['legacy_key'] for offer in chosen if offer['legacy_key']}
        flags = {f'package_{key}': key in selected_legacy for key in pricing.LETTERS}
        Child.objects.filter(pk=child.pk).update(**flags)
        for key, value in flags.items():
            setattr(child, key, value)
    return child


def sync_legacy_choices(child, moved=False, legacy_changed=True):
    catalog = catalog_for_class(child.school_class)
    if not session_offers(child.school_class):
        if moved:
            child.package_choices.clear()
        return
    by_key = {offer['legacy_key']: offer for offer in catalog if offer['legacy_key']}
    current = {str(offer.pk) for offer in child.package_choices.all()}
    if moved and not legacy_changed:
        values = [offer['id'] for offer in catalog if offer['id'] in current]
        if values and not any(offer['kind'] == 'base' and offer['id'] in values for offer in catalog):
            values = []
    else:
        selected = [key for key in pricing.LETTERS if getattr(child, f'package_{key}')]
        if any(key not in by_key for key in selected):
            raise ValidationError('Pachetele ședinței s-au schimbat. Reîncărcați lista pentru oferta curentă.')
        values = [by_key[key]['id'] for key in selected]
        has_legacy_base = any(by_key[key]['kind'] == 'base' for key in selected)
        values += [offer['id'] for offer in catalog if not offer['legacy_key'] and offer['id'] in current and not (has_legacy_base and offer['kind'] == 'base')]
    set_child_packages(child, values)


def default_package_ids(school_class):
    return [offer['id'] for offer in catalog_for_class(school_class) if offer['kind'] == 'base' and offer['available']][:1]
