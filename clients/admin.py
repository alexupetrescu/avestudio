from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.urls import path
from django.shortcuts import redirect, get_object_or_404
from django.contrib import messages
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
    actions = ['regenerate_qr_codes']
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
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
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
    
    def regenerate_qr_code(self, request, album_id):
        """Regenerate QR code for a single album"""
        album = get_object_or_404(ClientAlbum, pk=album_id)
        album.generate_qr_code()
        album.save()
        messages.success(request, f'QR code regenerated for "{album.title}".')
        return redirect('admin:clients_clientalbum_change', album_id)
    
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
        from django.template.response import TemplateResponse
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
