import json

from django import template
from django.utils.html import escape
from django.utils.safestring import mark_safe

register = template.Library()


@register.filter
def matches_json(photo):
    """JSON list of a photo's matches for the review card (uses prefetched matches)."""
    data = [
        {'child_id': str(m.child_id), 'name': m.child.full_name, 'source': m.source, 'confidence': m.confidence}
        for m in photo.matches.all()
    ]
    return mark_safe(escape(json.dumps(data)))
