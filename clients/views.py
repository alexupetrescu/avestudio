import zipfile
import os
import re
from io import BytesIO
from django.http import HttpResponse
from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from .models import ClientAlbum
from backend.serializers import ClientAlbumSerializer

class ClientAlbumViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ClientAlbum.objects.all()
    serializer_class = ClientAlbumSerializer

@api_view(['POST'])
@authentication_classes([])  # <--- This tells Django: "Don't check for cookies/users here"
@permission_classes([AllowAny])
def verify_pin(request):
    pin = request.data.get('pin')
    album_id = request.data.get('album_id')
    
    if not pin:
        return Response({'error': 'PIN is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if not album_id:
        return Response({'error': 'Album ID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        album = ClientAlbum.objects.get(id=album_id, pin=pin)
        return Response({'album_id': str(album.id), 'valid': True})
    except ClientAlbum.DoesNotExist:
        return Response({'error': 'Invalid PIN for this album'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def download_album(request):
    """Download all images from an album as a ZIP file"""
    pin = request.data.get('pin')
    album_id = request.data.get('album_id')
    
    if not pin:
        return Response({'error': 'PIN is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if not album_id:
        return Response({'error': 'Album ID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Refresh album from database to ensure we have latest data
        album = ClientAlbum.objects.get(id=album_id, pin=pin)
        # Refresh from database to ensure we have the latest title
        album.refresh_from_db()
    except ClientAlbum.DoesNotExist:
        return Response({'error': 'Invalid PIN for this album'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get all images for this album
    images = album.images.all()
    
    if not images.exists():
        return Response({'error': 'No images in this album'}, status=status.HTTP_404_NOT_FOUND)
    
    # Create a ZIP file in memory
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for image in images:
            if image.image and os.path.exists(image.image.path):
                # Get the filename
                filename = image.filename
                # Add the image to the ZIP file
                zip_file.write(image.image.path, filename)
    
    # Prepare the response with album name in filename
    zip_buffer.seek(0)
    
    # Get album title - access directly from the model instance
    album_title = album.title
    
    # Sanitize album title for filename - be very permissive, only remove truly problematic chars
    if album_title and str(album_title).strip():
        # Only remove characters that are absolutely forbidden in filenames: < > : " / \ | ? * and null bytes
        # Keep everything else including Unicode, spaces, hyphens, etc.
        sanitized_title = re.sub(r'[<>:"/\\|?*\x00]', '', str(album_title))
        
        # Replace spaces with underscores for cleaner filenames
        sanitized_title = sanitized_title.replace(' ', '_')
        
        # Remove leading/trailing underscores
        sanitized_title = sanitized_title.strip('_')
        
        # Limit length (keep it reasonable for filenames)
        if len(sanitized_title) > 180:
            sanitized_title = sanitized_title[:180]
        
        # If we still have something after sanitization, use it
        if sanitized_title:
            filename = f"album_{sanitized_title}.zip"
        else:
            # If title was completely stripped (shouldn't happen), fallback to UUID
            filename = f"album_{album.id}.zip"
    else:
        # If no title, fallback to UUID
        filename = f"album_{album.id}.zip"
    
    response = HttpResponse(zip_buffer.read(), content_type='application/zip')
    # Use filename* format for better browser compatibility with special characters
    response['Content-Disposition'] = f'attachment; filename="{filename}"; filename*=UTF-8\'\'{filename}'
    return response
