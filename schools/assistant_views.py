"""Small, deliberately bounded CMS API. Grants never require Django staff access."""

from functools import wraps
import hashlib
import json
import logging
import mimetypes

from django.contrib.auth import authenticate, login, logout
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.paginator import Paginator
from django.db import IntegrityError, transaction
from django.db.models import Count, Prefetch
from django.http import FileResponse, Http404, JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils.cache import patch_cache_control, patch_vary_headers
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods
from rest_framework import serializers

from backend.serializers import ChildOrderSerializer

from .forms import QueuedPhotoForm
from .offers import catalog_data, default_package_ids
from .models import AssistantUploadReceipt, Child, ClassPhoto, FaceReference, PhotoMatch, SchoolClass

logger = logging.getLogger(__name__)


def endpoint(methods, *, public=False):
    def decorate(view):
        @wraps(view)
        def handle(request, *args, **kwargs):
            if not public and not (request.user.is_authenticated and request.user.is_active):
                response = JsonResponse({'error': 'Sesiunea a expirat. Autentifică-te din nou.'}, status=401)
            else:
                try:
                    response = view(request, *args, **kwargs)
                except Http404:
                    response = JsonResponse({'error': 'Înregistrarea nu este disponibilă.'}, status=404)
                except (json.JSONDecodeError, UnicodeDecodeError, ValidationError) as error:
                    message = 'Datele trimise nu sunt valide.'
                    if isinstance(error, ValidationError):
                        message = ' '.join(error.messages)
                    response = JsonResponse({'error': message}, status=400)
            patch_cache_control(response, private=True, no_store=True, max_age=0)
            patch_vary_headers(response, ('Cookie',))
            response['X-Content-Type-Options'] = 'nosniff'
            response['Referrer-Policy'] = 'no-referrer'
            response['X-Robots-Tag'] = 'noindex, nofollow'
            return response
        return require_http_methods(methods)(csrf_protect(handle))
    return decorate


def accessible_classes(user):
    queryset = SchoolClass.objects.select_related('school', 'session')
    if user.is_superuser:
        return queryset
    return queryset.filter(assistant_assignments__user=user)


def scoped_child(request, class_id, child_id):
    school_class = get_object_or_404(accessible_classes(request.user), pk=class_id)
    return get_object_or_404(Child.objects.select_related('school_class__school'), pk=child_id, school_class=school_class)


def payload(request):
    data = json.loads(request.body)
    if not isinstance(data, dict):
        raise ValidationError('Datele trimise nu sunt valide.')
    return data


def user_data(user):
    if not (user.is_authenticated and user.is_active):
        return None
    return {
        'username': user.get_username(), 'name': user.get_full_name() or user.get_username(),
        'can_admin': user.is_staff,
        'can_crm': user.is_superuser or accessible_classes(user).exists(),
    }


@endpoint(['GET'], public=True)
def session(request):
    return JsonResponse({'user': user_data(request.user), 'csrfToken': get_token(request)})


@endpoint(['POST'], public=True)
def sign_in(request):
    data = payload(request)
    username, password = data.get('username'), data.get('password')
    if not isinstance(username, str) or not isinstance(password, str) or len(username) > 150 or len(password) > 1024:
        return JsonResponse({'error': 'Completează utilizatorul și parola.'}, status=400)
    # Never trust a client-supplied forwarding header for the rate-limit identity.
    identity = f"{request.META.get('REMOTE_ADDR', '')}:{username.strip().casefold()}"
    key = 'crm-login:' + hashlib.sha256(identity.encode()).hexdigest()
    cache.add(key, 0, timeout=300)
    try:
        attempts = cache.incr(key)
    except ValueError:  # Expired between add and incr.
        cache.set(key, 1, timeout=300)
        attempts = 1
    if attempts > 8:
        response = JsonResponse({'error': 'Prea multe încercări. Încearcă din nou peste 5 minute.'}, status=429)
        response['Retry-After'] = '300'
        return response
    user = authenticate(request, username=username.strip(), password=password)
    if user is None or not (user.is_superuser or accessible_classes(user).exists()):
        return JsonResponse({'error': 'Utilizator, parolă sau acces CRM nevalid.'}, status=401)
    login(request, user)
    request.session.set_expiry(12 * 60 * 60)
    cache.delete(key)
    return JsonResponse({'user': user_data(user), 'csrfToken': get_token(request)})


@endpoint(['POST'])
def sign_out(request):
    logout(request)
    return JsonResponse({'user': None, 'csrfToken': get_token(request)})


def class_data(school_class):
    return {
        'id': str(school_class.pk), 'name': school_class.name,
        'school_name': school_class.school.name, 'city': school_class.school.city,
        'session_label': school_class.session_label, 'shoot_display': school_class.shoot_display,
        'teacher_name': school_class.teacher_name,
        'child_count': school_class.child_count, 'photo_count': school_class.photo_count,
        'prices': school_class.prices,
        'offers': catalog_data(school_class),
        'created_at': school_class.created_at.isoformat(),
    }


def class_queryset(user):
    return accessible_classes(user).prefetch_related('session__package_offers__package__items').annotate(child_count=Count('children', distinct=True), photo_count=Count('photos', distinct=True))


def child_data(child):
    references = list(child.face_references.all())
    latest = references[0] if references else None
    reference_url = reverse('assistant:reference-preview', args=[child.school_class_id, child.pk]) if latest else None
    return {
        **ChildOrderSerializer(child).data,
        'created_at': child.created_at.isoformat() if child.created_at else None,
        'entry_index': child.entry_index, 'photo_count': child.photo_count,
        'reference_url': f'{reference_url}?v={latest.pk}' if latest else None,
    }


def children_queryset():
    return Child.objects.select_related('school_class__school', 'school_class__session').annotate(photo_count=Count('photos', distinct=True)).prefetch_related(
        'school_class__session__package_offers__package__items', 'package_choices__package',
        Prefetch('face_references', queryset=FaceReference.objects.order_by('-created_at', '-pk')),
    ).order_by('entry_index')


@endpoint(['GET'])
def classes(request):
    return JsonResponse({'classes': [class_data(item) for item in class_queryset(request.user)]})


@endpoint(['GET'])
def class_detail(request, class_id):
    school_class = get_object_or_404(class_queryset(request.user), pk=class_id)
    return JsonResponse({
        'class': class_data(school_class),
        'children': [child_data(child) for child in children_queryset().filter(school_class=school_class)],
    })


class CrmChildOrderSerializer(ChildOrderSerializer):
    def validate(self, attrs):
        attrs = super().validate(attrs)
        if 'package_ids' in attrs:
            return attrs
        editing_packages = any(f'package_{letter}' in attrs for letter in 'abcde')
        if (self.instance is None or editing_packages) and not (
            attrs.get('package_a', getattr(self.instance, 'package_a', False))
            or attrs.get('package_b', getattr(self.instance, 'package_b', False))
        ):
            raise serializers.ValidationError('Alegeți Pachetul Standard (A) sau Pachetul Extra (B).')
        return attrs


def save_child(request, school_class, instance=None):
    data = payload(request)
    # Reject arrays, nulls and objects rather than coercing them to a person's name.
    if any(not isinstance(data.get(key, ''), str) for key in ('first_name', 'last_name', 'notes')):
        raise ValidationError('Numele, prenumele și observațiile trebuie să fie text.')
    if instance is None and 'package_ids' not in data and not any(f'package_{letter}' in data for letter in 'ab'):
        data = {**data, 'package_a': True} if any(f'package_{letter}' in data for letter in 'cde') else {**data, 'package_ids': default_package_ids(school_class)}
    serializer = CrmChildOrderSerializer(instance, data=data, partial=instance is not None, context={'school_class': school_class})
    if not serializer.is_valid():
        return JsonResponse({'error': ' '.join(str(error) for errors in serializer.errors.values() for error in errors)}, status=400)
    try:
        with transaction.atomic():
            child = serializer.save(school_class=school_class)
    except IntegrityError:
        return JsonResponse({'error': 'Acest copil este deja în clasă.'}, status=409)
    return JsonResponse({'child': child_data(children_queryset().get(pk=child.pk))}, status=200 if instance else 201)


@endpoint(['POST'])
def add_child(request, class_id):
    school_class = get_object_or_404(accessible_classes(request.user), pk=class_id)
    return save_child(request, school_class)


@endpoint(['GET', 'PATCH'])
def edit_child(request, class_id, child_id):
    child = scoped_child(request, class_id, child_id)
    if request.method == 'PATCH':
        return save_child(request, child.school_class, instance=child)
    return JsonResponse({'child': child_data(children_queryset().get(pk=child.pk)), 'prices': child.school_class.prices, 'offers': catalog_data(child.school_class)})


def store_upload(request, child, kind):
    form = QueuedPhotoForm({'key': request.POST.get('key'), 'kind': 'images'}, request.FILES)
    if not form.is_valid():
        return JsonResponse({'error': ' '.join(str(error) for errors in form.errors.values() for error in errors)}, status=400)
    image = form.cleaned_data['image']
    try:
        with transaction.atomic():
            # The unique key serializes simultaneous retries across workers.
            receipt, created = AssistantUploadReceipt.objects.get_or_create(
                user=request.user, key=form.cleaned_data['key'],
                defaults={'child': child, 'kind': kind, 'filename': image.name, 'size': image.size},
            )
            if not created:
                if (receipt.child_id, receipt.kind, receipt.filename, receipt.size) != (child.pk, kind, image.name, image.size):
                    return JsonResponse({'error': 'Identificatorul aparține altei fotografii.'}, status=409)
                return JsonResponse({'ok': True, 'duplicate': True})
            if kind == 'reference':
                FaceReference.objects.create(child=child, image=image)
            else:
                photo = ClassPhoto.objects.create(school_class=child.school_class, image=image)
                PhotoMatch.objects.create(photo=photo, child=child, source=PhotoMatch.SOURCE_MANUAL)
    except (OSError, ValueError):
        logger.exception('CRM image upload failed for child %s', child.pk)
        return JsonResponse({'error': 'Fotografia nu a putut fi salvată. Reîncearcă.'}, status=503)
    return JsonResponse({'ok': True}, status=201)


@endpoint(['GET', 'POST'])
def child_photos(request, class_id, child_id):
    child = scoped_child(request, class_id, child_id)
    if request.method == 'POST':
        return store_upload(request, child, 'photo')
    page = Paginator(child.photos.all().order_by('-created_at', '-pk'), 24).get_page(request.GET.get('page', 1))
    return JsonResponse({
        'photos': [{
            'id': photo.pk, 'filename': photo.filename,
            'url': reverse('assistant:photo-preview', args=[class_id, child_id, photo.pk]),
        } for photo in page],
        'page': page.number, 'pages': page.paginator.num_pages, 'count': page.paginator.count,
    })


@endpoint(['POST'])
def reference_photo(request, class_id, child_id):
    return store_upload(request, scoped_child(request, class_id, child_id), 'reference')


def image_response(image):
    if not image:
        raise Http404
    try:
        return FileResponse(image.open('rb'), content_type=mimetypes.guess_type(image.name)[0] or 'application/octet-stream')
    except FileNotFoundError:
        raise Http404


@endpoint(['GET'])
def photo_preview(request, class_id, child_id, photo_id):
    child = scoped_child(request, class_id, child_id)
    photo = get_object_or_404(child.photos.all(), pk=photo_id, school_class_id=class_id)
    return image_response(photo.thumb or photo.web or photo.image)


@endpoint(['GET'])
def reference_preview(request, class_id, child_id):
    child = scoped_child(request, class_id, child_id)
    reference = child.face_references.order_by('-created_at', '-pk').first()
    if not reference:
        raise Http404
    return image_response(reference.image)
