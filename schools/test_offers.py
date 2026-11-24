from datetime import datetime, timezone
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.db.models.deletion import ProtectedError
from django.test import TestCase, TransactionTestCase, override_settings
from django.urls import reverse

from .forms import ChildPackageForm
from .models import Child, PackageItem, PhotoPackage, PhotoSession, School, SchoolClass, SessionPackage
from .offers import catalog_for_class, set_child_packages
from .tests import HTTPSClient

STORAGE = {'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'}, 'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'}}


@override_settings(STORAGES=STORAGE, SCHOOLS_R2_ENABLED=False)
class SessionOfferTests(TestCase):
    client_class = HTTPSClient

    def setUp(self):
        self.owner = get_user_model().objects.create_superuser('offer-owner', 'owner@example.test', 'test-password')
        self.client.force_login(self.owner)
        self.school = School.objects.create(name='Offer QA', is_returning_customer=True)
        self.session = PhotoSession.objects.create(name='Summer', year=2027)
        self.group = SchoolClass.objects.create(school=self.school, session=self.session, name='Offer class')
        self.bases = []
        self.extras = []
        for index in range(8):
            base = index < 3
            price = Decimal(str((index + 1) * 10)) + Decimal('0.25') if base else Decimal('0.10')
            package = PhotoPackage.objects.create(name=f'Custom {index}', kind='base' if base else 'extra', new_price=price, returning_price=price - 2 if base else None, digital_included=base)
            PackageItem.objects.create(package=package, quantity=2, name='Photograph', format='15×20 cm')
            offer = SessionPackage.objects.create(session=self.session, package=package, code=f'P{index}', sort_order=index)
            (self.bases if base else self.extras).append(offer)
        self.add_url = reverse('assistant:add-child', args=[self.group.pk])

    def create(self, ids, name='Child'):
        return self.client.post(self.add_url, {'first_name': name, 'last_name': 'Test', 'package_ids': ids}, content_type='application/json')

    def test_unlimited_offers_and_decimal_prices_are_shared_by_teacher_and_crm(self):
        ids = [str(self.bases[2].pk), *[str(offer.pk) for offer in self.extras]]
        response = self.create(ids)
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(set(response.json()['child']['package_ids']), set(ids))
        self.assertEqual(response.json()['child']['total_lei'], 28.75)
        child = Child.objects.get(pk=response.json()['child']['id'])
        self.assertEqual(child.total_lei, Decimal('28.75'))
        crm = self.client.get(reverse('assistant:class', args=[self.group.pk])).json()
        teacher = self.client.get(reverse('schools-class-detail', args=[self.group.pk]), {'pin': self.group.pin}).json()
        self.assertEqual(len(crm['class']['offers']), 8)
        self.assertEqual(crm['class']['offers'], teacher['offers'])
        self.assertEqual(teacher['children'][0]['total_lei'], 28.75)
        self.assertEqual(teacher['offers'][0]['items'][0]['quantity'], 2)
        self.assertEqual(teacher['offers'][0]['items'][0]['format'], '15×20 cm')

    def test_exclusive_base_addons_cross_session_and_duplicate_validation(self):
        other_session = PhotoSession.objects.create(name='Other', year=2027)
        other = SessionPackage.objects.create(session=other_session, package=self.bases[0].package, code='OTHER')
        invalid = ([], [str(self.extras[0].pk)], [str(item.pk) for item in self.bases[:2]], [str(other.pk)], [str(self.bases[0].pk)] * 2)
        for ids in invalid:
            with self.subTest(ids=ids):
                self.assertEqual(self.create(ids).status_code, 400)
        self.assertFalse(Child.objects.filter(school_class=self.group).exists())

    def test_session_price_overrides_are_isolated_and_support_both_school_tiers(self):
        offer = self.bases[0]
        offer.new_price, offer.returning_price = Decimal('101.10'), Decimal('99.99')
        offer.save()
        child = Child.objects.create(school_class=self.group, first_name='Price', last_name='Test')
        set_child_packages(child, [str(offer.pk)])
        self.assertEqual(child.total_lei, Decimal('99.99'))
        self.school.is_returning_customer = False
        self.school.save()
        fresh = Child.objects.select_related('school_class__school').get(pk=child.pk)
        self.assertEqual(fresh.total_lei, Decimal('101.10'))
        other_session = PhotoSession.objects.create(name='Other', year=2027)
        other_group = SchoolClass.objects.create(school=self.school, session=other_session, name='Other')
        SessionPackage.objects.create(session=other_session, package=offer.package, code='BASE')
        self.assertEqual(catalog_for_class(other_group)[0]['price'], Decimal('10.25'))

    def test_archived_packages_keep_existing_orders_but_cannot_be_newly_selected(self):
        offer = self.bases[0]
        response = self.create([str(offer.pk)])
        self.assertEqual(response.status_code, 201)
        child_id = response.json()['child']['id']
        offer.is_active = False
        offer.save()
        self.assertEqual(self.create([str(offer.pk)], 'Another').status_code, 400)
        child_url = reverse('assistant:child', args=[self.group.pk, child_id])
        response = self.client.patch(child_url, {'package_ids': [str(offer.pk)], 'first_name': 'Renamed'}, content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['child']['total_lei'], 8.25)
        with self.assertRaises(ProtectedError):
            offer.delete()
        offer.package.kind = 'extra'
        with self.assertRaises(ValidationError):
            offer.package.full_clean()

    def test_names_only_edit_does_not_restore_stale_legacy_package_flags(self):
        from backend.serializers import ChildOrderSerializer
        self.bases[0].legacy_key = 'a'
        self.bases[0].save()
        child = Child.objects.create(school_class=self.group, first_name='Stale', last_name='Test')
        set_child_packages(child, [str(self.bases[0].pk)])
        stale = Child.objects.get(pk=child.pk)
        set_child_packages(child, [str(self.bases[2].pk)])
        serializer = ChildOrderSerializer(stale, data={'first_name': 'Renamed'}, partial=True, context={'school_class': self.group})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        saved = serializer.save()
        self.assertEqual(saved.package_ids, [str(self.bases[2].pk)])
        self.assertFalse(saved.package_a)

    def test_exports_include_all_offers_and_exact_totals(self):
        import csv
        from io import BytesIO, StringIO
        from pypdf import PdfReader
        from .pdf import class_list_context, render_class_list_pdf
        ids = [str(self.bases[2].pk), *[str(offer.pk) for offer in self.extras]]
        self.assertEqual(self.create(ids).status_code, 201)
        self.assertEqual(self.client.get(reverse('admin:schools_school_changelist')).status_code, 200)
        context = class_list_context(self.group)
        self.assertTrue(context['compact_packages'])
        self.assertEqual(len(context['legend']), 8)
        self.assertEqual(sum(context['rows'][0]['marks']), 6)
        self.assertEqual(context['total_lei'], Decimal('28.75'))
        response = self.client.get(reverse('admin:schools_schoolclass_export', args=[self.group.pk]))
        rows = list(csv.reader(StringIO(response.content.decode('utf-8-sig')), delimiter=';'))
        self.assertIn('P7', rows[0][9])
        self.assertEqual(rows[1][10], '28.75')
        text = ''.join(page.extract_text() for page in PdfReader(BytesIO(render_class_list_pdf(self.group))).pages)
        self.assertIn('P7', text)
        self.assertIn('28.75', text)

    def test_admin_catalog_session_and_child_forms_render_and_save_dynamic_selections(self):
        self.assertEqual(self.client.get(reverse('admin:schools_child_changelist')).status_code, 200)
        for name, args, marker in (
            ('admin:schools_photopackage_change', [self.bases[0].package_id], 'items-0-quantity'),
            ('admin:schools_photosession_change', [self.session.pk], 'package_offers-0-code'),
            ('admin:schools_schoolclass_change', [self.group.pk], 'package_selection'),
        ):
            response = self.client.get(reverse(name, args=args))
            self.assertEqual(response.status_code, 200)
            self.assertContains(response, marker)
        child = Child.objects.create(school_class=self.group, first_name='Admin', last_name='Child')
        ids = [str(self.bases[1].pk), str(self.extras[0].pk)]
        form = ChildPackageForm({'school_class': str(self.group.pk), 'profile': str(child.profile_id), 'first_name': child.first_name, 'last_name': child.last_name, 'pin': child.pin, 'package_selection': ids}, instance=child, school_class=self.group)
        self.assertTrue(form.is_valid(), form.errors)
        child = form.save()
        self.assertEqual(set(child.package_ids), set(ids))
        self.assertEqual(child.total_lei, Decimal('18.35'))


class SessionOfferMigrationTests(TransactionTestCase):
    def test_existing_christmas_choices_prices_dates_and_indexes_are_preserved(self):
        executor = MigrationExecutor(connection)
        restore = executor.loader.graph.leaf_nodes()
        old = ('schools', '0007_child_entry_index')
        target = ('schools', '0009_seed_current_session_offers')
        try:
            executor.migrate([old])
            historical = executor.loader.project_state([old]).apps
            School = historical.get_model('schools', 'School')
            Session = historical.get_model('schools', 'PhotoSession')
            Group = historical.get_model('schools', 'SchoolClass')
            Child = historical.get_model('schools', 'Child')
            school = School.objects.create(name='Christmas QA', is_returning_customer=True)
            session = Session.objects.create(name='Crăciun', year=2026)
            group = Group.objects.create(school=school, session=session, name='Legacy class')
            child = Child.objects.create(school_class=group, first_name='Legacy', last_name='Child', match_key='legacy-child', pin='1234', entry_index=1, package_a=True, package_d=True)
            created = child.created_at
            executor = MigrationExecutor(connection)
            executor.migrate([target])
            from .models import Child as CurrentChild
            current = CurrentChild.objects.get(pk=child.pk)
            self.assertEqual(set(current.package_choices.values_list('code', flat=True)), {'A', 'D'})
            self.assertEqual(current.total_lei, Decimal('65.00'))
            self.assertEqual((current.pin, current.entry_index, current.created_at), ('1234', 1, created))
            self.assertTrue(current.package_a and current.package_d)
        finally:
            MigrationExecutor(connection).migrate(restore)
