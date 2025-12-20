import zipfile
import os
import re
from io import BytesIO
from django.http import HttpResponse
from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from .models import ClientAlbum, GoogleDriveAlbum
from backend.serializers import ClientAlbumSerializer, GoogleDriveAlbumSerializer
from backend.google_drive import get_google_drive_service
import logging

logger = logging.getLogger(__name__)

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


class GoogleDriveAlbumViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Google Drive Albums"""
    queryset = GoogleDriveAlbum.objects.all()
    serializer_class = GoogleDriveAlbumSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve album and fetch images from Google Drive"""
        instance = self.get_object()
        
        if not instance.folder_id:
            return Response(
                {'error': 'No folder ID configured for this album'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get Google Drive service
        drive_service = get_google_drive_service()
        
        if not drive_service:
            return Response(
                {'error': 'Google Drive service is not configured. Please check your environment variables.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        try:
            # Fetch images from Google Drive
            images = drive_service.get_image_files(instance.folder_id)
            
            # Serialize the album
            serializer = self.get_serializer(instance)
            data = serializer.data
            
            # Add images from Google Drive
            from backend.serializers import GoogleDriveImageSerializer
            image_serializer = GoogleDriveImageSerializer(images, many=True, context={'request': request})
            data['images'] = image_serializer.data
            
            return Response(data)
        
        except Exception as e:
            logger.error(f"Error fetching images from Google Drive for album {instance.id}: {str(e)}")
            return Response(
                {'error': f'Failed to fetch images from Google Drive: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def proxy_google_drive_image(request, file_id):
    """
    Proxy endpoint to serve Google Drive images through the backend.
    This allows authenticated access to images using service account credentials.
    Supports ?thumbnail=true query parameter for thumbnail generation.
    """
    from backend.google_drive import get_google_drive_service
    from backend.thumbnail_utils import get_or_create_thumbnail, get_thumbnail_path
    from django.conf import settings
    from pathlib import Path
    
    drive_service = get_google_drive_service()
    
    if not drive_service:
        return Response(
            {'error': 'Google Drive service is not configured'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    # Check if thumbnail is requested
    is_thumbnail = request.query_params.get('thumbnail', 'false').lower() == 'true'
    
    try:
        # If thumbnail requested, try to serve cached thumbnail first
        if is_thumbnail:
            thumbnail_path = get_thumbnail_path(file_id)
            if thumbnail_path.exists():
                with open(thumbnail_path, 'rb') as f:
                    thumbnail_content = f.read()
                response = HttpResponse(thumbnail_content, content_type='image/jpeg')
                response['Cache-Control'] = 'public, max-age=86400'  # Cache for 24 hours
                return response
        
        # Get file metadata to determine content type
        file_metadata = drive_service.get_file_metadata(file_id)
        if not file_metadata:
            return Response(
                {'error': 'File not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get file content
        file_content = drive_service.get_file_content(file_id)
        if not file_content:
            return Response(
                {'error': 'Failed to retrieve file content'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # If thumbnail requested, generate it
        if is_thumbnail:
            thumbnail_path = get_or_create_thumbnail(file_id, file_content)
            if thumbnail_path and thumbnail_path.exists():
                with open(thumbnail_path, 'rb') as f:
                    thumbnail_content = f.read()
                response = HttpResponse(thumbnail_content, content_type='image/jpeg')
                response['Cache-Control'] = 'public, max-age=86400'  # Cache for 24 hours
                return response
            # Fall through to full image if thumbnail generation fails
        
        # Determine content type
        mime_type = file_metadata.get('mimeType', 'application/octet-stream')
        
        # Create response with file content
        response = HttpResponse(file_content, content_type=mime_type)
        response['Content-Disposition'] = f'inline; filename="{file_metadata.get("name", "image")}"'
        response['Cache-Control'] = 'public, max-age=3600'  # Cache for 1 hour
        
        return response
    
    except Exception as e:
        logger.error(f"Error proxying Google Drive image {file_id}: {str(e)}")
        return Response(
            {'error': f'Failed to retrieve image: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
