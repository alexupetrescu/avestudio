import csv
from decimal import Decimal
from io import StringIO

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase, override_settings
from django.urls import reverse

from .forms import ChildPackageForm
from .models import Child, ChildPackageChoice, PhotoPackage, PhotoSession, School, SchoolClass, SessionPackage
from .offers import catalog_for_class, set_child_packages
from .pdf import class_list_context, render_class_list_pdf
from .tests import HTTPSClient

STORAGE = {'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'}, 'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'}}


@override_settings(STORAGES=STORAGE, SCHOOLS_R2_ENABLED=False)
class PackageQuantityTests(TestCase):
    client_class = HTTPSClient

    @classmethod
    def setUpTestData(cls):
        cls.owner = get_user_model().objects.create_superuser('quantity-owner', password='test-password')
        cls.school = School.objects.create(name='Quantity QA')
        cls.session = PhotoSession.objects.create(name='Quantity session', year=2026)
        cls.group = SchoolClass.objects.create(school=cls.school, session=cls.session, name='Configured')
        cls.legacy_group = SchoolClass.objects.create(school=cls.school, name='Legacy')
        cls.offers = []
        for code, kind, price in [('A', 'base', '50.25'), ('B', 'base', '70.10'), ('C', 'extra', '10.10')]:
            package = PhotoPackage.objects.create(name=code, kind=kind, new_price=Decimal(price))
            cls.offers.append(SessionPackage.objects.create(session=cls.session, package=package, code=code, legacy_key=code.lower()))

    def setUp(self):
        self.client.force_login(self.owner)

    def ids(self, legacy=False):
        return ['legacy:a', 'legacy:b', 'legacy:c'] if legacy else [str(offer.pk) for offer in self.offers]

    def create_child(self, group=None, **kwargs):
        return Child.objects.create(school_class=group or self.group, first_name='Ana', last_name='Test', **kwargs)

    def test_teacher_creates_quantities_and_crm_sees_and_edits_the_same_order(self):
        for legacy in (False, True):
            with self.subTest(legacy=legacy):
                group = self.legacy_group if legacy else self.group
                base, _, extra = self.ids(legacy)
                quantities = {base: 2, extra: 3}
                response = self.client.post(reverse('schools-class-add-child', args=[group.pk]), {'pin': group.pin, 'first_name': 'Ana', 'last_name': 'Test', 'package_quantities': quantities}, content_type='application/json')
                self.assertEqual(response.status_code, 201, response.content)
                saved = response.json()
                self.assertEqual(saved['package_quantities'], quantities)
                self.assertIs(saved['package_a'], True)
                child = Child.objects.get(pk=saved['id'])
                prices = {offer['id']: offer['price'] for offer in catalog_for_class(group)}
                self.assertEqual(child.total_lei, prices[base] * 2 + prices[extra] * 3)
                self.assertEqual(child.packages, 'A ×2, C ×3')
                crm = self.client.get(reverse('assistant:class', args=[group.pk])).json()['children'][0]
                self.assertEqual(crm['package_quantities'], quantities)
                quantities[extra] = 2
                response = self.client.patch(reverse('assistant:child', args=[group.pk, child.pk]), {'package_quantities': quantities}, content_type='application/json')
                self.assertEqual(response.status_code, 200, response.content)
                teacher = self.client.get(reverse('schools-class-detail', args=[group.pk]), {'pin': group.pin}).json()
                self.assertEqual(teacher['children'][0]['package_quantities'], quantities)

    def test_old_id_and_flag_clients_and_name_edits_preserve_quantities(self):
        for legacy in (False, True):
            group = self.legacy_group if legacy else self.group
            child = self.create_child(group)
            base, other, extra = self.ids(legacy)
            set_child_packages(child, {base: 2, extra: 3})
            url = reverse('assistant:child', args=[group.pk, child.pk])
            for payload in ({'notes': 'Name edits retain quantities'}, {'package_ids': [base, extra]}, {'package_a': True}):
                response = self.client.patch(url, payload, content_type='application/json')
                self.assertEqual(response.status_code, 200, response.content)
                self.assertEqual(response.json()['child']['package_quantities'], {base: 2, extra: 3})
            response = self.client.patch(url, {'package_a': False, 'package_b': True}, content_type='application/json')
            self.assertEqual(response.status_code, 200, response.content)
            self.assertEqual(response.json()['child']['package_quantities'], {other: 1, extra: 3})

    def test_invalid_quantities_and_conflicting_ids_are_rejected_without_changing_order(self):
        child = self.create_child()
        base, other, extra = self.ids()
        set_child_packages(child, {base: 2, extra: 3})
        url = reverse('assistant:child', args=[self.group.pk, child.pk])
        payloads = [{'package_quantities': {base: value}} for value in (0, -1, 100, 1.5, True, '2', None)]
        payloads += [{'package_quantities': value} for value in (None, [], 'bad', {base: 2, other: 2}, {'wrong-session': 2})]
        payloads += [{'package_ids': [base], 'package_quantities': {base: 2, extra: 3}}]
        payloads += [{'package_ids': [base, base], 'package_quantities': {base: 2}}]
        for payload in payloads:
            with self.subTest(payload=payload):
                self.assertEqual(self.client.patch(url, payload, content_type='application/json').status_code, 400)
                child.refresh_from_db()
                self.assertEqual(child.package_quantities, {base: 2, extra: 3})

    def test_archived_quantity_can_be_retained_or_reduced_but_not_increased(self):
        child = self.create_child()
        base, _, extra = self.ids()
        set_child_packages(child, {base: 2, extra: 3})
        self.offers[2].is_active = False
        self.offers[2].save()
        url = reverse('assistant:child', args=[self.group.pk, child.pk])
        for quantity, status in [(3, 200), (4, 400), (2, 200), (3, 400)]:
            response = self.client.patch(url, {'package_quantities': {base: 2, extra: quantity}}, content_type='application/json')
            self.assertEqual(response.status_code, status, response.content)

    def test_admin_forms_and_summary_exports_use_copies_instead_of_child_counts(self):
        for legacy in (False, True):
            with self.subTest(legacy=legacy):
                group = self.legacy_group if legacy else self.group
                child = self.create_child(group)
                base, _, extra = self.ids(legacy)
                values = {'school_class': str(group.pk), 'profile': str(child.profile_id), 'first_name': child.first_name, 'last_name': child.last_name, 'pin': child.pin, f'package_selection_{base}': '2', f'package_selection_{extra}': '3'}
                form = ChildPackageForm(values, instance=child, school_class=group)
                self.assertTrue(form.is_valid(), form.errors)
                child = form.save()
                self.assertEqual(child.package_quantities, {base: 2, extra: 3})
                response = self.client.get(reverse('admin:schools_schoolclass_change', args=[group.pk]))
                self.assertContains(response, f'package_selection_{base}')
                self.assertContains(response, 'value="3"')
                context = class_list_context(group)
                self.assertEqual(context['rows'][0]['marks'][0], 2)
                self.assertEqual(context['rows'][0]['marks'][2], 3)
                self.assertEqual(context['totals'], [2, 0, 3] if not legacy else [2, 0, 3, 0, 0])
                summary = admin.site._registry[SchoolClass].orders_summary(group)
                self.assertIn('A 2', summary)
                self.assertIn('C 3', summary)
                response = self.client.get(reverse('admin:schools_schoolclass_export', args=[group.pk]))
                rows = list(csv.reader(StringIO(response.content.decode('utf-8-sig')), delimiter=';'))
                self.assertEqual(rows[1][2:5], ['2', '', '3'])
                self.assertEqual(rows[-1][2:5], ['2', '0', '3'])
                self.assertTrue(render_class_list_pdf(group).startswith(b'%PDF'))
        school = admin.site._registry[School].get_queryset(None).get(pk=self.school.pk)
        self.assertEqual(admin.site._registry[School].orders_a(school), 'Base 4 · Extras 6')

    def test_stored_choices_enforce_positive_bounded_quantities(self):
        child = self.create_child()
        for quantity in (0, 100):
            with self.assertRaises(IntegrityError), transaction.atomic():
                ChildPackageChoice.objects.create(child=child, offer=self.offers[0], quantity=quantity)


class PackageQuantityMigrationTests(TransactionTestCase):
    def test_existing_choices_become_one_copy_without_changing_children(self):
        executor = MigrationExecutor(connection)
        restore = executor.loader.graph.leaf_nodes()
        old = [('schools', '0009_seed_current_session_offers')]
        try:
            executor.migrate(old)
            apps = executor.loader.project_state(old).apps
            school = apps.get_model('schools', 'School').objects.create(name='Quantity migration')
            session = apps.get_model('schools', 'PhotoSession').objects.create(name='Test', year=2026)
            group = apps.get_model('schools', 'SchoolClass').objects.create(school=school, session=session, name='Test')
            package = apps.get_model('schools', 'PhotoPackage').objects.create(name='Base', kind='base', new_price=50)
            offer = apps.get_model('schools', 'SessionPackage').objects.create(session=session, package=package, code='A')
            child = apps.get_model('schools', 'Child').objects.create(school_class=group, first_name='Ana', last_name='Test', match_key='ana-test', pin='1234', entry_index=1, package_a=True)
            choice = apps.get_model('schools', 'ChildPackageChoice').objects.create(child=child, offer=offer)
            executor = MigrationExecutor(connection)
            executor.migrate(restore)
            saved = Child.objects.get(pk=child.pk)
            self.assertEqual(saved.package_quantities, {str(offer.pk): 1})
            self.assertEqual(saved.childpackagechoice_set.get().pk, choice.pk)
            self.assertEqual((saved.pin, saved.entry_index, saved.created_at), ('1234', 1, child.created_at))
        finally:
            MigrationExecutor(connection).migrate(restore)
