from django.contrib import admin
from django.contrib import messages
from django.db.models import Count
from django.http import JsonResponse
from django.shortcuts import redirect, get_object_or_404
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe
import re
import uuid
from collections import defaultdict
from .models import ClientAlbum, AlbumImage, GoogleDriveAlbum


def _is_image(uploaded_file):
    """Server-side guard: only accept files the browser identifies as images."""
    content_type = getattr(uploaded_file, 'content_type', '') or ''
    return content_type.startswith('image/')


def _upload_response(request, url_name, *args):
    """Redirect after an upload. For AJAX uploads (progress bar), return the target
    URL as JSON so queued messages survive until the browser actually navigates."""
    url = reverse(url_name, args=args or None)
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({'redirect': url})
    return redirect(url)


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
                '<img src="{}" class="ave-thumb" loading="lazy" alt="" />',
                obj.image.url
            )
        return mark_safe('<span class="ave-muted">No image</span>')
    thumbnail.short_description = "Preview"

    def filename_display(self, obj):
        if obj and obj.pk:
            return obj.filename
        return "-"
    filename_display.short_description = "Filename"


@admin.register(ClientAlbum)
class ClientAlbumAdmin(admin.ModelAdmin):
    list_display = ('title', 'pin_display', 'image_count', 'created_at', 'qr_code_display')
    readonly_fields = ('pin', 'qr_code', 'qr_code_display', 'client_access_url')
    inlines = [AlbumImageInline]
    actions = ['regenerate_qr_codes', 'print_qr_codes']
    search_fields = ('title', 'pin')
    list_filter = ('created_at',)
    list_per_page = 50
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

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_image_count=Count('images'))

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('bulk-upload/', self.admin_site.admin_view(self.bulk_upload_with_auto_albums), name='clients_clientalbum_bulk_upload'),
            path('print-qr-codes/<str:album_ids>/', self.admin_site.admin_view(self.view_qr_codes_html), name='clients_clientalbum_print_qr_pdf'),
            path('<uuid:album_id>/upload-multiple/', self.admin_site.admin_view(self.upload_multiple_images), name='clients_clientalbum_upload_multiple'),
            path('<uuid:album_id>/regenerate-qr/', self.admin_site.admin_view(self.regenerate_qr_code), name='clients_clientalbum_regenerate_qr'),
        ]
        return custom_urls + urls

    def pin_display(self, obj):
        return format_html('<span class="ave-pin">{}</span>', obj.pin)
    pin_display.short_description = 'PIN'
    pin_display.admin_order_field = 'pin'

    def image_count(self, obj):
        return obj._image_count
    image_count.short_description = 'Images'
    image_count.admin_order_field = '_image_count'

    def qr_code_display(self, obj):
        if obj and obj.pk and obj.qr_code:
            return format_html(
                '<img src="{}" class="ave-qr" loading="lazy" alt="QR code" />',
                obj.qr_code.url
            )
        return "No QR code"
    qr_code_display.short_description = 'QR Code'

    def client_access_url(self, obj):
        """Display the full URL for client access"""
        if not obj or not obj.pk:
            return mark_safe('<span class="ave-muted">Save the album first to see the client access link.</span>')
        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        url = f"{frontend_url}/client/{obj.id}"
        regenerate_url = reverse('admin:clients_clientalbum_regenerate_qr', args=[obj.pk])
        return format_html(
            '<div class="ave-access-panel">'
            '<div class="ave-access-row"><span class="ave-access-label">Client URL</span>'
            '<a href="{}" target="_blank" rel="noopener">{}</a></div>'
            '<div class="ave-access-row"><span class="ave-access-label">PIN</span>'
            '<span class="ave-pin">{}</span></div>'
            '<a href="{}" class="button ave-inline-button">Regenerate QR Code</a>'
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
            add_to_existing = request.POST.get('add_to_existing') == 'on'

            if not files:
                messages.error(request, 'Please select at least one image to upload.')
                return _upload_response(request, 'admin:clients_clientalbum_bulk_upload')

            skipped = [f.name for f in files if not _is_image(f)]
            files = [f for f in files if _is_image(f)]

            if not files:
                messages.error(request, 'None of the selected files are images. Nothing was uploaded.')
                return _upload_response(request, 'admin:clients_clientalbum_bulk_upload')

            # Group files by base name
            grouped_files = defaultdict(list)
            for file in files:
                base_name = self.extract_base_name(file.name)
                # Capitalize first letter
                base_name = base_name.capitalize() if base_name else "Untitled"
                grouped_files[base_name].append(file)

            # Create albums and upload images
            albums_created = []
            albums_updated = []
            total_images = 0

            for base_name, file_list in grouped_files.items():
                # Build album title
                if scoala:
                    album_title = f"{base_name} ({scoala})"
                else:
                    album_title = base_name

                if add_to_existing:
                    # Merge into an existing album with the exact same title, if any
                    album, created = ClientAlbum.objects.get_or_create(title=album_title)
                else:
                    # Always create a fresh album, numbering the title if taken
                    album = ClientAlbum.objects.create(title=self.get_unique_album_title(album_title))
                    created = True

                if created:
                    albums_created.append(album.title)
                else:
                    albums_updated.append(album.title)

                # Upload images to album
                for file in file_list:
                    AlbumImage.objects.create(album=album, image=file)
                    total_images += 1

            # Success message
            parts = [f'Successfully uploaded {total_images} image(s).']
            if albums_created:
                parts.append(f"Created {len(albums_created)} new album(s): {', '.join(albums_created)}.")
            if albums_updated:
                parts.append(f"Added images to {len(albums_updated)} existing album(s): {', '.join(albums_updated)}.")
            messages.success(request, ' '.join(parts))

            if skipped:
                messages.warning(
                    request,
                    f"Skipped {len(skipped)} non-image file(s): {', '.join(skipped[:10])}"
                    + ('…' if len(skipped) > 10 else '')
                )
            return _upload_response(request, 'admin:clients_clientalbum_changelist')

        # GET request - show upload form
        context = {
            **self.admin_site.each_context(request),
            'title': 'Bulk Upload',
            'opts': self.model._meta,
            'has_view_permission': self.has_view_permission(request),
        }
        return TemplateResponse(request, 'admin/clients/clientalbum/bulk_upload.html', context)

    def extract_album_name_without_parentheses(self, title):
        """Extract album name without content in parentheses"""
        # Remove everything in parentheses including the parentheses
        name = re.sub(r'\s*\([^)]*\)\s*', '', title)
        return name.strip() if name.strip() else title

    def view_qr_codes_html(self, request, album_ids):
        """View QR codes as HTML page (can be saved as PDF manually)"""
        # Parse album IDs, ignoring anything that is not a valid UUID
        album_id_list = []
        for raw_id in album_ids.split(','):
            raw_id = raw_id.strip()
            if not raw_id:
                continue
            try:
                album_id_list.append(uuid.UUID(raw_id))
            except ValueError:
                continue

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

        context = {
            'albums_data': albums_data,
            'site_url': 'www.avestudio.ro',
        }
        return TemplateResponse(request, 'admin/clients/clientalbum/qr_codes_pdf.html', context)

    def upload_multiple_images(self, request, album_id):
        """Handle multiple image uploads"""
        album = get_object_or_404(ClientAlbum, pk=album_id)

        if request.method == 'POST':
            files = request.FILES.getlist('images')

            if not files:
                messages.error(request, 'Please select at least one image to upload.')
                return _upload_response(request, 'admin:clients_clientalbum_upload_multiple', album_id)

            skipped = [f.name for f in files if not _is_image(f)]
            uploaded_count = 0
            for file in files:
                if not _is_image(file):
                    continue
                AlbumImage.objects.create(album=album, image=file)
                uploaded_count += 1

            if uploaded_count:
                messages.success(request, f'Successfully uploaded {uploaded_count} image(s) to "{album.title}".')
            if skipped:
                messages.warning(
                    request,
                    f"Skipped {len(skipped)} non-image file(s): {', '.join(skipped[:10])}"
                    + ('…' if len(skipped) > 10 else '')
                )
            return _upload_response(request, 'admin:clients_clientalbum_change', album_id)

        # GET request - show upload form
        context = {
            **self.admin_site.each_context(request),
            'title': f'Add Photos — {album.title}',
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
    list_select_related = ('album',)
    list_per_page = 50

    def thumbnail(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" class="ave-thumb ave-thumb-sm" loading="lazy" alt="" />',
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
                '<img src="{}" class="ave-preview" alt="" />',
                obj.image.url
            )
        return "No image"
    image_preview.short_description = "Preview"


@admin.register(GoogleDriveAlbum)
class GoogleDriveAlbumAdmin(admin.ModelAdmin):
    list_display = ('title', 'folder_id_display', 'created_at', 'qr_code_display', 'access_url_display')
    readonly_fields = ('folder_id', 'qr_code', 'qr_code_display', 'access_url', 'test_connection')
    search_fields = ('title', 'folder_id')
    list_filter = ('created_at',)
    actions = ['regenerate_qr_codes']
    fieldsets = (
        ('Album Information', {
            'fields': ('title', 'folder_link', 'folder_id')
        }),
        ('QR Code & Access', {
            'fields': ('qr_code', 'qr_code_display', 'access_url', 'test_connection'),
            'description': 'QR code and access URL are automatically generated when you save the album.'
        }),
    )

    def folder_id_display(self, obj):
        if not obj or not obj.pk:
            return "-"
        if obj.folder_id:
            return format_html(
                '<code class="ave-code">{}</code>',
                obj.folder_id[:30] + '…' if len(obj.folder_id) > 30 else obj.folder_id
            )
        return "-"
    folder_id_display.short_description = 'Folder ID'

    def qr_code_display(self, obj):
        if not obj or not obj.pk:
            return "No QR code"
        if obj.qr_code:
            return format_html(
                '<img src="{}" class="ave-qr" loading="lazy" alt="QR code" />',
                obj.qr_code.url
            )
        return "No QR code"
    qr_code_display.short_description = 'QR Code'

    def access_url_display(self, obj):
        """Display the access URL in list view"""
        if not obj or not obj.pk:
            return "-"
        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        url = f"{frontend_url}/drive/{obj.id}"
        return format_html('<a href="{}" target="_blank" rel="noopener">{}</a>', url, url)
    access_url_display.short_description = 'Access URL'

    def access_url(self, obj):
        """Display the full URL for access in detail view"""
        if not obj or not obj.pk:
            return mark_safe('<div class="ave-access-panel ave-muted">Save the album first to see the access URL.</div>')
        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        url = f"{frontend_url}/drive/{obj.id}"
        regenerate_url = reverse('admin:clients_googledrivealbum_regenerate_qr', args=[obj.pk])
        return format_html(
            '<div class="ave-access-panel">'
            '<div class="ave-access-row"><span class="ave-access-label">Access URL</span>'
            '<a href="{}" target="_blank" rel="noopener">{}</a></div>'
            '<a href="{}" class="button ave-inline-button">Regenerate QR Code</a>'
            '</div>',
            url, url, regenerate_url
        )
    access_url.short_description = 'Access Information'

    def test_connection(self, obj):
        """Test connection to Google Drive and show image count"""
        # Handle case when obj is None (during add view)
        if not obj or not obj.pk:
            return mark_safe('<span class="ave-muted">Save the album first to test connection</span>')

        if not obj.folder_id:
            return mark_safe('<span class="ave-muted">No folder ID available. Please provide a valid Google Drive folder link.</span>')

        try:
            from backend.google_drive import get_google_drive_service
            drive_service = get_google_drive_service()

            if not drive_service:
                return mark_safe(
                    '<span class="ave-error-text">Google Drive service not configured. Check your API key in settings.</span>'
                )

            images = drive_service.get_image_files(obj.folder_id)
            return format_html(
                '<div class="ave-status ave-status-ok">'
                '<strong>✓ Connection successful</strong> — found {} image(s) in this folder.'
                '</div>',
                len(images)
            )
        except Exception as e:
            return format_html(
                '<div class="ave-status ave-status-error">'
                '<strong>✗ Connection failed</strong><br><code class="ave-code">{}</code>'
                '</div>',
                str(e)
            )
    test_connection.short_description = 'Test Connection'

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('<uuid:album_id>/regenerate-qr/', self.admin_site.admin_view(self.regenerate_qr_code), name='clients_googledrivealbum_regenerate_qr'),
        ]
        return custom_urls + urls

    def regenerate_qr_code(self, request, album_id):
        """Regenerate QR code for a single album"""
        album = get_object_or_404(GoogleDriveAlbum, pk=album_id)
        album.generate_qr_code()
        album.save()
        messages.success(request, f'QR code regenerated for "{album.title}".')
        return redirect('admin:clients_googledrivealbum_change', album_id)

    def regenerate_qr_codes(self, request, queryset):
        """Admin action to regenerate QR codes for selected albums"""
        count = 0
        for album in queryset:
            album.generate_qr_code()
            album.save()
            count += 1
        self.message_user(request, f'Successfully regenerated QR codes for {count} album(s).')
    regenerate_qr_codes.short_description = 'Regenerate QR codes for selected albums'
