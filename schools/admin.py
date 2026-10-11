import csv
import json
import re
import uuid

from django.contrib import admin, messages
from django.db.models import Count, Q
from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest
from django.shortcuts import get_object_or_404, redirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.views.decorators.csrf import csrf_protect

from . import face_engine, pricing
from .face_tasks import add_match, start_face_job
from .pdf import class_list_filename, render_class_list_pdf
from .models import (
    Child, ClassPhoto, FaceJob, FaceReference, PhotoMatch, School, SchoolClass, fold_name,
)

LOW_CONFIDENCE = 0.35


def _is_image(uploaded_file):
    content_type = getattr(uploaded_file, 'content_type', '') or ''
    return content_type.startswith('image/')


def _upload_response(request, url):
    """AJAX uploads (progress bar) get the target URL as JSON so Django messages survive."""
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({'redirect': url})
    return redirect(url)


def _names_from_filename(filename: str) -> tuple[str, str]:
    """'Popescu-Ana-Maria.jpg' -> ('Popescu', 'Ana-Maria'); 'ana popescu' -> ('ana', 'popescu').
    Convention: surname first, then given names."""
    stem = re.sub(r'\.[^.]+$', '', filename)
    stem = re.sub(r'\s*\([^)]*\)\s*$', '', stem)
    tokens = [t for t in re.split(r'[\s_]+|-(?=[A-Za-zÀ-ž])', stem) if t]
    if not tokens:
        return ('', stem)
    if len(tokens) == 1:
        return (tokens[0].title(), '')
    return (tokens[0].title(), ' '.join(t.title() for t in tokens[1:]))


def _child_from_reference_name(school_class: SchoolClass, filename: str, children_by_key: dict) -> Child:
    key = fold_name(filename)
    if key in children_by_key:
        return children_by_key[key]
    last, first = _names_from_filename(filename)
    child = Child.objects.create(school_class=school_class, last_name=last, first_name=first or '-')
    children_by_key[child.match_key] = child
    return child


# ---------------------------------------------------------------------------
# Inlines
# ---------------------------------------------------------------------------

class SchoolClassInline(admin.TabularInline):
    model = SchoolClass
    extra = 0
    fields = ('name', 'teacher_name', 'teacher_phone', 'shoot_date', 'shoot_time', 'pin', 'links')
    readonly_fields = ('pin', 'links')
    show_change_link = True

    def links(self, obj):
        if not obj.pk:
            return '-'
        return format_html(
            '<a href="{}">Upload</a> · <a href="{}">Faces</a> · <a href="{}" target="_blank">Cards</a>',
            reverse('admin:schools_schoolclass_upload', args=[obj.pk]),
            reverse('admin:schools_schoolclass_faces', args=[obj.pk]),
            reverse('admin:schools_schoolclass_print_cards', args=[obj.pk]),
        )
    links.short_description = 'Tools'


class ChildInline(admin.TabularInline):
    model = Child
    extra = 0
    fields = ('last_name', 'first_name', 'package_a', 'package_b', 'package_c', 'package_d', 'pin', 'photo_count', 'album_link')
    readonly_fields = ('pin', 'photo_count', 'album_link')
    show_change_link = True

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_photo_count=Count('photos', distinct=True))

    def photo_count(self, obj):
        return getattr(obj, '_photo_count', 0) if obj.pk else '-'
    photo_count.short_description = 'Photos'

    def album_link(self, obj):
        if not obj.pk:
            return '-'
        return format_html('<a href="{}" target="_blank" rel="noopener">Album</a>', obj.album_url)
    album_link.short_description = 'Album'


class FaceReferenceInline(admin.TabularInline):
    model = FaceReference
    extra = 0
    fields = ('preview', 'image', 'has_embedding', 'created_at')
    readonly_fields = ('preview', 'has_embedding', 'created_at')

    def preview(self, obj):
        if obj.pk and obj.image:
            return format_html('<img src="{}" class="ave-thumb" loading="lazy" alt="" />', obj.image.url)
        return '-'

    def has_embedding(self, obj):
        return bool(obj.embedding)
    has_embedding.boolean = True
    has_embedding.short_description = 'Embedded'


class PhotoMatchInline(admin.TabularInline):
    model = PhotoMatch
    extra = 0
    fields = ('child', 'source', 'confidence')
    autocomplete_fields = ('child',)


# ---------------------------------------------------------------------------
# School
# ---------------------------------------------------------------------------

@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'tier', 'season', 'class_count', 'child_count', 'orders_a', 'created_at')
    list_filter = ('season', 'is_returning_customer')
    search_fields = ('name', 'city', 'contact_name')
    inlines = [SchoolClassInline]

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _classes=Count('classes', distinct=True),
            _children=Count('classes__children', distinct=True),
            _orders_a=Count('classes__children', filter=Q(classes__children__package_a=True), distinct=True),
        )

    def tier(self, obj):
        label = 'Returning' if obj.is_returning_customer else 'New'
        return format_html('<span class="ave-pin">{} lei</span> {}', obj.price_a, label)
    tier.short_description = 'Package A'

    def class_count(self, obj):
        return obj._classes
    class_count.short_description = 'Classes'

    def child_count(self, obj):
        return obj._children
    child_count.short_description = 'Children'

    def orders_a(self, obj):
        return obj._orders_a
    orders_a.short_description = 'Orders A'


# ---------------------------------------------------------------------------
# Class
# ---------------------------------------------------------------------------

@admin.register(SchoolClass)
class SchoolClassAdmin(admin.ModelAdmin):
    list_display = ('name', 'school', 'teacher_name', 'shoot_display', 'pin_display', 'child_count', 'photo_count', 'orders_summary', 'tools')
    list_filter = ('school', 'shoot_date')
    search_fields = ('name', 'teacher_name', 'school__name', 'pin')
    list_select_related = ('school',)
    readonly_fields = ('pin', 'qr_code', 'access_panel', 'created_at')
    inlines = [ChildInline]
    fieldsets = (
        ('Class', {'fields': ('school', 'name', 'teacher_name', 'teacher_phone')}),
        ('Photo session', {'fields': (('shoot_date', 'shoot_time'),),
                           'description': 'Shown to the teacher on the order page and on the printed class card.'}),
        ('Teacher access', {'fields': ('access_panel', 'pin', 'qr_code'),
                            'description': 'Share the link + PIN with the teacher. They fill in the children and the packages.'}),
    )
    change_form_template = 'admin/schools/schoolclass/change_form.html'
    change_list_template = 'admin/schools/schoolclass/change_list.html'

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _children=Count('children', distinct=True),
            _photos=Count('photos', distinct=True),
            _a=Count('children', filter=Q(children__package_a=True), distinct=True),
            _b=Count('children', filter=Q(children__package_b=True), distinct=True),
            _c=Count('children', filter=Q(children__package_c=True), distinct=True),
            _d=Count('children', filter=Q(children__package_d=True), distinct=True),
        )

    # --- list columns -----------------------------------------------------
    def pin_display(self, obj):
        return format_html('<span class="ave-pin">{}</span>', obj.pin)
    pin_display.short_description = 'PIN'

    def shoot_display(self, obj):
        return obj.shoot_display or mark_safe('<span class="ave-muted">not set</span>')
    shoot_display.short_description = 'Shoot'
    shoot_display.admin_order_field = 'shoot_date'

    def child_count(self, obj):
        return obj._children
    child_count.short_description = 'Children'

    def photo_count(self, obj):
        return obj._photos
    photo_count.short_description = 'Photos'

    def orders_summary(self, obj):
        return f"A {obj._a} · B {obj._b} · C {obj._c} · D {obj._d}"
    orders_summary.short_description = 'Orders'

    def tools(self, obj):
        return format_html(
            '<a href="{}">Upload</a> · <a href="{}">Faces</a> · <a href="{}" target="_blank">Cards</a> · '
            '<a href="{}" target="_blank">PDF</a> · <a href="{}">CSV</a>',
            reverse('admin:schools_schoolclass_upload', args=[obj.pk]),
            reverse('admin:schools_schoolclass_faces', args=[obj.pk]),
            reverse('admin:schools_schoolclass_print_cards', args=[obj.pk]),
            reverse('admin:schools_schoolclass_list_pdf', args=[obj.pk]),
            reverse('admin:schools_schoolclass_export', args=[obj.pk]),
        )
    tools.short_description = 'Tools'

    def access_panel(self, obj):
        if not obj or not obj.pk:
            return mark_safe('<span class="ave-muted">Save the class first to get the teacher link.</span>')
        return format_html(
            '<div class="ave-access-panel">'
            '<div class="ave-access-row"><span class="ave-access-label">Teacher URL</span>'
            '<a href="{0}" target="_blank" rel="noopener">{0}</a></div>'
            '<div class="ave-access-row"><span class="ave-access-label">PIN</span><span class="ave-pin">{1}</span></div>'
            '<div class="ave-access-row"><span class="ave-access-label">Package A</span><span>{2} lei ({3})</span></div>'
            '{4}'
            '</div>',
            obj.teacher_url, obj.pin, obj.price_a,
            'returning customer' if obj.school.is_returning_customer else 'new customer',
            format_html('<img src="{}" class="ave-qr" alt="QR" />', obj.qr_code.url) if obj.qr_code else '',
        )
    access_panel.short_description = 'Teacher access'

    # --- urls -------------------------------------------------------------
    def get_urls(self):
        urls = super().get_urls()
        wrap = self.admin_site.admin_view
        custom = [
            path('bulk-upload/', wrap(self.bulk_upload), name='schools_schoolclass_bulk_upload'),
            path('<uuid:class_id>/upload/', wrap(self.bulk_upload), name='schools_schoolclass_upload'),
            path('<uuid:class_id>/faces/', wrap(self.faces_page), name='schools_schoolclass_faces'),
            path('<uuid:class_id>/faces/status.json', wrap(self.faces_status), name='schools_schoolclass_faces_status'),
            path('<uuid:class_id>/faces/assign/', wrap(self.faces_assign), name='schools_schoolclass_faces_assign'),
            path('<uuid:class_id>/faces/rerun/', wrap(self.faces_rerun), name='schools_schoolclass_faces_rerun'),
            path('<uuid:class_id>/print-cards/', wrap(self.print_cards), name='schools_schoolclass_print_cards'),
            path('<uuid:class_id>/export.csv', wrap(self.export_csv), name='schools_schoolclass_export'),
            path('<uuid:class_id>/list.pdf', wrap(self.list_pdf), name='schools_schoolclass_list_pdf'),
        ]
        return custom + urls

    # --- bulk upload ------------------------------------------------------
    def bulk_upload(self, request, class_id=None):
        preselected = get_object_or_404(SchoolClass, pk=class_id) if class_id else None

        if request.method == 'POST':
            school_class = self._resolve_class_from_post(request)
            if school_class is None:
                messages.error(request, 'Choose a class (or type a name for a new one).')
                return _upload_response(request, request.path)

            refs = [f for f in request.FILES.getlist('references') if _is_image(f)]
            photos = [f for f in request.FILES.getlist('images') if _is_image(f)]
            skipped = len(request.FILES.getlist('references')) + len(request.FILES.getlist('images')) - len(refs) - len(photos)

            if not refs and not photos:
                messages.error(request, 'Select reference faces and/or class photos.')
                return _upload_response(request, request.path)

            children_by_key = {c.match_key: c for c in school_class.children.all()}
            created_children = []
            for f in refs:
                existed = fold_name(f.name) in children_by_key
                child = _child_from_reference_name(school_class, f.name, children_by_key)
                if not existed:
                    created_children.append(child.full_name)
                FaceReference.objects.create(child=child, image=f)

            for f in photos:
                ClassPhoto.objects.create(school_class=school_class, image=f)

            parts = []
            if refs:
                parts.append(f"{len(refs)} reference face(s)")
            if created_children:
                parts.append(f"created {len(created_children)} child(ren): {', '.join(created_children[:15])}"
                             + ('…' if len(created_children) > 15 else ''))
            if photos:
                parts.append(f"{len(photos)} photo(s) with web + thumb variants")
            messages.success(request, f'Uploaded to "{school_class}": ' + '; '.join(parts) + '.')
            if skipped:
                messages.warning(request, f'Skipped {skipped} non-image file(s).')

            if request.POST.get('run_faces', 'on') == 'on' and (photos or refs):
                start_face_job(school_class, reset=bool(refs))
                messages.info(request, 'Face matching started in the background.')
            return _upload_response(request, reverse('admin:schools_schoolclass_faces', args=[school_class.pk]))

        schools = School.objects.prefetch_related('classes').order_by('-season', 'name')
        context = {
            **self.admin_site.each_context(request),
            'title': f'Upload photos — {preselected}' if preselected else 'Bulk upload',
            'opts': self.model._meta,
            'schools': schools,
            'preselected': preselected,
            'face_available': face_engine.available(),
            'face_reason': face_engine.unavailable_reason(),
        }
        return TemplateResponse(request, 'admin/schools/schoolclass/bulk_upload.html', context)

    def _resolve_class_from_post(self, request):
        class_id = request.POST.get('class_id', '').strip()
        if class_id:
            try:
                return SchoolClass.objects.get(pk=uuid.UUID(class_id))
            except (SchoolClass.DoesNotExist, ValueError):
                return None
        school_id = request.POST.get('school_id', '').strip()
        new_name = request.POST.get('new_class_name', '').strip()
        if school_id and new_name:
            school = School.objects.filter(pk=school_id).first()
            if not school:
                return None
            return SchoolClass.objects.create(
                school=school, name=new_name,
                teacher_name=request.POST.get('new_teacher_name', '').strip(),
                teacher_phone=request.POST.get('new_teacher_phone', '').strip(),
            )
        return None

    # --- faces ------------------------------------------------------------
    def faces_page(self, request, class_id):
        school_class = get_object_or_404(SchoolClass.objects.select_related('school'), pk=class_id)
        job = school_class.face_jobs.first()

        children = list(
            school_class.children.annotate(photo_total=Count('photos', distinct=True)).order_by('last_name', 'first_name')
        )
        for child in children:
            child.sample_thumbs = [p.thumb.url for p in child.photos.exclude(thumb='')[:4]]

        photos = (
            school_class.photos.prefetch_related('matches__child')
            .annotate(_match_count=Count('matches'))
            .order_by('id')
        )
        unmatched = [p for p in photos if p._match_count == 0]
        low_conf = [p for p in photos if p._match_count and
                    any(m.source == PhotoMatch.SOURCE_FACE and m.confidence < LOW_CONFIDENCE for m in p.matches.all())]
        matched = [p for p in photos if p._match_count and p not in low_conf]

        context = {
            **self.admin_site.each_context(request),
            'title': f'Face review — {school_class}',
            'opts': self.model._meta,
            'school_class': school_class,
            'job': job,
            'job_active': bool(job and job.is_active),
            'children': children,
            'children_json': json.dumps([{'id': str(c.id), 'name': c.full_name} for c in children]),
            'unmatched': unmatched,
            'low_conf': low_conf,
            'matched': matched,
            'total_photos': len(photos),
            'unprocessed': sum(1 for p in photos if not p.faces_processed),
            'face_available': face_engine.available(),
            'face_reason': face_engine.unavailable_reason(),
            'low_threshold': LOW_CONFIDENCE,
        }
        return TemplateResponse(request, 'admin/schools/schoolclass/faces.html', context)

    def faces_status(self, request, class_id):
        job = FaceJob.objects.filter(school_class_id=class_id).first()
        if not job:
            return JsonResponse({'status': 'none'})
        return JsonResponse({
            'status': job.status, 'total': job.total, 'processed': job.processed,
            'matched': job.matched_photos, 'unmatched': job.unmatched_photos,
            'log': job.log[-4000:],
        })

    def faces_assign(self, request, class_id):
        if request.method != 'POST':
            return HttpResponseBadRequest('POST only')
        school_class = get_object_or_404(SchoolClass, pk=class_id)
        try:
            payload = json.loads(request.body or '{}')
        except json.JSONDecodeError:
            return HttpResponseBadRequest('bad json')
        photo = get_object_or_404(ClassPhoto, pk=payload.get('photo_id'), school_class=school_class)
        mode = payload.get('mode', 'add')

        if mode == 'clear':
            photo.matches.all().delete()
        elif mode == 'remove':
            photo.matches.filter(child_id=payload.get('child_id')).delete()
        elif mode == 'all':
            for child in school_class.children.all():
                add_match(photo, child.id, PhotoMatch.SOURCE_ALL, 1.0)
        else:
            ids = payload.get('child_ids') or []
            valid = set(str(i) for i in school_class.children.filter(id__in=ids).values_list('id', flat=True))
            for cid in ids:
                if str(cid) in valid:
                    add_match(photo, cid, PhotoMatch.SOURCE_MANUAL, 1.0)
        photo.faces_processed = True
        photo.save(update_fields=['faces_processed'])
        matches = [{'child_id': str(m.child_id), 'name': m.child.full_name, 'source': m.source, 'confidence': m.confidence}
                   for m in photo.matches.select_related('child')]
        return JsonResponse({'ok': True, 'photo_id': photo.pk, 'matches': matches})

    def faces_rerun(self, request, class_id):
        school_class = get_object_or_404(SchoolClass, pk=class_id)
        if request.method == 'POST':
            start_face_job(school_class, reset=request.POST.get('reset') == '1')
            messages.info(request, 'Face matching started.')
        return redirect('admin:schools_schoolclass_faces', class_id)

    # --- print / export ---------------------------------------------------
    def print_cards(self, request, class_id):
        school_class = get_object_or_404(SchoolClass.objects.select_related('school'), pk=class_id)
        children = school_class.children.all()
        only = request.GET.get('children')
        if only:
            ids = [i for i in only.split(',') if i]
            children = children.filter(id__in=ids)
        cards = [
            {'child': c, 'qr_url': request.build_absolute_uri(c.qr_code.url) if c.qr_code else None}
            for c in children
        ]
        context = {
            'school_class': school_class,
            'cards': cards,
            'class_qr_url': request.build_absolute_uri(school_class.qr_code.url) if school_class.qr_code else None,
            'site_url': 'www.avestudio.ro',
        }
        return TemplateResponse(request, 'admin/schools/schoolclass/print_cards.html', context)

    def list_pdf(self, request, class_id):
        school_class = get_object_or_404(SchoolClass.objects.select_related('school'), pk=class_id)
        response = HttpResponse(render_class_list_pdf(school_class), content_type='application/pdf')
        disposition = 'attachment' if request.GET.get('download') == '1' else 'inline'
        response['Content-Disposition'] = f'{disposition}; filename="{class_list_filename(school_class)}"'
        return response

    def export_csv(self, request, class_id):
        school_class = get_object_or_404(SchoolClass.objects.select_related('school'), pk=class_id)
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        safe = re.sub(r'[^\w\- ]', '', f"{school_class.school.name} {school_class.name}").strip().replace(' ', '_')
        response['Content-Disposition'] = f'attachment; filename="comenzi_{safe}.csv"'
        response.write('﻿')
        writer = csv.writer(response, delimiter=';')
        writer.writerow(['Nume', 'Prenume', f'A ({school_class.price_a} lei)',
                         f"B ({pricing.EXTRAS['b']['price']} lei)", f"C ({pricing.EXTRAS['c']['price']} lei)",
                         f"D ({pricing.EXTRAS['d']['price']} lei)", 'Total lei', 'PIN album', 'Link album', 'Observații'])
        totals = {'a': 0, 'b': 0, 'c': 0, 'd': 0, 'lei': 0}
        for child in school_class.children.all():
            writer.writerow([
                child.last_name, child.first_name,
                'X' if child.package_a else '', 'X' if child.package_b else '',
                'X' if child.package_c else '', 'X' if child.package_d else '',
                child.total_lei, child.pin, child.album_url, child.notes,
            ])
            totals['a'] += child.package_a
            totals['b'] += child.package_b
            totals['c'] += child.package_c
            totals['d'] += child.package_d
            totals['lei'] += child.total_lei
        writer.writerow([])
        writer.writerow(['TOTAL', '', totals['a'], totals['b'], totals['c'], totals['d'], totals['lei'], '', '', ''])
        return response


# ---------------------------------------------------------------------------
# Child
# ---------------------------------------------------------------------------

@admin.register(Child)
class ChildAdmin(admin.ModelAdmin):
    list_display = ('last_name', 'first_name', 'school_class', 'packages_display', 'total_display',
                    'pin_display', 'photo_count', 'album_link')
    list_filter = ('school_class__school', 'school_class', 'package_a', 'package_b', 'package_c', 'package_d')
    search_fields = ('first_name', 'last_name', 'pin', 'school_class__name', 'school_class__school__name')
    list_select_related = ('school_class__school',)
    readonly_fields = ('pin', 'qr_code', 'album_panel', 'match_key', 'created_at')
    inlines = [FaceReferenceInline]
    actions = ['print_cards']
    fieldsets = (
        ('Child', {'fields': ('school_class', 'last_name', 'first_name', 'notes')}),
        ('Order', {'fields': (('package_a', 'package_b', 'package_c', 'package_d'),)}),
        ('Album access', {'fields': ('album_panel', 'pin', 'qr_code', 'match_key')}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_photo_count=Count('photos', distinct=True))

    def packages_display(self, obj):
        return obj.packages
    packages_display.short_description = 'Packages'

    def total_display(self, obj):
        return f"{obj.total_lei} lei"
    total_display.short_description = 'Total'

    def pin_display(self, obj):
        return format_html('<span class="ave-pin">{}</span>', obj.pin)
    pin_display.short_description = 'PIN'

    def photo_count(self, obj):
        return obj._photo_count
    photo_count.short_description = 'Photos'
    photo_count.admin_order_field = '_photo_count'

    def album_link(self, obj):
        return format_html('<a href="{}" target="_blank" rel="noopener">Open</a>', obj.album_url)
    album_link.short_description = 'Album'

    def album_panel(self, obj):
        if not obj or not obj.pk:
            return mark_safe('<span class="ave-muted">Save first.</span>')
        return format_html(
            '<div class="ave-access-panel">'
            '<div class="ave-access-row"><span class="ave-access-label">Album URL</span>'
            '<a href="{0}" target="_blank" rel="noopener">{0}</a></div>'
            '<div class="ave-access-row"><span class="ave-access-label">PIN</span><span class="ave-pin">{1}</span></div>'
            '{2}</div>',
            obj.album_url, obj.pin,
            format_html('<img src="{}" class="ave-qr" alt="QR" />', obj.qr_code.url) if obj.qr_code else '',
        )
    album_panel.short_description = 'Album access'

    def print_cards(self, request, queryset):
        by_class = {}
        for child in queryset:
            by_class.setdefault(child.school_class_id, []).append(str(child.id))
        if len(by_class) != 1:
            self.message_user(request, 'Select children from a single class.', level=messages.ERROR)
            return None
        class_id, ids = next(iter(by_class.items()))
        url = reverse('admin:schools_schoolclass_print_cards', args=[class_id]) + '?children=' + ','.join(ids)
        return redirect(url)
    print_cards.short_description = 'Print QR + PIN cards for selected children'


# ---------------------------------------------------------------------------
# Photos
# ---------------------------------------------------------------------------

@admin.register(ClassPhoto)
class ClassPhotoAdmin(admin.ModelAdmin):
    list_display = ('thumbnail', 'filename', 'school_class', 'children_display', 'faces_processed', 'created_at')
    list_filter = ('school_class__school', 'school_class', 'faces_processed')
    search_fields = ('image', 'school_class__name')
    list_select_related = ('school_class',)
    readonly_fields = ('preview', 'web', 'thumb', 'width', 'height', 'created_at')
    fields = ('school_class', 'image', 'preview', 'web', 'thumb', 'width', 'height', 'faces_processed', 'created_at')
    inlines = [PhotoMatchInline]
    list_per_page = 60

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('matches__child')

    def thumbnail(self, obj):
        src = obj.thumb.url if obj.thumb else (obj.image.url if obj.image else '')
        return format_html('<img src="{}" class="ave-thumb ave-thumb-sm" loading="lazy" alt="" />', src) if src else '-'
    thumbnail.short_description = ''

    def children_display(self, obj):
        names = [m.child.full_name for m in obj.matches.all()]
        return ', '.join(names) if names else mark_safe('<span class="ave-muted">unassigned</span>')
    children_display.short_description = 'Children'

    def preview(self, obj):
        if obj.pk and obj.web:
            return format_html('<img src="{}" class="ave-preview" alt="" />', obj.web.url)
        return '-'


@admin.register(FaceJob)
class FaceJobAdmin(admin.ModelAdmin):
    list_display = ('id', 'school_class', 'status', 'processed', 'total', 'matched_photos', 'unmatched_photos', 'created_at')
    list_filter = ('status',)
    readonly_fields = [f.name for f in FaceJob._meta.fields]
