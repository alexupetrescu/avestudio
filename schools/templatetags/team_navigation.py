from django import template
from schools.assistant_views import user_data

register = template.Library()


@register.simple_tag
def team_crm_access(user):
    data = user_data(user)
    return bool(data and data['can_crm'])
