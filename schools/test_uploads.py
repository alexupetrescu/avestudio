import uuid
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse

from .models import Child, ClassPhoto, ClassUpload, FaceJob, FaceReference, PhotoSession, School, SchoolClass
from .test_sessions import photo_file
from .tests import HTTPSClient


@override_settings(STORAGES={
    'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
})
class UploadQueueTests(TestCase):
    client_class = HTTPSClient

    @classmethod
    def setUpTestData(cls):
        cls.school = School.objects.create(name='Upload school')
        cls.session = PhotoSession.objects.create(name='Christmas', year=2026)
        cls.group = SchoolClass.objects.create(school=cls.school, name='A', session=cls.session)
        cls.child = Child.objects.create(school_class=cls.group, first_name='Ana', last_name='Popescu')
        cls.admin = get_user_model().objects.create_superuser('uploader', 'upload@example.test', 'test-password')

    def setUp(self):
        self.client.force_login(self.admin)

    def start(self, matching=False):
        data = {'class_id': str(self.group.pk)}
        if matching:
            data['run_faces'] = 'on'
        response = self.client.post(reverse('admin:schools_upload_start'), data)
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()

    def upload(self, batch, *, key=None, kind='images', filename='photo.jpg'):
        return self.client.post(batch['file_url'], {
            'key': str(key or uuid.uuid4()), 'kind': kind, 'image': photo_file(filename),
        })

    def test_upload_saves_variants_then_finish_returns_review_url(self):
        batch = self.start()
        self.assertEqual(self.upload(batch).status_code, 200)
        saved = ClassPhoto.objects.get()
        self.assertTrue(saved.web)
        self.assertTrue(saved.thumb)
        response = self.client.post(batch['finish_url'])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['redirect'], reverse('admin:schools_schoolclass_faces', args=[self.group.pk]))
        self.assertTrue(ClassUpload.objects.get().finished)

    def test_retrying_same_file_key_does_not_duplicate_photo(self):
        batch = self.start()
        key = uuid.uuid4()
        self.assertEqual(self.upload(batch, key=key).status_code, 200)
        response = self.upload(batch, key=key)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['duplicate'])
        self.assertEqual(ClassPhoto.objects.count(), 1)
        self.assertEqual(ClassUpload.objects.get().receipts.count(), 1)
        self.assertEqual(self.upload(batch, key=key, filename='different.jpg').status_code, 409)

    def test_bad_image_does_not_discard_successful_files_and_can_be_retried(self):
        batch = self.start()
        self.upload(batch)
        key = uuid.uuid4()
        response = self.client.post(batch['file_url'], {
            'key': str(key), 'kind': 'images',
            'image': SimpleUploadedFile('bad.jpg', b'not an image', content_type='image/jpeg'),
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(ClassPhoto.objects.count(), 1)
        self.assertEqual(self.upload(batch, key=key).status_code, 200)
        self.assertEqual(ClassPhoto.objects.count(), 2)

    def test_reference_upload_links_to_existing_child(self):
        batch = self.start()
        self.assertEqual(self.upload(batch, kind='references', filename='Popescu-Ana.jpg').status_code, 200)
        self.assertEqual(FaceReference.objects.get().child_id, self.child.pk)
        self.assertEqual(Child.objects.count(), 1)

    @patch('schools.uploads.start_face_job')
    def test_matching_starts_once_after_finish_and_respects_checkbox(self, start_job):
        batch = self.start(matching=True)
        self.upload(batch)
        start_job.assert_not_called()
        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(self.client.post(batch['finish_url']).status_code, 200)
        self.client.post(batch['finish_url'])
        start_job.assert_called_once_with(self.group, reset=False)

    @patch('schools.uploads.start_face_job')
    def test_unchecked_matching_does_not_run(self, start_job):
        batch = self.start()
        self.upload(batch)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(batch['finish_url'])
        start_job.assert_not_called()

    @patch('schools.uploads.start_face_job')
    def test_finish_waits_for_active_matching_without_losing_saved_files(self, start_job):
        batch = self.start(matching=True)
        self.upload(batch)
        job = FaceJob.objects.create(school_class=self.group, status=FaceJob.RUNNING)
        response = self.client.post(batch['finish_url'])
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()['retry_after'], 5)
        self.assertFalse(ClassUpload.objects.get().finished)
        self.assertEqual(ClassPhoto.objects.count(), 1)
        start_job.assert_not_called()
        job.status = FaceJob.DONE
        job.save()
        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(self.client.post(batch['finish_url']).status_code, 200)
        start_job.assert_called_once()

    def test_completed_batch_cannot_accept_new_files_but_old_retries_are_safe(self):
        batch = self.start()
        key = uuid.uuid4()
        self.upload(batch, key=key)
        self.client.post(batch['finish_url'])
        self.assertEqual(self.upload(batch).status_code, 409)
        self.assertEqual(self.upload(batch, key=key).status_code, 200)
        self.assertEqual(ClassPhoto.objects.count(), 1)

    def test_upload_requires_one_file_per_request_and_valid_file_key(self):
        batch = self.start()
        response = self.client.post(batch['file_url'], {
            'key': str(uuid.uuid4()), 'kind': 'images', 'image': [photo_file(), photo_file()],
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client.post(batch['file_url'], {
            'key': 'invalid', 'kind': 'images', 'image': photo_file(),
        }).status_code, 400)
        self.assertFalse(ClassPhoto.objects.exists())

    def test_only_authorized_staff_and_batch_owner_can_upload(self):
        batch = self.start()
        other = get_user_model().objects.create_superuser('other-admin', 'other@example.test', 'test-password')
        self.client.force_login(other)
        self.assertEqual(self.upload(batch).status_code, 404)
        self.assertEqual(self.client.post(batch['finish_url']).status_code, 404)
        self.client.logout()
        self.assertEqual(self.client.post(reverse('admin:schools_upload_start'), {'class_id': self.group.pk}).status_code, 302)
        self.assertEqual(self.upload(batch).status_code, 302)
        self.assertFalse(ClassPhoto.objects.exists())

    def test_class_editor_needs_photo_add_permission(self):
        user = get_user_model().objects.create_user('editor', is_staff=True)
        user.user_permissions.add(Permission.objects.get(content_type__app_label='schools', codename='change_schoolclass'))
        self.client.force_login(user)
        batch = self.start()
        self.assertEqual(self.upload(batch).status_code, 403)
        self.assertFalse(ClassPhoto.objects.exists())

    def test_queue_endpoints_require_csrf_tokens_and_post(self):
        batch = self.start()
        self.assertEqual(self.client.get(batch['file_url']).status_code, 405)
        self.assertEqual(self.client.get(batch['finish_url']).status_code, 405)
        client = HTTPSClient(enforce_csrf_checks=True)
        client.force_login(self.admin)
        self.assertEqual(client.post(batch['file_url'], {
            'key': str(uuid.uuid4()), 'kind': 'images', 'image': photo_file(),
        }).status_code, 403)

    def test_upload_page_uses_queue_and_no_image_previews(self):
        response = self.client.get(reverse('admin:schools_schoolclass_upload', args=[self.group.pk]))
        self.assertContains(response, 'admin/js/class_upload.js')
        self.assertContains(response, 'data-start-url=')
        self.assertNotContains(response, 'refs-preview')
        self.assertContains(response, 'Christmas 2026')
