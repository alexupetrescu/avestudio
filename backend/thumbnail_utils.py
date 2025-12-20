"""
Utility functions for generating and caching thumbnails from Google Drive images.
"""

import os
import hashlib
from io import BytesIO
from typing import Optional
from pathlib import Path
from django.conf import settings
from PIL import Image
import logging

logger = logging.getLogger(__name__)

# Thumbnail settings
THUMBNAIL_SIZE = (800, 800)  # Max dimensions for thumbnails
THUMBNAIL_QUALITY = 85  # JPEG quality for thumbnails
THUMBNAIL_CACHE_DIR = 'thumbnails'


def get_thumbnail_path(file_id: str) -> Path:
    """
    Get the file path for a cached thumbnail.
    
    Args:
        file_id: Google Drive file ID
        
    Returns:
        Path object for the thumbnail file
    """
    media_root = Path(settings.MEDIA_ROOT)
    thumbnail_dir = media_root / THUMBNAIL_CACHE_DIR
    thumbnail_dir.mkdir(parents=True, exist_ok=True)
    
    # Use file_id as filename (safe for filesystem)
    # Add .jpg extension for thumbnails
    return thumbnail_dir / f"{file_id}.jpg"


def generate_thumbnail(image_content: bytes, file_id: str) -> Optional[Path]:
    """
    Generate a thumbnail from image content and save it to cache.
    
    Args:
        image_content: Raw image bytes
        file_id: Google Drive file ID (for cache filename)
        
    Returns:
        Path to the saved thumbnail, or None if generation failed
    """
    try:
        # Open image from bytes
        image = Image.open(BytesIO(image_content))
        
        # Convert to RGB if necessary (for JPEG output)
        if image.mode in ('RGBA', 'LA', 'P'):
            # Create white background for transparent images
            rgb_image = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            rgb_image.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
            image = rgb_image
        elif image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Create thumbnail maintaining aspect ratio
        image.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
        
        # Save thumbnail
        thumbnail_path = get_thumbnail_path(file_id)
        image.save(thumbnail_path, 'JPEG', quality=THUMBNAIL_QUALITY, optimize=True)
        
        logger.info(f"Generated thumbnail for file {file_id}: {thumbnail_path}")
        return thumbnail_path
    
    except Exception as e:
        logger.error(f"Error generating thumbnail for file {file_id}: {str(e)}")
        return None


def get_or_create_thumbnail(file_id: str, image_content: bytes) -> Optional[Path]:
    """
    Get existing thumbnail or create a new one.
    
    Args:
        file_id: Google Drive file ID
        image_content: Raw image bytes (only used if thumbnail doesn't exist)
        
    Returns:
        Path to thumbnail file, or None if generation failed
    """
    thumbnail_path = get_thumbnail_path(file_id)
    
    # Return existing thumbnail if it exists
    if thumbnail_path.exists():
        return thumbnail_path
    
    # Generate new thumbnail
    return generate_thumbnail(image_content, file_id)


def get_thumbnail_url(file_id: str) -> str:
    """
    Get the URL for a thumbnail.
    
    Args:
        file_id: Google Drive file ID
        
    Returns:
        URL path to the thumbnail
    """
    return f"{settings.MEDIA_URL}{THUMBNAIL_CACHE_DIR}/{file_id}.jpg"

