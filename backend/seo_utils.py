"""
SEO utility functions for Django templates
"""
import re
from django.conf import settings
from django.template import Template, Context


def extract_first_image_from_html(html_content):
    """
    Extract the first image URL from HTML content
    """
    if not html_content:
        return None
    
    # Look for img tags
    img_pattern = r'<img[^>]+src=["\']([^"\']+)["\']'
    match = re.search(img_pattern, html_content, re.IGNORECASE)
    if match:
        return match.group(1)
    
    # Look for background-image in style attributes
    bg_pattern = r'background-image:\s*url\(["\']?([^"\']+)["\']?\)'
    match = re.search(bg_pattern, html_content, re.IGNORECASE)
    if match:
        return match.group(1)
    
    return None


def get_absolute_image_url(image_path):
    """
    Convert a relative image path to an absolute URL
    """
    if not image_path:
        return None
    
    if image_path.startswith('http://') or image_path.startswith('https://'):
        return image_path
    
    # Get the site URL from settings or use a default
    site_url = getattr(settings, 'SITE_URL', 'https://avestudio.ro')
    
    # Handle media URLs
    if image_path.startswith('/media/'):
        media_url = getattr(settings, 'MEDIA_URL', '/media/')
        return f"{site_url}{image_path}"
    
    # Handle static URLs
    if image_path.startswith('/static/'):
        return f"{site_url}{image_path}"
    
    # If it's already a full path, just prepend site URL
    if image_path.startswith('/'):
        return f"{site_url}{image_path}"
    
    # Otherwise, assume it's a media file
    media_url = getattr(settings, 'MEDIA_URL', '/media/')
    return f"{site_url}{media_url}{image_path}"


def get_first_image_from_queryset(queryset, image_field='image'):
    """
    Get the first image from a queryset
    """
    if not queryset or not queryset.exists():
        return None
    
    first_item = queryset.first()
    if hasattr(first_item, image_field):
        image = getattr(first_item, image_field)
        if image:
            return get_absolute_image_url(image.url if hasattr(image, 'url') else str(image))
    
    return None

