"""
Resized image variants (web + thumbnail) for uploaded photos.

Works purely through Django's storage API (ContentFile in, ImageField out), so
moving media to Cloudflare R2 / Images later only needs a storage backend
change, not a change here.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from io import BytesIO
from pathlib import PurePosixPath

from django.conf import settings
from django.core.files.base import ContentFile
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

WEB_MAX = getattr(settings, 'IMAGE_WEB_MAX', 1600)
THUMB_MAX = getattr(settings, 'IMAGE_THUMB_MAX', 400)
WEB_QUALITY = 85
THUMB_QUALITY = 80


@dataclass
class VariantResult:
    web: ContentFile
    thumb: ContentFile
    width: int
    height: int


def _to_rgb(image: Image.Image) -> Image.Image:
    """Flatten transparency onto white and force RGB (JPEG output)."""
    if image.mode in ('RGBA', 'LA', 'P'):
        if image.mode == 'P':
            image = image.convert('RGBA')
        background = Image.new('RGB', image.size, (255, 255, 255))
        background.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
        return background
    if image.mode != 'RGB':
        return image.convert('RGB')
    return image


def _encode(image: Image.Image, max_side: int, quality: int, name: str) -> ContentFile:
    copy = image.copy()
    copy.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    buffer = BytesIO()
    copy.save(buffer, 'JPEG', quality=quality, optimize=True, progressive=True)
    return ContentFile(buffer.getvalue(), name=name)


def variant_name(original_name: str, suffix: str) -> str:
    """'schools/x/orig/DSC01.jpg' -> 'DSC01_web.jpg' (basename only; upload_to adds the folder)."""
    stem = PurePosixPath(original_name).stem
    return f"{stem}_{suffix}.jpg"


def build_variants(file_obj, original_name: str) -> VariantResult:
    """
    Open an uploaded/stored image file and return web + thumb JPEG variants.

    `file_obj` is any file-like opened for binary reading (Django File works).
    """
    file_obj.seek(0)
    image = Image.open(file_obj)
    image.load()
    image = ImageOps.exif_transpose(image)
    image = _to_rgb(image)
    width, height = image.size

    web = _encode(image, WEB_MAX, WEB_QUALITY, variant_name(original_name, 'web'))
    thumb = _encode(image, THUMB_MAX, THUMB_QUALITY, variant_name(original_name, 'thumb'))
    return VariantResult(web=web, thumb=thumb, width=width, height=height)
