from io import BytesIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.urls import reverse
from PIL import Image

from .models import Child, ClassPhoto, FaceReference, School, SchoolClass


class HTTPSClient(Client):
    def request(self, **request):
        request['wsgi.url_scheme'] = 'https'
        request['SERVER_PORT'] = '443'
        request.setdefault('HTTP_REFERER', 'https://testserver/')
        return super().request(**request)


@override_settings(STORAGES={
    'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
})
class ChildReferencePhotoTests(TestCase):
    client_class = HTTPSClient

    @classmethod
    def setUpTestData(cls):
        school = School.objects.create(name='Test school')
        cls.school_class = SchoolClass.objects.create(school=school, name='Test class')
        cls.child = Child.objects.create(
            school_class=cls.school_class, last_name='Popescu', first_name='Ana',
        )
        cls.other_child = Child.objects.create(
            school_class=cls.school_class, last_name='Ionescu', first_name='Luca',
        )
        cls.admin = cls.make_user(
            'photo-admin', 'change_child', 'add_facereference', 'change_schoolclass',
        )
        cls.url = reverse('admin:schools_child_upload_reference', args=[cls.child.pk])
        cls.class_url = reverse('admin:schools_schoolclass_change', args=[cls.school_class.pk])

    @staticmethod
    def make_user(username, *permissions, is_staff=True):
        user = get_user_model().objects.create_user(username=username, is_staff=is_staff)
        user.user_permissions.set(Permission.objects.filter(
            content_type__app_label='schools', codename__in=permissions,
        ))
        return user

    @staticmethod
    def photo(filename='IMG_0001.jpg'):
        content = BytesIO()
        Image.new('RGB', (32, 32), color='blue').save(content, format='JPEG')
        return SimpleUploadedFile(filename, content.getvalue(), content_type='image/jpeg')

    def test_anonymous_and_nonstaff_users_cannot_upload_even_with_a_pin(self):
        public_user = self.make_user(
            'public-user', 'change_child', 'add_facereference', is_staff=False,
        )
        for user in (None, public_user):
            with self.subTest(user=user):
                if user:
                    self.client.force_login(user)
                response = self.client.get(self.url, {'pin': self.school_class.pin})
                self.assertRedirects(
                    response, reverse('admin:login') + '?next=' + response.wsgi_request.get_full_path(),
                    fetch_redirect_response=False,
                )
                response = self.client.post(self.url, {
                    'pin': self.child.pin, 'image': self.photo(),
                })
                self.assertEqual(response.status_code, 302)
                self.client.logout()
        self.assertFalse(FaceReference.objects.exists())

    @patch('schools.admin.start_face_job')
    def test_staff_need_both_child_change_and_reference_add_permissions(self, start_job):
        for index, permissions in enumerate(((), ('change_child',), ('add_facereference',),
                                             ('view_child', 'add_facereference'))):
            with self.subTest(permissions=permissions):
                user = self.make_user(f'staff-{index}', *permissions)
                self.client.force_login(user)
                self.assertEqual(self.client.get(self.url).status_code, 403)
                self.assertEqual(self.client.post(self.url, {'image': self.photo()}).status_code, 403)
        self.assertFalse(FaceReference.objects.exists())
        start_job.assert_not_called()

    def test_upload_page_offers_file_and_camera_inputs(self):
        self.client.force_login(self.admin)
        response = self.client.get(self.url)
        self.assertContains(response, 'enctype="multipart/form-data"')
        self.assertContains(response, 'name="image"')
        self.assertContains(response, 'name="camera_image"')
        self.assertContains(response, 'accept="image/*"', count=2)
        self.assertContains(response, 'capture="environment"')
        self.assertContains(response, 'csrfmiddlewaretoken')

    @patch('schools.admin.start_face_job')
    def test_file_upload_saves_to_the_selected_child_and_starts_matching(self, start_job):
        self.client.force_login(self.admin)
        response = self.client.post(self.url, {
            'image': self.photo('Ionescu-Luca.jpg'), 'run_matching': 'on',
        })
        self.assertRedirects(response, self.class_url, fetch_redirect_response=False)
        reference = FaceReference.objects.get()
        self.assertEqual(reference.child_id, self.child.pk)
        with reference.image.open('rb') as image:
            self.assertEqual(Image.open(image).size, (32, 32))
        self.assertFalse(self.other_child.face_references.exists())
        self.assertFalse(ClassPhoto.objects.exists())
        start_job.assert_called_once_with(self.school_class, reset=True)

    @patch('schools.admin.start_face_job')
    def test_camera_upload_can_skip_matching(self, start_job):
        self.client.force_login(self.admin)
        response = self.client.post(self.url, {'camera_image': self.photo()})
        self.assertRedirects(response, self.class_url, fetch_redirect_response=False)
        self.assertEqual(FaceReference.objects.get().child_id, self.child.pk)
        start_job.assert_not_called()

    @patch('schools.admin.start_face_job')
    def test_invalid_uploads_do_not_save_or_start_matching(self, start_job):
        self.client.force_login(self.admin)
        uploads = (
            {},
            {'image': self.photo(), 'camera_image': self.photo()},
            {'image': SimpleUploadedFile('fake.jpg', b'not an image', content_type='image/jpeg')},
            {'camera_image': SimpleUploadedFile('fake.jpg', b'not an image', content_type='image/jpeg')},
        )
        for upload in uploads:
            with self.subTest(fields=list(upload)):
                response = self.client.post(self.url, upload)
                self.assertEqual(response.status_code, 200)
                self.assertTrue(response.context['form'].errors)
        self.assertFalse(FaceReference.objects.exists())
        start_job.assert_not_called()

    def test_upload_requires_csrf_token(self):
        client = HTTPSClient(enforce_csrf_checks=True)
        client.force_login(self.admin)
        response = client.post(self.url, {'image': self.photo()})
        self.assertEqual(response.status_code, 403)
        self.assertFalse(FaceReference.objects.exists())
        client.get(self.url)
        response = client.post(self.url, {
            'image': self.photo(), 'csrfmiddlewaretoken': client.cookies['csrftoken'].value,
        })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(FaceReference.objects.count(), 1)

    def test_upload_controls_appear_on_class_child_and_review_pages(self):
        self.client.force_login(self.admin)
        for url in (
            self.class_url,
            reverse('admin:schools_child_change', args=[self.child.pk]),
            reverse('admin:schools_schoolclass_faces', args=[self.school_class.pk]),
        ):
            with self.subTest(url=url):
                self.assertContains(self.client.get(url), self.url)

    def test_upload_controls_are_hidden_without_reference_permission(self):
        user = self.make_user('child-editor', 'change_child', 'change_schoolclass')
        self.client.force_login(user)
        for url in (
            self.class_url,
            reverse('admin:schools_child_change', args=[self.child.pk]),
            reverse('admin:schools_schoolclass_faces', args=[self.school_class.pk]),
        ):
            with self.subTest(url=url):
                self.assertNotContains(self.client.get(url), self.url)

    def test_latest_reference_preview_is_visible_after_upload(self):
        self.client.force_login(self.admin)
        self.client.post(self.url, {'image': self.photo()})
        reference = FaceReference.objects.get()
        self.assertContains(self.client.get(self.url), reference.image.url)
        self.assertContains(self.client.get(self.class_url), reference.image.url)

    def test_teacher_api_cannot_attach_a_reference_photo(self):
        response = self.client.patch(
            reverse('schools-class-child', args=[self.school_class.pk, self.child.pk]),
            data={
                'pin': self.school_class.pin, 'first_name': self.child.first_name,
                'reference_image': 'fake.jpg', 'camera_image': 'fake.jpg',
            }, content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(FaceReference.objects.exists())
