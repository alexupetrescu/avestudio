from datetime import date
from io import BytesIO
from unittest.mock import patch
import zipfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from PIL import Image

from . import face_tasks
from .models import Child, ClassPhoto, FaceReference, PhotoMatch, PhotoSession, School, SchoolClass
from .sessions import copy_roster
from .tests import HTTPSClient


def photo_file(name='photo.jpg'):
    stream = BytesIO()
    Image.new('RGB', (24, 24), 'blue').save(stream, 'JPEG')
    return SimpleUploadedFile(name, stream.getvalue(), content_type='image/jpeg')


@override_settings(STORAGES={
    'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
})
class SessionAlbumTests(TestCase):
    client_class = HTTPSClient

    @classmethod
    def setUpTestData(cls):
        cls.school = School.objects.create(name='Waldorf')
        cls.christmas = PhotoSession.objects.create(name='Crăciun', year=2026, date=date(2026, 12, 10))
        cls.march = PhotoSession.objects.create(name='Martie', year=2027, date=date(2027, 3, 1))
        cls.original = SchoolClass.objects.create(school=cls.school, name='Grupa A', session=cls.christmas)
        cls.child = Child.objects.create(school_class=cls.original, first_name='Ana', last_name='Popescu', package_a=True)
        cls.other = Child.objects.create(school_class=cls.original, first_name='Luca', last_name='Ionescu')
        cls.old_photo = ClassPhoto.objects.create(school_class=cls.original, image=photo_file('christmas.jpg'))
        PhotoMatch.objects.create(photo=cls.old_photo, child=cls.child, source='manual')
        cls.current = copy_roster(cls.original, name='Grupa A', session=cls.march)
        cls.current_child = cls.current.children.get(profile=cls.child.profile)
        cls.new_photo = ClassPhoto.objects.create(school_class=cls.current, image=photo_file('march.jpg'))
        PhotoMatch.objects.create(photo=cls.new_photo, child=cls.current_child, source='manual')
        cls.admin = get_user_model().objects.create_superuser('session-admin', 'admin@example.test', 'test-password')

    def album(self, session_id=None, child_id=None, pin=None):
        params = {'pin': pin or self.child.pin}
        if session_id:
            params['session_id'] = str(session_id)
        return self.client.get(reverse('schools-child-detail', args=[child_id or self.child.pk]), params)

    def test_default_album_is_latest_session_and_old_link_and_pin_still_work(self):
        response = self.album()
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['selected_session_id'], str(self.current_child.pk))
        self.assertEqual([photo['id'] for photo in data['photos']], [self.new_photo.pk])
        self.assertEqual([session['label'] for session in data['sessions']], ['Martie 2027', 'Crăciun 2026'])
        self.assertNotIn('pin', data)
        self.assertEqual(self.child.album_url, self.current_child.album_url)
        self.assertEqual(self.child.pin, self.current_child.pin)

    def test_parent_can_switch_to_older_session(self):
        response = self.album(self.child.pk)
        self.assertEqual(response.status_code, 200)
        self.assertEqual([photo['id'] for photo in response.json()['photos']], [self.old_photo.pk])

    def test_other_child_session_cannot_be_selected(self):
        self.assertEqual(self.album(self.other.pk).status_code, 403)

    def test_invalid_pin_or_session_id_cannot_open_album(self):
        self.assertEqual(self.album(pin='invalid').status_code, 403)
        self.assertEqual(self.album(session_id='invalid').status_code, 403)

    def test_same_name_in_another_roster_is_not_automatically_linked(self):
        another = SchoolClass.objects.create(school=self.school, name='Other group', session=self.march)
        namesake = Child.objects.create(school_class=another, first_name='Ana', last_name='Popescu')
        self.assertNotEqual(namesake.profile_id, self.child.profile_id)
        self.assertEqual(self.album(namesake.pk).status_code, 403)

    def test_copied_roster_has_fresh_orders_and_no_copied_photo_assignments(self):
        self.assertEqual(self.current.children.count(), 2)
        self.assertFalse(self.current_child.package_a)
        self.assertFalse(self.current_child.package_b)
        self.assertEqual(self.original.children.count(), 2)
        self.assertEqual(self.current_child.photos.count(), 1)
        self.assertFalse(self.current_child.photos.filter(pk=self.old_photo.pk).exists())

    def test_removing_child_from_new_roster_preserves_previous_sessions(self):
        self.current_child.delete()
        response = self.album()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['selected_session_id'], str(self.child.pk))
        self.assertEqual(self.child.photos.count(), 1)

    def test_stable_link_survives_removal_of_original_roster_entry(self):
        original_id = self.child.pk
        self.child.delete()
        self.assertEqual(self.album(child_id=original_id).status_code, 200)

    def test_download_contains_only_selected_session(self):
        response = self.client.post(reverse('schools-child-download'), {
            'child_id': str(self.child.pk), 'pin': self.child.pin, 'session_id': str(self.child.pk),
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        with zipfile.ZipFile(BytesIO(response.content)) as archive:
            self.assertEqual(archive.namelist(), ['christmas.jpg'])

    def test_latest_uses_session_date_even_when_other_class_has_shoot_date(self):
        summer = PhotoSession.objects.create(name='Vară', year=2027, date=date(2027, 6, 1))
        self.current.shoot_date = date(2027, 3, 1)
        self.current.save()
        latest = copy_roster(self.current, name='Grupa A', session=summer)
        self.assertEqual(self.album().json()['selected_session_id'], str(latest.children.get(profile=self.child.profile).pk))

    @patch('schools.face_tasks.face_engine.available', return_value=True)
    def test_matching_reuses_references_only_for_children_in_current_roster(self, available):
        FaceReference.objects.create(child=self.child, image=photo_file(), embedding=[0.1, 0.2])
        FaceReference.objects.create(child=self.other, image=photo_file(), embedding=[0.3, 0.4])
        self.current.children.get(profile=self.other.profile).delete()
        references = face_tasks.embed_references(self.current)
        self.assertEqual(set(references), {self.current_child.pk})
        self.assertEqual(references[self.current_child.pk][0].tolist(), [float(face_tasks.np.float32(0.1)), float(face_tasks.np.float32(0.2))])

    def test_admin_can_copy_roster_and_sees_class_year_and_session_filters(self):
        self.client.force_login(self.admin)
        summer = PhotoSession.objects.create(name='Vară', year=2027)
        response = self.client.post(reverse('admin:schools_schoolclass_new_session', args=[self.current.pk]), {
            'name': 'Grupa A', 'session': summer.pk,
        })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(SchoolClass.objects.get(session=summer).children.count(), 2)
        response = self.client.get(reverse('admin:schools_child_changelist'))
        self.assertContains(response, 'school_class__id__exact')
        self.assertContains(response, 'school_class__session__id__exact')
        self.assertContains(response, 'school_class__session__year')
        self.assertContains(self.client.get(reverse('admin:schools_child_change', args=[self.child.pk])), 'Sessions for this child')

    def test_teacher_cannot_copy_rosters_or_select_a_profile_when_adding_a_child(self):
        response = self.client.post(reverse('admin:schools_schoolclass_new_session', args=[self.current.pk]), {
            'name': 'Attack', 'session': self.march.pk,
        })
        self.assertEqual(response.status_code, 302)
        response = self.client.post(reverse('schools-class-add-child', args=[self.current.pk]), {
            'pin': self.current.pin, 'first_name': 'New', 'last_name': 'Child',
            'profile': str(self.child.profile_id),
        }, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertNotEqual(Child.objects.get(pk=response.json()['id']).profile_id, self.child.profile_id)

    def test_new_session_and_child_album_admin_forms_render(self):
        self.client.force_login(self.admin)
        self.assertEqual(self.client.get(reverse('admin:schools_photosession_add')).status_code, 200)
        self.assertEqual(self.client.get(reverse('admin:schools_childprofile_add')).status_code, 200)
        self.assertEqual(self.client.get(reverse('admin:schools_schoolclass_add')).status_code, 200)

    def test_review_limits_images_to_48_per_page(self):
        ClassPhoto.objects.bulk_create([ClassPhoto(school_class=self.current, image=f'photo-{index}.jpg') for index in range(55)])
        self.client.force_login(self.admin)
        response = self.client.get(reverse('admin:schools_schoolclass_faces', args=[self.current.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.context['review_page'].object_list), 48)
        self.assertEqual(response.context['review_page'].paginator.count, 56)
