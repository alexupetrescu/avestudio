import uuid

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class SessionMigrationPreservationTests(TransactionTestCase):
    def test_migration_preserves_existing_access_and_photo_assignments(self):
        old_target = [('schools', '0003_child_package_e_alter_child_package_a_and_more')]
        new_target = [('schools', '0004_sessions_and_child_albums')]
        executor = MigrationExecutor(connection)
        executor.migrate(old_target)
        try:
            old = executor.loader.project_state(old_target).apps
            school = old.get_model('schools', 'School').objects.create(name='Legacy school', season=2025)
            groups = [old.get_model('schools', 'SchoolClass').objects.create(
                school=school, name=name, pin='4321', qr_code='schools/qr/existing-class.png',
            ) for name in ('Grupa A', 'Grupa B')]
            ids = [uuid.uuid4(), uuid.uuid4()]
            for child_id, group in zip(ids, groups):
                old.get_model('schools', 'Child').objects.create(
                    id=child_id, school_class=group, first_name='Ana', last_name='Popescu',
                    match_key='ana-popescu', pin='1234', package_a=True,
                    qr_code=f'schools/qr/{child_id}.png',
                )
            photo = old.get_model('schools', 'ClassPhoto').objects.create(
                school_class=groups[0], image='schools/orig/unchanged.jpg',
                web='schools/web/unchanged.webp', thumb='schools/thumb/unchanged.webp',
            )
            old.get_model('schools', 'PhotoMatch').objects.create(photo=photo, child_id=ids[0], source='manual')
            old.get_model('schools', 'FaceReference').objects.create(
                child_id=ids[0], image='schools/refs/unchanged.jpg', embedding=[0.1, 0.2],
            )
            executor = MigrationExecutor(connection)
            executor.migrate(new_target)
            new = executor.loader.project_state(new_target).apps
            for child_id in ids:
                child = new.get_model('schools', 'Child').objects.get(pk=child_id)
                self.assertEqual(child.profile_id, child_id)
                self.assertEqual(child.pin, '1234')
                self.assertEqual(child.profile.pin, '1234')
                self.assertEqual(child.qr_code.name, f'schools/qr/{child_id}.png')
                self.assertTrue(child.package_a)
                self.assertEqual(child.school_class.session.year, 2025)
                self.assertEqual(child.school_class.pin, '4321')
            self.assertEqual(new.get_model('schools', 'ChildProfile').objects.count(), 2)
            saved = new.get_model('schools', 'ClassPhoto').objects.get(pk=photo.pk)
            self.assertEqual(saved.image.name, 'schools/orig/unchanged.jpg')
            self.assertEqual(saved.web.name, 'schools/web/unchanged.webp')
            self.assertEqual(saved.thumb.name, 'schools/thumb/unchanged.webp')
            self.assertEqual(saved.matches.get().child_id, ids[0])
            self.assertEqual(new.get_model('schools', 'FaceReference').objects.get().embedding, [0.1, 0.2])
            # Reversing the additive migration also retains all original records.
            executor = MigrationExecutor(connection)
            executor.migrate(old_target)
            restored = executor.loader.project_state(old_target).apps
            self.assertEqual(restored.get_model('schools', 'Child').objects.count(), 2)
            self.assertEqual(restored.get_model('schools', 'PhotoMatch').objects.get().child_id, ids[0])
        finally:
            latest = MigrationExecutor(connection)
            latest.migrate(latest.loader.graph.leaf_nodes())
