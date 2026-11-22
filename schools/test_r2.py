from io import BytesIO, StringIO
import time
from unittest.mock import patch
from urllib.parse import quote

from django.contrib.auth import get_user_model
from django.core import signing
from django.core.exceptions import SuspiciousFileOperation
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management import call_command
from django.test import TestCase, override_settings

from backend.school_storage import SchoolMediaStorage, is_r2_name
from backend.r2_probe import verify_object_access
from clients.models import AlbumImage, ClientAlbum
from .models import Child, ClassPhoto, FaceReference, School, SchoolClass
from .test_sessions import photo_file
from .tests import HTTPSClient


class FakeR2:
    def __init__(self):
        self.objects = {}
        self.presigned = []

    def put_object(self, **kwargs):
        body = kwargs['Body']
        self.objects[kwargs['Key']] = body if isinstance(body, bytes) else body.read()
        return {}

    def get_object(self, **kwargs):
        return {'Body': BytesIO(self.objects[kwargs['Key']])}

    def get_paginator(self, name):
        objects = self.objects
        class Paginator:
            def paginate(self, **kwargs):
                return [{'Contents': [{'Size': len(value)} for value in objects.values()]}]
        return Paginator()

    def download_fileobj(self, bucket, key, output):
        output.write(self.objects[key])

    def head_object(self, **kwargs):
        if kwargs['Key'] not in self.objects:
            error = FileNotFoundError()
            error.response = {'Error': {'Code': '404'}}
            raise error
        return {'ContentLength': len(self.objects[kwargs['Key']])}

    def delete_object(self, **kwargs):
        self.objects.pop(kwargs['Key'], None)

    def generate_presigned_url(self, operation, **kwargs):
        self.presigned.append((operation, kwargs))
        return 'https://' + 'a' * 32 + '.eu.r2.cloudflarestorage.com/bucket/' + quote(kwargs['Params']['Key'], safe='/') + '?signature=test'


@override_settings(
    SCHOOLS_R2_ENABLED=True,
    SCHOOLS_R2_ENDPOINT='https://' + 'a' * 32 + '.eu.r2.cloudflarestorage.com',
    SCHOOLS_R2_BUCKET='avestudio-schools',
    SCHOOLS_R2_ACCESS_KEY_ID='test-access',
    SCHOOLS_R2_SECRET_ACCESS_KEY='test-secret',
    STORAGES={
        'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    },
)
class SchoolR2Tests(TestCase):
    client_class = HTTPSClient

    def setUp(self):
        self.remote = FakeR2()
        self.client_patch = patch('backend.school_storage._client', return_value=self.remote)
        self.client_patch.start()
        self.addCleanup(self.client_patch.stop)
        school = School.objects.create(name='R2 school')
        self.group = SchoolClass.objects.create(school=school, name='A')
        self.child = Child.objects.create(school_class=self.group, first_name='Ana', last_name='Popescu')

    def test_new_school_original_web_thumb_and_reference_use_r2(self):
        photo = ClassPhoto.objects.create(school_class=self.group, image=photo_file('Popescu-Ana.jpg'))
        reference = FaceReference.objects.create(child=self.child, image=photo_file())
        for field in (photo.image, photo.web, photo.thumb, reference.image):
            self.assertTrue(is_r2_name(field.name))
            self.assertIn(field.name, self.remote.objects)
            self.assertTrue(field.url.startswith('/media/schools/'))
        self.assertEqual(photo.filename, 'Popescu-Ana.jpg')
        self.assertTrue(default_storage.exists(self.child.qr_code.name))
        self.assertTrue(default_storage.exists(self.group.qr_code.name))

    def test_client_albums_stay_local_when_r2_is_enabled(self):
        album = ClientAlbum.objects.create(title='Legacy')
        image = AlbumImage.objects.create(album=album, image=photo_file())
        self.assertTrue(default_storage.exists(image.image.name))
        self.assertEqual(self.remote.objects, {})

    def test_existing_local_school_paths_are_read_locally(self):
        name = default_storage.save(f'schools/{self.group.pk}/orig/old.jpg', ContentFile(b'old original'))
        storage = SchoolMediaStorage()
        self.assertTrue(storage.exists(name))
        with storage.open(name) as source:
            self.assertEqual(source.read(), b'old original')
        self.assertEqual(self.remote.objects, {})

    def test_r2_disabled_keeps_new_files_local_and_can_still_read_old_r2_objects(self):
        storage = SchoolMediaStorage()
        name = storage.save(f'schools/{self.group.pk}/orig/photo.jpg', ContentFile(b'R2 original'), max_length=500)
        with override_settings(SCHOOLS_R2_ENABLED=False):
            local = storage.save(f'schools/{self.group.pk}/orig/local.jpg', ContentFile(b'local original'), max_length=500)
            self.assertNotIn('__r2__', local)
            with storage.open(name) as source:
                self.assertEqual(source.read(), b'R2 original')

    def test_repeated_filenames_get_different_keys_without_changing_original_filename(self):
        storage = SchoolMediaStorage()
        names = [storage.save(f'schools/{self.group.pk}/orig/Ana.jpg', ContentFile(b'photo'), max_length=500) for _ in range(2)]
        self.assertNotEqual(*names)
        self.assertTrue(all(name.endswith('/Ana.jpg') for name in names))

    def test_unsigned_or_wrong_signed_photo_is_denied_without_requesting_r2(self):
        photo = ClassPhoto.objects.create(school_class=self.group, image=photo_file())
        self.assertEqual(self.client.get(photo.image.url).status_code, 404)
        wrong = signing.dumps({'path': photo.web.name}, salt='avestudio.private-photo.v1')
        self.assertEqual(self.client.get(photo.image.url, {'access': wrong}).status_code, 404)
        self.assertFalse(self.remote.presigned)

    def test_valid_existing_media_signature_gets_a_short_private_redirect(self):
        photo = ClassPhoto.objects.create(school_class=self.group, image=photo_file('Ana%20portrait.jpg'))
        token = signing.dumps({'path': photo.image.name}, salt='avestudio.private-photo.v1')
        response = self.client.get(photo.image.url, {'access': token})
        self.assertEqual(response.status_code, 302)
        self.assertIn('no-store', response['Cache-Control'])
        self.assertEqual(response['Referrer-Policy'], 'no-referrer')
        self.assertEqual(self.remote.presigned[-1][1]['ExpiresIn'], 60)
        self.assertEqual(self.remote.presigned[-1][1]['Params']['Key'], photo.image.name)

    def test_references_are_staff_only_even_with_a_valid_photo_signature(self):
        reference = FaceReference.objects.create(child=self.child, image=photo_file())
        token = signing.dumps({'path': reference.image.name}, salt='avestudio.private-photo.v1')
        self.assertEqual(self.client.get(reference.image.url, {'access': token}).status_code, 404)
        user = get_user_model().objects.create_user('staff-r2', is_staff=True)
        self.client.force_login(user)
        self.assertEqual(self.client.get(reference.image.url).status_code, 302)

    def test_expired_links_and_non_school_paths_are_rejected(self):
        photo = ClassPhoto.objects.create(school_class=self.group, image=photo_file())
        with patch('django.core.signing.time.time', return_value=time.time() - 3601):
            token = signing.dumps({'path': photo.image.name}, salt='avestudio.private-photo.v1')
        self.assertEqual(self.client.get(photo.image.url, {'access': token}).status_code, 404)
        with self.assertRaises(SuspiciousFileOperation):
            SchoolMediaStorage().save('client_albums/photo.jpg', ContentFile(b'wrong scope'), max_length=500)

    def test_r2_keys_are_compatible_with_existing_production_photo_signing(self):
        from ops.production_middleware import signed_url
        photo = ClassPhoto.objects.create(school_class=self.group, image=photo_file())
        response = self.client.get(signed_url(photo.image.url))
        self.assertEqual(response.status_code, 302)

    def test_connection_probe_only_removes_its_temporary_object(self):
        self.remote.objects['unrelated-photo.jpg'] = b'keep'
        verify_object_access(self.remote, 'avestudio-schools')
        self.assertEqual(self.remote.objects, {'unrelated-photo.jpg': b'keep'})
        output = StringIO()
        call_command('check_school_r2', probe=True, usage=True, stdout=output)
        self.assertIn('check passed', output.getvalue())
        self.assertNotIn('test-secret', output.getvalue())
        self.assertEqual(self.remote.objects, {'unrelated-photo.jpg': b'keep'})

    def test_invalid_enabled_configuration_is_caught_before_release(self):
        from schools.checks import check_r2_configuration
        with override_settings(SCHOOLS_R2_ENDPOINT='https://unrelated.example'):
            errors = check_r2_configuration(None)
            self.assertEqual(errors[0].id, 'schools.E001')
