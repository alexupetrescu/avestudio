"""Exercise assistant identity, class boundaries and private image delivery."""

from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command, CommandError
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse

from .models import AssistantUploadReceipt, Child, ClassAssistant, ClassPhoto, FaceReference, PhotoMatch, School, SchoolClass
from .test_sessions import photo_file
from .tests import HTTPSClient


@override_settings(
    SCHOOLS_R2_ENABLED=False,
    STORAGES={
        'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    },
    PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'],
)
class AssistantCrmTests(TestCase):
    client_class = HTTPSClient

    @classmethod
    def setUpTestData(cls):
        users = get_user_model()
        cls.assistant = users.objects.create_user('assistant', password='test-password')
        cls.unassigned = users.objects.create_user('unassigned', password='test-password', is_staff=True)
        cls.admin = users.objects.create_superuser('owner', 'owner@example.test', 'test-password')
        cls.school = School.objects.create(name='Test school')
        cls.group = SchoolClass.objects.create(school=cls.school, name='Assigned class')
        cls.other_group = SchoolClass.objects.create(school=cls.school, name='Private class')
        cls.grant = ClassAssistant.objects.create(user=cls.assistant, school_class=cls.group)
        cls.child = Child.objects.create(school_class=cls.group, first_name='Ana', last_name='Popescu')
        cls.other_child = Child.objects.create(school_class=cls.other_group, first_name='Luca', last_name='Ionescu')

    def setUp(self):
        cache.clear()

    def url(self, name, *, group=None, child=None, **kwargs):
        values = {}
        if name in ('class', 'add-child', 'child', 'photos', 'reference', 'photo-preview', 'reference-preview'):
            values['class_id'] = (group or self.group).pk
        if name in ('child', 'photos', 'reference', 'photo-preview', 'reference-preview'):
            values['child_id'] = (child or self.child).pk
        values.update(kwargs)
        return reverse(f'assistant:{name}', kwargs=values)

    def json_post(self, name, data, client=None, **kwargs):
        return (client or self.client).post(self.url(name, **kwargs), data, content_type='application/json')

    def upload(self, *, name='photos', key='1e5157ee-e7f4-49e0-8e62-e6cd1ddfdf82', filename='portrait.jpg', **kwargs):
        return self.client.post(self.url(name, **kwargs), {'key': key, 'image': photo_file(filename)})

    def test_session_bootstraps_csrf_without_exposing_private_data(self):
        response = self.client.get(self.url('session'))
        self.assertIsNone(response.json()['user'])
        self.assertTrue(response.json()['csrfToken'])
        self.assertIn('csrftoken', response.cookies)
        self.assertIn('no-store', response['Cache-Control'])

    def test_assistant_can_login_without_staff_permission(self):
        response = self.json_post('login', {'username': 'assistant', 'password': 'test-password'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['user']['username'], 'assistant')
        self.assertFalse(self.assistant.is_staff)
        self.assertEqual(self.client.get(self.url('classes')).json()['classes'][0]['id'], str(self.group.pk))
        self.assertEqual(self.client.get(reverse('admin:index')).status_code, 302)

    def test_login_rejects_bad_password_unassigned_staff_and_inactive_user(self):
        for username, password in [('assistant', 'bad'), ('unassigned', 'test-password')]:
            self.assertEqual(self.json_post('login', {'username': username, 'password': password}).status_code, 401)
        self.assistant.is_active = False
        self.assistant.save(update_fields=['is_active'])
        self.assertEqual(self.json_post('login', {'username': 'assistant', 'password': 'test-password'}).status_code, 401)

    def test_login_rate_limit(self):
        for _ in range(8):
            self.assertEqual(self.json_post('login', {'username': 'assistant', 'password': 'bad'}).status_code, 401)
        response = self.json_post('login', {'username': 'assistant', 'password': 'bad'})
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response['Retry-After'], '300')

    def test_csrf_is_required_on_login_mutations_and_logout(self):
        client = HTTPSClient(enforce_csrf_checks=True)
        credentials = {'username': 'assistant', 'password': 'test-password'}
        self.assertEqual(self.json_post('login', credentials, client=client).status_code, 403)
        original_token = client.get(self.url('session')).json()['csrfToken']
        response = client.post(self.url('login'), credentials, content_type='application/json', HTTP_X_CSRFTOKEN=original_token)
        self.assertEqual(response.status_code, 200)
        token = response.json()['csrfToken']
        self.assertNotEqual(original_token, token)
        self.assertEqual(client.post(self.url('add-child'), {'first_name': 'Ioana', 'last_name': 'Test'}, content_type='application/json').status_code, 403)
        self.assertEqual(client.post(self.url('logout')).status_code, 403)
        self.assertEqual(client.post(self.url('logout'), HTTP_X_CSRFTOKEN=token).status_code, 200)
        self.assertEqual(client.get(self.url('classes')).status_code, 401)

    def test_anonymous_pin_and_unassigned_staff_cannot_access_cms(self):
        for name in ('classes', 'class', 'child', 'photos', 'reference-preview'):
            self.assertEqual(self.client.get(self.url(name), {'pin': self.group.pin}).status_code, 401)
        self.client.force_login(self.unassigned)
        self.assertEqual(self.client.get(self.url('classes')).json()['classes'], [])
        self.assertEqual(self.client.get(self.url('class')).status_code, 404)

    def test_class_scope_is_enforced_on_every_child_route(self):
        self.client.force_login(self.assistant)
        self.assertEqual(len(self.client.get(self.url('classes')).json()['classes']), 1)
        self.assertEqual(self.client.get(self.url('class', group=self.other_group)).status_code, 404)
        self.assertEqual(self.json_post('add-child', {'first_name': 'Ioana', 'last_name': 'Test'}, group=self.other_group).status_code, 404)
        for name in ('child', 'photos', 'reference-preview'):
            self.assertEqual(self.client.get(self.url(name, child=self.other_child)).status_code, 404)
            self.assertEqual(self.client.get(self.url(name, group=self.other_group, child=self.other_child)).status_code, 404)
        for name in ('photos', 'reference'):
            self.assertEqual(self.upload(name=name, child=self.other_child).status_code, 404)
        self.assertEqual(self.client.patch(self.url('child', child=self.other_child), {'first_name': 'Other'}, content_type='application/json').status_code, 404)
        self.assertFalse(AssistantUploadReceipt.objects.exists())

    def test_revoking_class_access_takes_effect_on_existing_session(self):
        self.client.force_login(self.assistant)
        self.grant.delete()
        self.assertEqual(self.client.get(self.url('class')).status_code, 404)
        self.assertEqual(self.upload().status_code, 404)

    def test_superuser_can_access_all_classes(self):
        self.client.force_login(self.admin)
        self.assertEqual(len(self.client.get(self.url('classes')).json()['classes']), 2)

    def test_create_and_edit_child_can_set_orders_but_not_class_or_pin(self):
        self.client.force_login(self.assistant)
        response = self.json_post('add-child', {
            'first_name': ' Ioana ', 'last_name': ' Test ', 'notes': 'Observație',
            'school_class': str(self.other_group.pk), 'pin': '0000', 'package_a': True,
        })
        self.assertEqual(response.status_code, 201, response.content)
        saved = Child.objects.get(pk=response.json()['child']['id'])
        self.assertEqual(saved.first_name, 'Ioana')
        self.assertEqual(saved.school_class_id, self.group.pk)
        self.assertTrue(saved.package_a)
        self.assertNotEqual(saved.pin, '0000')
        self.assertEqual(response.json()['child']['total_lei'], self.school.price_a)
        added_at = response.json()['child']['created_at']
        self.assertTrue(saved.profile_id)
        response = self.client.patch(self.url('child', child=saved), {
            'first_name': 'Ioana Maria', 'last_name': 'Test', 'notes': 'Nou', 'package_a': True,
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        saved.refresh_from_db()
        self.assertEqual(saved.first_name, 'Ioana Maria')
        self.assertTrue(saved.package_a)
        self.assertEqual(response.json()['child']['created_at'], added_at)

    def test_names_validation_duplicate_and_malformed_json(self):
        self.client.force_login(self.assistant)
        for invalid in [[], {'first_name': [], 'last_name': 'Name'}, {'first_name': '  ', 'last_name': 'Name'}, {'first_name': 'A' * 121, 'last_name': 'Name'}]:
            self.assertEqual(self.json_post('add-child', invalid).status_code, 400)
        self.assertEqual(self.json_post('add-child', {'first_name': 'Ana', 'last_name': 'Popescu'}).status_code, 400)
        self.assertEqual(self.client.post(self.url('add-child'), '{bad', content_type='application/json').status_code, 400)

    def test_crm_orders_use_teacher_validation_and_are_visible_on_teacher_list(self):
        self.client.force_login(self.assistant)
        response = self.client.patch(self.url('child'), {'package_a': True, 'package_d': True}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['child']['total_lei'], self.school.prices['a'] + self.school.prices['d'])
        response = self.client.patch(self.url('child'), {'package_a': False, 'package_b': True}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['child']['total_lei'], self.school.prices['b'] + self.school.prices['d'])
        teacher = self.client.get(reverse('schools-class-detail', args=[self.group.pk]), {'pin': self.group.pin}).json()
        saved = next(child for child in teacher['children'] if child['id'] == str(self.child.pk))
        self.assertFalse(saved['package_a'])
        self.assertTrue(saved['package_b'])
        self.assertTrue(saved['package_d'])
        self.assertEqual(saved['total_lei'], response.json()['child']['total_lei'])

    def test_crm_rejects_two_base_packages_and_addons_without_base(self):
        self.client.force_login(self.assistant)
        for packages in ({'package_a': True, 'package_b': True}, {'package_c': True}, {'package_d': True}, {'package_e': True}):
            with self.subTest(packages=packages):
                self.assertEqual(self.client.patch(self.url('child'), packages, content_type='application/json').status_code, 400)
        self.child.refresh_from_db()
        self.assertFalse(self.child.package_a)
        self.assertFalse(self.child.package_b)

    def test_crm_uses_returning_school_prices_and_ignores_supplied_total(self):
        self.school.is_returning_customer = True
        self.school.save(update_fields=['is_returning_customer'])
        self.client.force_login(self.assistant)
        response = self.json_post('add-child', {'first_name': 'Ioana', 'last_name': 'Test', 'package_a': True,
            'package_c': True, 'package_d': True, 'package_e': True, 'total_lei': 1})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['child']['total_lei'], 45 + 40 + 20 + 105)
        roster = self.client.get(self.url('class')).json()
        self.assertEqual(roster['class']['prices']['a'], 45)
        self.assertEqual(roster['class']['prices']['b'], 65)
        self.assertTrue(all(child['created_at'] for child in roster['children']))

    def test_teacher_package_change_is_reflected_in_crm(self):
        self.client.patch(reverse('schools-class-child', args=[self.group.pk, self.child.pk]),
            {'pin': self.group.pin, 'package_b': True, 'package_d': True}, content_type='application/json')
        self.client.force_login(self.assistant)
        child = self.client.get(self.url('child')).json()['child']
        self.assertTrue(child['package_b'])
        self.assertTrue(child['package_d'])
        self.assertEqual(child['total_lei'], self.school.prices['b'] + self.school.prices['d'])

    def test_new_crm_child_defaults_to_standard_and_rejects_explicit_empty_base(self):
        self.client.force_login(self.assistant)
        response = self.json_post('add-child', {'first_name': 'Ioana', 'last_name': 'Test'})
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()['child']['package_a'])
        self.assertFalse(response.json()['child']['package_b'])
        response = self.json_post('add-child', {'first_name': 'Maria', 'last_name': 'Test', 'package_a': False, 'package_b': False})
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Child.objects.filter(first_name='Maria', school_class=self.group).exists())

    def test_crm_cannot_unset_the_last_base_package(self):
        self.client.force_login(self.assistant)
        self.child.package_a = True
        self.child.save()
        response = self.client.patch(self.url('child'), {'package_a': False, 'package_b': False}, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.child.refresh_from_db()
        self.assertTrue(self.child.package_a)

    def test_editing_legacy_names_does_not_silently_add_a_package(self):
        self.client.force_login(self.assistant)
        response = self.client.patch(self.url('child'), {'notes': 'Updated note'}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()['child']['package_a'])
        self.assertFalse(response.json()['child']['package_b'])
        self.assertEqual(response.json()['child']['total_lei'], 0)

    def test_class_creation_time_is_available_for_sorting(self):
        self.client.force_login(self.assistant)
        item = self.client.get(self.url('classes')).json()['classes'][0]
        self.assertEqual(item['created_at'], self.group.created_at.isoformat())

    def test_album_upload_creates_variants_and_only_matches_selected_child(self):
        self.client.force_login(self.assistant)
        self.assertEqual(self.upload().status_code, 201)
        photo = ClassPhoto.objects.get()
        self.assertTrue(photo.thumb)
        self.assertTrue(photo.web)
        self.assertEqual(photo.school_class_id, self.group.pk)
        self.assertEqual(list(photo.children.all()), [self.child])
        self.assertEqual(PhotoMatch.objects.get().source, 'manual')
        response = self.client.get(self.url('photos'))
        self.assertEqual(response.json()['count'], 1)
        self.assertTrue(response.json()['photos'][0]['url'].startswith('/api/assistant/'))
        preview = self.client.get(response.json()['photos'][0]['url'])
        self.assertEqual(preview.status_code, 200)
        self.assertIn('no-store', preview['Cache-Control'])
        self.assertEqual(preview['Content-Type'], 'image/jpeg')
        # Consume the test client's wrapper so request_finished does not close
        # the surrounding PostgreSQL TestCase transaction.
        self.assertTrue(b''.join(preview.streaming_content))
        self.client.logout()
        self.assertEqual(self.client.get(response.json()['photos'][0]['url']).status_code, 401)

    def test_retried_upload_does_not_duplicate_and_key_cannot_move_to_other_child(self):
        self.client.force_login(self.assistant)
        self.assertEqual(self.upload().status_code, 201)
        response = self.upload()
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['duplicate'])
        self.assertEqual(ClassPhoto.objects.count(), 1)
        self.assertEqual(self.upload(filename='different.jpg').status_code, 409)
        self.assertEqual(self.upload(name='reference').status_code, 409)
        other = Child.objects.create(school_class=self.group, first_name='Ioana', last_name='Test')
        self.assertEqual(self.upload(child=other).status_code, 409)

    def test_reference_is_private_and_separate_from_album(self):
        self.client.force_login(self.assistant)
        self.assertEqual(self.upload(name='reference').status_code, 201)
        self.assertEqual(FaceReference.objects.get().child_id, self.child.pk)
        self.assertFalse(ClassPhoto.objects.exists())
        response = self.client.get(self.url('child'))
        preview_url = response.json()['child']['reference_url']
        preview = self.client.get(preview_url)
        self.assertEqual(preview.status_code, 200)
        self.assertTrue(b''.join(preview.streaming_content))
        self.grant.delete()
        self.assertEqual(self.client.get(preview_url).status_code, 404)

    def test_invalid_image_or_missing_key_does_not_create_receipt(self):
        self.client.force_login(self.assistant)
        response = self.client.post(self.url('photos'), {
            'key': '1e5157ee-e7f4-49e0-8e62-e6cd1ddfdf82',
            'image': SimpleUploadedFile('bad.jpg', b'not-an-image', content_type='image/jpeg'),
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client.post(self.url('photos'), {'image': photo_file()}).status_code, 400)
        self.assertFalse(ClassPhoto.objects.exists())
        self.assertFalse(AssistantUploadReceipt.objects.exists())

    def test_photo_preview_does_not_expose_another_childs_image(self):
        self.client.force_login(self.assistant)
        photo = ClassPhoto.objects.create(school_class=self.other_group, image=photo_file())
        PhotoMatch.objects.create(photo=photo, child=self.other_child)
        self.assertEqual(self.client.get(self.url('photo-preview', photo_id=photo.pk)).status_code, 404)

    def test_album_is_paginated(self):
        self.client.force_login(self.assistant)
        photos = ClassPhoto.objects.bulk_create([
            ClassPhoto(school_class=self.group, image=f'schools/fake-{index}.jpg') for index in range(25)
        ])
        PhotoMatch.objects.bulk_create([PhotoMatch(photo=photo, child=self.child) for photo in photos])
        first = self.client.get(self.url('photos')).json()
        second = self.client.get(self.url('photos'), {'page': 2}).json()
        self.assertEqual((first['count'], first['pages'], len(first['photos'])), (25, 2, 24))
        self.assertEqual(len(second['photos']), 1)

    @patch('schools.management.commands.create_crm_assistant.getpass', return_value='Unique-CRM-passphrase-491!')
    def test_provisioning_command_creates_nonstaff_account_and_grant(self, prompt):
        call_command('create_crm_assistant', 'new-assistant', class_ids=[str(self.group.pk)], first_name='Adina', stdout=StringIO())
        user = get_user_model().objects.get(username='new-assistant')
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.check_password('Unique-CRM-passphrase-491!'))
        self.assertEqual(user.class_assignments.get().school_class_id, self.group.pk)
        prompt.assert_called()

    @patch('schools.management.commands.create_crm_assistant.getpass')
    def test_provisioning_refuses_existing_account_or_unknown_class(self, prompt):
        for username, class_ids in [('assistant', [str(self.group.pk)]), ('new-assistant', ['not-a-uuid'])]:
            with self.assertRaises(CommandError):
                call_command('create_crm_assistant', username, class_ids=class_ids, stdout=StringIO())
        prompt.assert_not_called()

    @patch('schools.assistant_views.ClassPhoto.objects.create', side_effect=OSError('storage offline'))
    def test_failed_storage_rolls_back_receipt_for_retry(self, create_photo):
        self.client.force_login(self.assistant)
        with self.assertLogs('schools.assistant_views', level='ERROR'):
            self.assertEqual(self.upload().status_code, 503)
        self.assertFalse(AssistantUploadReceipt.objects.exists())
