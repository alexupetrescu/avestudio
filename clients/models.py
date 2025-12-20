import uuid
import qrcode
import re
from io import BytesIO
from django.core.files import File
from django.db import models
from django.conf import settings
import random

def generate_pin():
    return str(random.randint(1000, 9999))

class ClientAlbum(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    pin = models.CharField(max_length=4, default=generate_pin)
    created_at = models.DateTimeField(auto_now_add=True)
    qr_code = models.ImageField(upload_to='qrcodes/', blank=True, null=True)

    def generate_qr_code(self):
        """Generate or regenerate the QR code with the current domain from settings"""
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        url = f"{frontend_url}/client/{self.id}"
        qr = qrcode.make(url)
        buffer = BytesIO()
        qr.save(buffer, format='PNG')
        # Delete old QR code if it exists
        if self.qr_code:
            self.qr_code.delete(save=False)
        self.qr_code.save(f'qr_{self.id}.png', File(buffer), save=False)

    def save(self, *args, **kwargs):
        if not self.qr_code:
            # Generate QR code with full domain URL
            self.generate_qr_code()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.pin})"

class AlbumImage(models.Model):
    album = models.ForeignKey(ClientAlbum, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='client_albums/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        # Show filename or a more descriptive identifier
        if self.image:
            filename = self.image.name.split('/')[-1]
            return f"{filename} (#{self.id})"
        return f"Image #{self.id}"
    
    @property
    def filename(self):
        """Return just the filename for display"""
        if self.image:
            return self.image.name.split('/')[-1]
        return "No image"


class GoogleDriveAlbum(models.Model):
    """Model for albums that pull images from Google Drive folders"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    folder_link = models.URLField(max_length=500, help_text="Paste the Google Drive folder share link here")
    folder_id = models.CharField(max_length=200, blank=True, editable=False, help_text="Extracted from folder link")
    created_at = models.DateTimeField(auto_now_add=True)
    qr_code = models.ImageField(upload_to='qrcodes/', blank=True, null=True)

    def extract_folder_id(self):
        """Extract folder ID from Google Drive URL"""
        if not self.folder_link:
            return None
        
        # Pattern 1: https://drive.google.com/drive/folders/FOLDER_ID
        match = re.search(r'/folders/([a-zA-Z0-9_-]+)', self.folder_link)
        if match:
            return match.group(1)
        
        # Pattern 2: https://drive.google.com/open?id=FOLDER_ID
        match = re.search(r'[?&]id=([a-zA-Z0-9_-]+)', self.folder_link)
        if match:
            return match.group(1)
        
        return None

    def generate_qr_code(self):
        """Generate or regenerate the QR code with the current domain from settings"""
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        url = f"{frontend_url}/drive/{self.id}"
        qr = qrcode.make(url)
        buffer = BytesIO()
        qr.save(buffer, format='PNG')
        # Delete old QR code if it exists
        if self.qr_code:
            self.qr_code.delete(save=False)
        self.qr_code.save(f'qr_drive_{self.id}.png', File(buffer), save=False)

    def save(self, *args, **kwargs):
        # Extract folder ID from link
        if self.folder_link:
            extracted_id = self.extract_folder_id()
            if extracted_id:
                self.folder_id = extracted_id
            else:
                raise ValueError("Could not extract folder ID from the provided Google Drive link. Please check the link format.")
        
        # Generate QR code if not exists
        if not self.qr_code:
            self.generate_qr_code()
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} (Drive: {self.folder_id[:20] if self.folder_id else 'N/A'}...)"
