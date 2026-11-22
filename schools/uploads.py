"""Admin-only, one-file requests with receipts so retries do not duplicate photos."""
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.urls import path, reverse
from django.utils.decorators import method_decorator
from django.views.decorators.http import require_POST

from .face_tasks import start_face_job
from .forms import QueuedPhotoForm
from .models import ClassPhoto, ClassUpload, FaceJob, FaceReference, UploadReceipt, fold_name


class ClassUploadAdminMixin:
    def get_urls(self):
        wrap = self.admin_site.admin_view
        return [
            path('upload-queue/start/', wrap(self.upload_start), name='schools_upload_start'),
            path('upload-queue/<uuid:upload_id>/file/', wrap(self.upload_file), name='schools_upload_file'),
            path('upload-queue/<uuid:upload_id>/finish/', wrap(self.upload_finish), name='schools_upload_finish'),
        ] + super().get_urls()

    @method_decorator(require_POST)
    def upload_start(self, request):
        if not (self.has_change_permission(request) or self.has_add_permission(request)):
            raise PermissionDenied
        school_class = self._resolve_class_from_post(request)
        if school_class is None:
            return JsonResponse({'error': 'Choose a class, or a school, session and new class name.'}, status=400)
        if not self.has_change_permission(request, school_class):
            raise PermissionDenied
        upload = ClassUpload.objects.create(
            school_class=school_class, owner=request.user,
            run_matching=request.POST.get('run_faces') == 'on',
        )
        return JsonResponse({
            'file_url': reverse('admin:schools_upload_file', args=[upload.pk]),
            'finish_url': reverse('admin:schools_upload_finish', args=[upload.pk]),
        })

    def _locked_upload(self, request, upload_id):
        upload = get_object_or_404(
            ClassUpload.objects.select_for_update().select_related('school_class__school'),
            pk=upload_id, owner=request.user,
        )
        if not self.has_change_permission(request, upload.school_class):
            raise PermissionDenied
        return upload

    @method_decorator(require_POST)
    def upload_file(self, request, upload_id):
        with transaction.atomic():
            upload = self._locked_upload(request, upload_id)
            if sum(len(files) for _, files in request.FILES.lists()) != 1:
                return JsonResponse({'error': 'Send exactly one image per request.'}, status=400)
            form = QueuedPhotoForm(request.POST, request.FILES)
            if not form.is_valid():
                return JsonResponse({'error': '; '.join(str(error) for errors in form.errors.values() for error in errors)}, status=400)
            image = form.cleaned_data['image']
            key, kind = form.cleaned_data['key'], form.cleaned_data['kind']
            permission = 'schools.add_classphoto' if kind == 'images' else 'schools.add_facereference'
            if not request.user.has_perm(permission):
                raise PermissionDenied
            receipt = upload.receipts.filter(key=key).first()
            if receipt:
                if receipt.kind != kind or receipt.filename != image.name or receipt.size != image.size:
                    return JsonResponse({'error': 'This file identifier was already used for a different file.'}, status=409)
                return JsonResponse({'ok': True, 'duplicate': True})
            if upload.finished:
                return JsonResponse({'error': 'This upload has already finished.'}, status=409)
            if kind == 'images':
                ClassPhoto.objects.create(school_class=upload.school_class, image=image)
            else:
                from .admin import _child_from_reference_name
                children = {child.match_key: child for child in upload.school_class.children.all()}
                if fold_name(image.name) not in children and not request.user.has_perm('schools.add_child'):
                    raise PermissionDenied
                child = _child_from_reference_name(upload.school_class, image.name, children)
                FaceReference.objects.create(child=child, image=image)
            UploadReceipt.objects.create(upload=upload, key=key, kind=kind, filename=image.name, size=image.size)
        return JsonResponse({'ok': True})

    @method_decorator(require_POST)
    def upload_finish(self, request, upload_id):
        with transaction.atomic():
            upload = self._locked_upload(request, upload_id)
            if not upload.finished:
                if not upload.receipts.exists():
                    return JsonResponse({'error': 'Upload at least one photo before finishing.'}, status=400)
                if upload.run_matching:
                    if FaceJob.objects.filter(
                        school_class=upload.school_class, status__in=[FaceJob.PENDING, FaceJob.RUNNING],
                    ).exists():
                        return JsonResponse({
                            'error': 'Photos saved. Waiting for the current face matching run to finish.',
                            'retry_after': 5,
                        }, status=409)
                    reset = upload.receipts.filter(kind='references').exists()
                    transaction.on_commit(lambda: start_face_job(upload.school_class, reset=reset))
                upload.finished = True
                upload.save(update_fields=['finished'])
        return JsonResponse({'redirect': reverse('admin:schools_schoolclass_faces', args=[upload.school_class_id])})
