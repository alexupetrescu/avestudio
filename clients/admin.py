from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.urls import path
from django.shortcuts import redirect, get_object_or_404
from django.contrib import messages
from django.template.response import TemplateResponse
import re
import uuid
from collections import defaultdict
from .models import ClientAlbum, AlbumImage


class AlbumImageInline(admin.TabularInline):
    model = AlbumImage
    extra = 0
    fields = ('thumbnail', 'image', 'filename_display', 'created_at')
    readonly_fields = ('thumbnail', 'filename_display', 'created_at')
    can_delete = True
    verbose_name = "Image"
    verbose_name_plural = "Album Images"
    
    def thumbnail(self, obj):
        if obj and obj.pk and obj.image:
            return format_html(
                '<img src="{}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;" />',
                obj.image.url
            )
        return mark_safe('<span style="color: #999;">No image</span>')
    thumbnail.short_description = "Preview"
    
    def filename_display(self, obj):
        if obj and obj.pk:
            return obj.filename
        return "-"
    filename_display.short_description = "Filename"


@admin.register(ClientAlbum)
class ClientAlbumAdmin(admin.ModelAdmin):
    list_display = ('title', 'pin', 'image_count', 'created_at', 'qr_code_display')
    readonly_fields = ('pin', 'qr_code', 'qr_code_display', 'client_access_url')
    inlines = [AlbumImageInline]
    actions = ['regenerate_qr_codes', 'print_qr_codes']
    search_fields = ('title', 'pin')
    list_filter = ('created_at',)
    fieldsets = (
        ('Album Information', {
            'fields': ('title', 'pin', 'qr_code', 'qr_code_display')
        }),
        ('Client Access', {
            'fields': ('client_access_url',),
            'description': 'Share this URL with your client. They will need the PIN to access the album.'
        }),
    )
    change_form_template = 'admin/clients/clientalbum/change_form.html'
    change_list_template = 'admin/clients/clientalbum/change_list.html'
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('bulk-upload/', self.admin_site.admin_view(self.bulk_upload_with_auto_albums), name='clients_clientalbum_bulk_upload'),
            path('print-qr-codes/<str:album_ids>/', self.admin_site.admin_view(self.view_qr_codes_html), name='clients_clientalbum_print_qr_pdf'),
            path('<uuid:album_id>/upload-multiple/', self.admin_site.admin_view(self.upload_multiple_images), name='clients_clientalbum_upload_multiple'),
            path('<uuid:album_id>/regenerate-qr/', self.admin_site.admin_view(self.regenerate_qr_code), name='clients_clientalbum_regenerate_qr'),
        ]
        return custom_urls + urls
    
    def image_count(self, obj):
        return obj.images.count()
    image_count.short_description = 'Images'
    
    def qr_code_display(self, obj):
        if obj.qr_code:
            return format_html(
                '<img src="{}" style="max-width: 200px; max-height: 200px;" />',
                obj.qr_code.url
            )
        return "No QR code"
    qr_code_display.short_description = 'QR Code'
    
    def client_access_url(self, obj):
        """Display the full URL for client access"""
        from django.conf import settings
        # Try to get frontend URL from settings, default to localhost:3000 for dev
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        url = f"{frontend_url}/client/{obj.id}"
        regenerate_url = f"/admin/clients/clientalbum/{obj.id}/regenerate-qr/"
        return format_html(
            '<div style="padding: 10px; background: #f0f0f0; border-radius: 4px; margin: 10px 0;">'
            '<strong>Client Access URL:</strong><br>'
            '<a href="{}" target="_blank" style="color: #417690; word-break: break-all;">{}</a><br><br>'
            '<strong>PIN:</strong> <code style="background: #fff; padding: 2px 6px; border-radius: 3px; font-size: 14px;">{}</code><br><br>'
            '<a href="{}" class="button" style="background: #417690; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 8px;">Regenerate QR Code</a>'
            '</div>',
            url, url, obj.pin, regenerate_url
        )
    client_access_url.short_description = 'Client Access Information'
    
    def regenerate_qr_codes(self, request, queryset):
        """Admin action to regenerate QR codes for selected albums"""
        count = 0
        for album in queryset:
            album.generate_qr_code()
            album.save()
            count += 1
        self.message_user(request, f'Successfully regenerated QR codes for {count} album(s).')
    regenerate_qr_codes.short_description = 'Regenerate QR codes for selected albums'
    
    def print_qr_codes(self, request, queryset):
        """Admin action to print QR codes for selected albums"""
        album_ids = ','.join([str(album.id) for album in queryset])
        return redirect('admin:clients_clientalbum_print_qr_pdf', album_ids=album_ids)
    print_qr_codes.short_description = 'Print QR codes for selected albums'
    
    def regenerate_qr_code(self, request, album_id):
        """Regenerate QR code for a single album"""
        album = get_object_or_404(ClientAlbum, pk=album_id)
        album.generate_qr_code()
        album.save()
        messages.success(request, f'QR code regenerated for "{album.title}".')
        return redirect('admin:clients_clientalbum_change', album_id)
    
    def extract_base_name(self, filename):
        """Extract base name from filename like 'andrew (1)' -> 'andrew'"""
        # Remove file extension
        name_without_ext = re.sub(r'\.[^.]+$', '', filename)
        # Match pattern like "name (number)" or "name (x)"
        match = re.match(r'^(.+?)\s*\([^)]+\)\s*$', name_without_ext, re.IGNORECASE)
        if match:
            return match.group(1).strip()
        # If no pattern match, return the name without extension
        return name_without_ext.strip()
    
    def get_unique_album_title(self, base_title):
        """Get a unique album title, appending numbers if duplicate exists"""
        if not ClientAlbum.objects.filter(title=base_title).exists():
            return base_title
        
        counter = 2
        while True:
            new_title = f"{base_title} {counter}"
            if not ClientAlbum.objects.filter(title=new_title).exists():
                return new_title
            counter += 1
    
    def bulk_upload_with_auto_albums(self, request):
        """Bulk upload images and auto-create albums based on filenames"""
        if request.method == 'POST':
            files = request.FILES.getlist('images')
            scoala = request.POST.get('scoala', '').strip()
            
            if not files:
                messages.error(request, 'Please select at least one image to upload.')
                return redirect('admin:clients_clientalbum_bulk_upload')
            
            # Group files by base name
            grouped_files = defaultdict(list)
            for file in files:
                base_name = self.extract_base_name(file.name)
                # Capitalize first letter
                base_name = base_name.capitalize() if base_name else "Untitled"
                grouped_files[base_name].append(file)
            
            # Create albums and upload images
            albums_created = []
            total_images = 0
            
            for base_name, file_list in grouped_files.items():
                # Build album title
                if scoala:
                    album_title = f"{base_name} ({scoala})"
                else:
                    album_title = base_name
                
                # Ensure unique title
                album_title = self.get_unique_album_title(album_title)
                
                # Create or get album
                album, created = ClientAlbum.objects.get_or_create(
                    title=album_title,
                    defaults={}
                )
                
                if created:
                    albums_created.append(album_title)
                
                # Upload images to album
                for file in file_list:
                    AlbumImage.objects.create(album=album, image=file)
                    total_images += 1
            
            # Success message
            if albums_created:
                albums_msg = f"Created {len(albums_created)} new album(s): {', '.join(albums_created)}"
            else:
                albums_msg = "Images added to existing albums."
            
            messages.success(
                request, 
                f'Successfully uploaded {total_images} image(s). {albums_msg}'
            )
            return redirect('admin:clients_clientalbum_changelist')
        
        # GET request - show upload form
        context = {
            **self.admin_site.each_context(request),
            'title': 'Bulk Upload Images with Auto Album Creation',
            'opts': self.model._meta,
            'has_view_permission': self.has_view_permission(request),
        }
        return TemplateResponse(request, 'admin/clients/clientalbum/bulk_upload.html', context)
    
    def extract_album_name_without_parentheses(self, title):
        """Extract album name without content in parentheses"""
        import re
        # Remove everything in parentheses including the parentheses
        name = re.sub(r'\s*\([^)]*\)\s*', '', title)
        return name.strip() if name.strip() else title
    
    def view_qr_codes_html(self, request, album_ids):
        """View QR codes as HTML page (can be saved as PDF manually)"""
        from django.conf import settings
        import os
        
        # Parse album IDs
        album_id_list = [uuid.UUID(id.strip()) for id in album_ids.split(',') if id.strip()]
        albums = ClientAlbum.objects.filter(id__in=album_id_list).order_by('title')
        
        if not albums.exists():
            messages.error(request, 'No albums selected.')
            return redirect('admin:clients_clientalbum_changelist')
        
        # Prepare album data with cleaned names
        albums_data = []
        for album in albums:
            qr_url = None
            if album.qr_code:
                # Use absolute URL for HTML viewing
                qr_url = request.build_absolute_uri(album.qr_code.url)
            
            albums_data.append({
                'album': album,
                'name_without_parentheses': self.extract_album_name_without_parentheses(album.title),
                'pin': album.pin,
                'qr_code_url': qr_url,
            })
        
        # Prepare context for template
        context = {
            'albums_data': albums_data,
            'site_url': 'www.avestudio.ro',
        }
        
        # Return HTML template directly
        return TemplateResponse(request, 'admin/clients/clientalbum/qr_codes_pdf.html', context)
    
    def upload_multiple_images(self, request, album_id):
        """Handle multiple image uploads"""
        album = get_object_or_404(ClientAlbum, pk=album_id)
        
        if request.method == 'POST':
            files = request.FILES.getlist('images')
            uploaded_count = 0
            
            for file in files:
                AlbumImage.objects.create(album=album, image=file)
                uploaded_count += 1
            
            messages.success(request, f'Successfully uploaded {uploaded_count} image(s) to "{album.title}".')
            return redirect('admin:clients_clientalbum_change', album_id)
        
        # GET request - show upload form
        context = {
            **self.admin_site.each_context(request),
            'title': f'Upload Images to {album.title}',
            'album': album,
            'opts': self.model._meta,
            'has_view_permission': self.has_view_permission(request, album),
        }
        return TemplateResponse(request, 'admin/clients/clientalbum/upload_multiple.html', context)


@admin.register(AlbumImage)
class AlbumImageAdmin(admin.ModelAdmin):
    list_display = ('thumbnail', 'filename', 'album', 'created_at')
    list_filter = ('album', 'created_at')
    search_fields = ('album__title', 'image')
    readonly_fields = ('image_preview', 'created_at')
    fields = ('album', 'image', 'image_preview', 'created_at')
    
    def thumbnail(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="width: 50px; height: 50px; object-fit: cover;" />',
                obj.image.url
            )
        return "No image"
    thumbnail.short_description = "Thumbnail"
    
    def filename(self, obj):
        return obj.filename
    filename.short_description = "Filename"
    
    def image_preview(self, obj):
        if obj.pk and obj.image:
            return format_html(
                '<img src="{}" style="max-width: 500px; max-height: 500px; object-fit: contain;" />',
                obj.image.url
            )
        return "No image"
    image_preview.short_description = "Preview"
