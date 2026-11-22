"""Authorize R2 photos before issuing a short-lived private download URL."""
from urllib.parse import parse_qs

from django.conf import settings
from django.core import signing
from django.http import HttpResponse, HttpResponseRedirect
from django.utils.cache import patch_cache_control, patch_vary_headers

from .school_storage import REMOTE, r2_client


class SchoolR2MediaMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        name = request.path.removeprefix('/media/')
        match = REMOTE.fullmatch(name) if request.path.startswith('/media/') else None
        if not match:
            return self.get_response(request)
        user = request.user
        allowed = user.is_authenticated and user.is_active and user.is_staff
        if not allowed and match[2] != 'refs':
            values = parse_qs(request.META.get('QUERY_STRING', ''), keep_blank_values=True).get('access', [])
            if len(values) == 1 and len(values[0]) <= 2048:
                try:
                    # Same signed-path protocol as the existing production media gate.
                    allowed = signing.loads(
                        values[0], salt='avestudio.private-photo.v1', max_age=3600,
                    ) == {'path': name}
                except (signing.BadSignature, ValueError, TypeError):
                    pass
        response = HttpResponse(status=404)
        if allowed:
            url = r2_client().generate_presigned_url(
                'get_object',
                Params={'Bucket': settings.SCHOOLS_R2_BUCKET, 'Key': name,
                        'ResponseCacheControl': 'private, no-store'},
                ExpiresIn=60,
            )
            response = HttpResponseRedirect(url)
        patch_cache_control(response, private=True, no_store=True, max_age=0)
        patch_vary_headers(response, ('Cookie',))
        response['Referrer-Policy'] = 'no-referrer'
        response['X-Content-Type-Options'] = 'nosniff'
        return response
