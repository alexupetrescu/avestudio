from django.conf import settings
from django.core.checks import Error, register
from django.core.exceptions import ImproperlyConfigured

from backend.school_storage import validate_configuration


@register()
def check_r2_configuration(app_configs, **kwargs):
    if not settings.SCHOOLS_R2_ENABLED:
        return []
    try:
        validate_configuration(
            settings.SCHOOLS_R2_ENDPOINT, settings.SCHOOLS_R2_BUCKET,
            settings.SCHOOLS_R2_ACCESS_KEY_ID, settings.SCHOOLS_R2_SECRET_ACCESS_KEY,
        )
    except ImproperlyConfigured as error:
        return [Error(str(error), id='schools.E001')]
    return []
