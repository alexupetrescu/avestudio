"""Durable entry order across CRM, admin, legacy backfill and simultaneous additions."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from unittest import skipUnless

from django.contrib.auth import get_user_model
from django.db import close_old_connections, connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase, override_settings
from django.urls import reverse

from .models import Child, School, SchoolClass
from .tests import HTTPSClient

STORAGE = {'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'}, 'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'}}


@override_settings(STORAGES=STORAGE, SCHOOLS_R2_ENABLED=False)
class ChildEntryOrderTests(TestCase):
    client_class = HTTPSClient

    def setUp(self):
        self.school = School.objects.create(name='Order QA')
        self.group = SchoolClass.objects.create(school=self.school, name='Class QA')

    def add(self, last_name, **extra):
        return Child.objects.create(school_class=self.group, last_name=last_name, first_name='Test', **extra)

    def test_indexes_follow_addition_not_name_and_survive_edits(self):
        first, second = self.add('Zulu'), self.add('Alpha')
        self.assertEqual((first.entry_index, second.entry_index), (1, 2))
        timestamp = first.created_at
        first.entry_index = 999
        first.last_name = 'Omega'
        first.package_a = True
        first.save()
        first.refresh_from_db()
        self.assertEqual((first.entry_index, first.created_at), (1, timestamp))
        first.delete()
        self.assertEqual(self.add('Beta').entry_index, 3)

    def test_each_class_has_its_own_indexes_and_moving_reallocates(self):
        first = self.add('First')
        other = SchoolClass.objects.create(school=self.school, name='Other class')
        existing = Child.objects.create(school_class=other, first_name='Other', last_name='Child')
        self.assertEqual(existing.entry_index, 1)
        first.school_class = other
        first.save()
        self.assertEqual(first.entry_index, 2)

    def test_crm_exposes_immutable_index_and_timestamp_and_returns_in_entry_order(self):
        owner = get_user_model().objects.create_superuser('order-owner', 'owner@example.test', 'test-password')
        self.client.force_login(owner)
        first, second = self.add('Zulu'), self.add('Alpha')
        fixed = datetime(2026, 11, 24, 12, 0, 0, tzinfo=timezone.utc)
        Child.objects.filter(school_class=self.group).update(created_at=fixed)
        url = reverse('assistant:class', args=[self.group.pk])
        rows = self.client.get(url).json()['children']
        self.assertEqual([row['id'] for row in rows], [str(first.pk), str(second.pk)])
        self.assertEqual([row['entry_index'] for row in rows], [1, 2])
        response = self.client.post(reverse('assistant:add-child', args=[self.group.pk]), {'last_name': 'New', 'first_name': 'Child', 'entry_index': 99, 'created_at': '2000-01-01T00:00:00Z'}, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['child']['entry_index'], 3)
        self.assertNotEqual(response.json()['child']['created_at'], '2000-01-01T00:00:00Z')

    def test_admin_class_roster_has_sort_controls_metadata_and_entry_order(self):
        owner = get_user_model().objects.create_superuser('admin-owner', 'admin@example.test', 'test-password')
        self.client.force_login(owner)
        self.add('Zulu')
        self.add('Alpha')
        response = self.client.get(reverse('admin:schools_schoolclass_change', args=[self.group.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'data-roster-sort="oldest"')
        self.assertContains(response, 'data-roster-sort="name-asc"')
        self.assertContains(response, 'column-entry_index')
        self.assertContains(response, 'column-added_at')
        self.assertContains(response, 'admin/js/child_sort.js')
        rows = response.context['inline_admin_formsets'][0].formset.get_queryset()
        self.assertEqual(list(rows.values_list('last_name', flat=True)), ['Zulu', 'Alpha'])


@override_settings(STORAGES=STORAGE, SCHOOLS_R2_ENABLED=False)
class ConcurrentChildOrderTests(TransactionTestCase):
    @skipUnless(connection.vendor == 'postgresql', 'Parent row locks require PostgreSQL')
    def test_simultaneous_creations_receive_unique_increasing_indexes(self):
        school = School.objects.create(name='Concurrent QA')
        group = SchoolClass.objects.create(school=school, name='Concurrent class')
        def create(number):
            close_old_connections()
            try:
                return Child.objects.create(school_class_id=group.pk, last_name=f'Child {number}', first_name='Test').entry_index
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=4) as workers:
            indexes = list(workers.map(create, range(4)))
        self.assertEqual(sorted(indexes), [1, 2, 3, 4])


class LegacyEntryOrderMigrationTests(TransactionTestCase):
    def test_backfill_preserves_dates_and_deterministically_indexes_legacy_ties(self):
        old = ('schools', '0006_assistant_crm')
        target = ('schools', '0007_child_entry_index')
        executor = MigrationExecutor(connection)
        try:
            executor.migrate([old])
            historical = executor.loader.project_state([old]).apps
            School = historical.get_model('schools', 'School')
            SchoolClass = historical.get_model('schools', 'SchoolClass')
            Child = historical.get_model('schools', 'Child')
            school = School.objects.create(name='Legacy QA')
            group = SchoolClass.objects.create(school=school, name='Legacy class')
            second = Child.objects.create(id='00000000-0000-0000-0000-000000000002', school_class=group, last_name='Alpha', first_name='Test', match_key='alpha-test')
            first = Child.objects.create(id='00000000-0000-0000-0000-000000000001', school_class=group, last_name='Zulu', first_name='Test', match_key='zulu-test')
            fixed = datetime(2026, 11, 24, 12, 0, 0, tzinfo=timezone.utc)
            Child.objects.filter(school_class=group).update(created_at=fixed)
            executor = MigrationExecutor(connection)
            executor.migrate([target])
            migrated = executor.loader.project_state([target]).apps.get_model('schools', 'Child')
            rows = list(migrated.objects.filter(school_class_id=group.pk).order_by('entry_index'))
            self.assertEqual([(str(row.pk), row.entry_index) for row in rows], [(str(first.pk), 1), (str(second.pk), 2)])
            self.assertTrue(all(row.created_at == fixed for row in rows))
        finally:
            MigrationExecutor(connection).migrate([target])
