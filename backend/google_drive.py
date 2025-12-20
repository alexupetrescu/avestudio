"""
Google Drive API integration for reading images from public shared folders.

This module provides functions to connect to Google Drive and retrieve
images from publicly shared folders using the Google Drive API v3.
"""

import os
from typing import List, Dict, Optional
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import logging

logger = logging.getLogger(__name__)

# Supported image MIME types
IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml',
]


class GoogleDriveService:
    """Service class for interacting with Google Drive API."""
    
    def __init__(self, api_key: Optional[str] = None, credentials_path: Optional[str] = None):
        """
        Initialize Google Drive service.
        
        Args:
            api_key: API key for accessing public folders (simpler approach)
            credentials_path: Path to service account JSON credentials file
                            (for more advanced access)
        """
        self.api_key = api_key
        self.credentials_path = credentials_path
        self.service = None
        self._build_service()
    
    def _build_service(self):
        """Build and initialize the Google Drive API service."""
        try:
            if self.credentials_path and os.path.exists(self.credentials_path):
                # Use service account credentials
                credentials = service_account.Credentials.from_service_account_file(
                    self.credentials_path,
                    scopes=['https://www.googleapis.com/auth/drive.readonly']
                )
                self.service = build('drive', 'v3', credentials=credentials)
            elif self.api_key:
                # Use API key for public folder access
                self.service = build('drive', 'v3', developerKey=self.api_key)
            else:
                raise ValueError("Either api_key or credentials_path must be provided")
        except Exception as e:
            logger.error(f"Error building Google Drive service: {str(e)}")
            raise
    
    def list_files_in_folder(self, folder_id: str, include_folders: bool = False) -> List[Dict]:
        """
        List all files in a Google Drive folder.
        
        Args:
            folder_id: The ID of the Google Drive folder
            include_folders: Whether to include subfolders in results
            
        Returns:
            List of file dictionaries with metadata
        """
        if not self.service:
            raise ValueError("Google Drive service not initialized")
        
        try:
            # Query to get files in the folder
            query = f"'{folder_id}' in parents and trashed=false"
            
            # If we only want images, filter by MIME type
            if not include_folders:
                mime_types = " or ".join([f"mimeType='{mime}'" for mime in IMAGE_MIME_TYPES])
                query += f" and ({mime_types})"
            else:
                # Include folders and images
                mime_types = " or ".join([f"mimeType='{mime}'" for mime in IMAGE_MIME_TYPES])
                query += f" and (mimeType='application/vnd.google-apps.folder' or {mime_types})"
            
            results = []
            page_token = None
            
            while True:
                # Request files from the folder
                response = self.service.files().list(
                    q=query,
                    spaces='drive',
                    fields='nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webContentLink, thumbnailLink)',
                    pageToken=page_token,
                    pageSize=100
                ).execute()
                
                files = response.get('files', [])
                results.extend(files)
                
                page_token = response.get('nextPageToken')
                if not page_token:
                    break
            
            return results
        
        except HttpError as error:
            logger.error(f"Error listing files in folder {folder_id}: {str(error)}")
            raise
    
    def get_image_files(self, folder_id: str) -> List[Dict]:
        """
        Get only image files from a Google Drive folder.
        
        Args:
            folder_id: The ID of the Google Drive folder
            
        Returns:
            List of image file dictionaries with metadata
        """
        files = self.list_files_in_folder(folder_id, include_folders=False)
        
        # Filter to only image files and add direct download links
        image_files = []
        for file in files:
            if file.get('mimeType') in IMAGE_MIME_TYPES:
                # Generate direct download link
                file_id = file.get('id')
                if file_id:
                    # For public files, we can use webContentLink or generate a direct link
                    download_link = file.get('webContentLink')
                    if not download_link:
                        # Generate direct download link
                        download_link = f"https://drive.google.com/uc?export=view&id={file_id}"
                    
                    image_files.append({
                        'id': file_id,
                        'name': file.get('name'),
                        'mimeType': file.get('mimeType'),
                        'size': file.get('size'),
                        'createdTime': file.get('createdTime'),
                        'modifiedTime': file.get('modifiedTime'),
                        'thumbnailLink': file.get('thumbnailLink'),
                        'downloadLink': download_link,
                        'directLink': f"https://drive.google.com/uc?export=view&id={file_id}",
                    })
        
        return image_files
    
    def get_folder_info(self, folder_id: str) -> Optional[Dict]:
        """
        Get information about a Google Drive folder.
        
        Args:
            folder_id: The ID of the Google Drive folder
            
        Returns:
            Dictionary with folder metadata or None if not found
        """
        if not self.service:
            raise ValueError("Google Drive service not initialized")
        
        try:
            folder = self.service.files().get(
                fileId=folder_id,
                fields='id, name, mimeType, createdTime, modifiedTime'
            ).execute()
            
            return folder
        except HttpError as error:
            logger.error(f"Error getting folder info {folder_id}: {str(error)}")
            return None
    
    def get_file_content(self, file_id: str) -> Optional[bytes]:
        """
        Get the content of a file from Google Drive.
        
        Args:
            file_id: The ID of the file
            
        Returns:
            File content as bytes or None if error
        """
        if not self.service:
            raise ValueError("Google Drive service not initialized")
        
        try:
            request = self.service.files().get_media(fileId=file_id)
            file_content = request.execute()
            return file_content
        except HttpError as error:
            logger.error(f"Error getting file content {file_id}: {str(error)}")
            return None
    
    def get_file_metadata(self, file_id: str) -> Optional[Dict]:
        """
        Get metadata for a specific file.
        
        Args:
            file_id: The ID of the file
            
        Returns:
            Dictionary with file metadata or None if not found
        """
        if not self.service:
            raise ValueError("Google Drive service not initialized")
        
        try:
            file_metadata = self.service.files().get(
                fileId=file_id,
                fields='id, name, mimeType, size'
            ).execute()
            return file_metadata
        except HttpError as error:
            logger.error(f"Error getting file metadata {file_id}: {str(error)}")
            return None


def get_google_drive_service() -> Optional[GoogleDriveService]:
    """
    Factory function to create a GoogleDriveService instance from environment variables.
    
    Returns:
        GoogleDriveService instance or None if configuration is missing
    """
    api_key = os.getenv('GOOGLE_DRIVE_API_KEY')
    credentials_path = os.getenv('GOOGLE_DRIVE_CREDENTIALS_PATH')
    
    if not api_key and not credentials_path:
        logger.warning("Google Drive API key or credentials path not configured")
        return None
    
    try:
        return GoogleDriveService(api_key=api_key, credentials_path=credentials_path)
    except Exception as e:
        logger.error(f"Failed to initialize Google Drive service: {str(e)}")
        return None

