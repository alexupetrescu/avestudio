import uuid
import qrcode
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
