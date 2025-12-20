"""
Views for Google Drive integration.
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from backend.google_drive import get_google_drive_service
from backend.serializers import GoogleDriveImageSerializer
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
def list_google_drive_images(request):
    """
    API endpoint to list images from a Google Drive folder.
    
    Query parameters:
        folder_id: (required) The Google Drive folder ID
        include_folders: (optional) Whether to include subfolders (default: false)
    
    Returns:
        JSON response with list of images from the folder
    """
    folder_id = request.query_params.get('folder_id')
    
    if not folder_id:
        return Response(
            {'error': 'folder_id query parameter is required'},
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
        # Get images from the folder
        images = drive_service.get_image_files(folder_id)
        
        # Serialize the data
        serializer = GoogleDriveImageSerializer(images, many=True)
        
        return Response({
            'success': True,
            'count': len(images),
            'folder_id': folder_id,
            'images': serializer.data
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Error fetching images from Google Drive folder {folder_id}: {str(e)}")
        return Response(
            {'error': f'Failed to fetch images: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_google_drive_folder_info(request):
    """
    API endpoint to get information about a Google Drive folder.
    
    Query parameters:
        folder_id: (required) The Google Drive folder ID
    
    Returns:
        JSON response with folder information
    """
    folder_id = request.query_params.get('folder_id')
    
    if not folder_id:
        return Response(
            {'error': 'folder_id query parameter is required'},
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
        # Get folder info
        folder_info = drive_service.get_folder_info(folder_id)
        
        if not folder_info:
            return Response(
                {'error': 'Folder not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({
            'success': True,
            'folder': folder_info
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Error fetching folder info from Google Drive {folder_id}: {str(e)}")
        return Response(
            {'error': f'Failed to fetch folder info: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

