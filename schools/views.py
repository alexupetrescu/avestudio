"""
Public API for the schools flow (no auth; every call carries a PIN).

- Teacher order list:  /api/schools/class/<uuid>/...   (class PIN)
- Child album:         /api/schools/child/...           (child PIN)
"""

import os
import re
import urllib.parse
import zipfile
from io import BytesIO

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from backend.serializers import (
    ChildAlbumSerializer, ChildOrderSerializer, SchoolClassOrderSerializer,
)
from . import pricing
from .models import Child, SchoolClass


def _pin_from(request) -> str:
    return str(
        request.data.get('pin')
        or request.query_params.get('pin')
        or request.headers.get('X-Pin')
        or ''
    ).strip()


def _get_class(request, class_id) -> SchoolClass | None:
    pin = _pin_from(request)
    if not pin:
        return None
    return SchoolClass.objects.select_related('school').filter(id=class_id, pin=pin).first()


def _invalid_pin():
    return Response({'error': 'PIN invalid'}, status=status.HTTP_403_FORBIDDEN)


# --------------------------------------------------------------------------
# Teacher order list
# --------------------------------------------------------------------------

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def class_verify_pin(request, class_id):
    school_class = _get_class(request, class_id)
    if not school_class:
        return _invalid_pin()
    return Response({'valid': True, 'class_id': str(school_class.id)})


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def class_detail(request, class_id):
    school_class = _get_class(request, class_id)
    if not school_class:
        return _invalid_pin()
    return Response(SchoolClassOrderSerializer(school_class).data)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def class_add_child(request, class_id):
    school_class = _get_class(request, class_id)
    if not school_class:
        return _invalid_pin()
    serializer = ChildOrderSerializer(data=request.data, context={'school_class': school_class})
    serializer.is_valid(raise_exception=True)
    child = serializer.save(school_class=school_class)
    return Response(ChildOrderSerializer(child).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@authentication_classes([])
@permission_classes([AllowAny])
def class_child_detail(request, class_id, child_id):
    school_class = _get_class(request, class_id)
    if not school_class:
        return _invalid_pin()
    child = get_object_or_404(Child, id=child_id, school_class=school_class)
    if request.method == 'DELETE':
        if child.photos.exists():
            return Response(
                {'error': 'Copilul are deja fotografii în album; contactați fotograful pentru ștergere.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        child.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = ChildOrderSerializer(child, data=request.data, partial=True, context={'school_class': school_class})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


# --------------------------------------------------------------------------
# Child album
# --------------------------------------------------------------------------

def _get_child(request, child_id=None) -> Child | None:
    pin = _pin_from(request)
    child_id = child_id or request.data.get('child_id') or request.query_params.get('child_id')
    if not pin or not child_id:
        return None
    return (
        Child.objects.select_related('school_class__school')
        .filter(id=child_id, pin=pin)
        .first()
    )


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def child_verify_pin(request):
    child = _get_child(request)
    if not child:
        return Response({'error': 'PIN invalid pentru acest album'}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'valid': True, 'child_id': str(child.id)})


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def child_detail(request, child_id):
    child = _get_child(request, child_id)
    if not child:
        return Response({'error': 'PIN invalid pentru acest album'}, status=status.HTTP_403_FORBIDDEN)
    return Response(ChildAlbumSerializer(child, context={'request': request}).data)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def child_download(request):
    child = _get_child(request)
    if not child:
        return Response({'error': 'PIN invalid pentru acest album'}, status=status.HTTP_400_BAD_REQUEST)

    photos = child.photos.all()
    if not photos.exists():
        return Response({'error': 'Nu există fotografii în acest album'}, status=status.HTTP_404_NOT_FOUND)

    zip_buffer = BytesIO()
    seen = set()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for photo in photos:
            if not photo.image:
                continue
            name = photo.filename
            if name in seen:
                stem, ext = os.path.splitext(name)
                n = 2
                while f"{stem}_{n}{ext}" in seen:
                    n += 1
                name = f"{stem}_{n}{ext}"
            seen.add(name)
            photo.image.open('rb')
            try:
                zf.writestr(name, photo.image.read())
            finally:
                photo.image.close()
    zip_buffer.seek(0)

    safe = re.sub(r'[<>:"/\\|?*\x00]', '', child.full_name).replace(' ', '_').strip('_')[:120] or str(child.id)
    filename = f"album_{safe}.zip"
    response = HttpResponse(zip_buffer.read(), content_type='application/zip')
    ascii_fallback = filename.encode('ascii', 'ignore').decode('ascii') or f"album_{child.id}.zip"
    response['Content-Disposition'] = (
        f'attachment; filename="{ascii_fallback}"; filename*=UTF-8\'\'{urllib.parse.quote(filename)}'
    )
    return response


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def offer_prices(request):
    """Public pricing (used by the offer pages / order form fallback)."""
    return Response({
        'season': pricing.SEASON,
        'period': pricing.PERIOD,
        'list': pricing.LIST_PRICE,
        'new': pricing.PRICE_NEW,
        'returning': pricing.PRICE_RETURNING,
        'extras': pricing.EXTRAS,
    })
