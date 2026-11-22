"""Add session history without changing existing IDs, PINs, files or matches.

Each existing child receives its own album identity, even when names match.
Existing class rosters and orders remain in place. Reverse migration removes
only the new metadata; it does not delete existing children or photo records.
"""
import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import schools.models


def preserve_existing_albums(apps, schema_editor):
    alias = schema_editor.connection.alias
    SchoolClass = apps.get_model('schools', 'SchoolClass')
    PhotoSession = apps.get_model('schools', 'PhotoSession')
    Child = apps.get_model('schools', 'Child')
    ChildProfile = apps.get_model('schools', 'ChildProfile')
    sessions = {}
    for group in SchoolClass.objects.using(alias).select_related('school').iterator():
        year = group.school.season
        if year not in sessions:
            sessions[year] = PhotoSession.objects.using(alias).create(name='Sesiune existentă', year=year).pk
        SchoolClass.objects.using(alias).filter(pk=group.pk).update(session_id=sessions[year])
    for child in Child.objects.using(alias).iterator():
        ChildProfile.objects.using(alias).create(
            id=child.pk, first_name=child.first_name, last_name=child.last_name, pin=child.pin,
        )
        Child.objects.using(alias).filter(pk=child.pk).update(profile_id=child.pk)


class Migration(migrations.Migration):
    dependencies = [
        ('schools', '0003_child_package_e_alter_child_package_a_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.CreateModel(name='PhotoSession', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('name', models.CharField(max_length=120, help_text='Christmas, March, Summer, etc.')),
            ('year', models.PositiveIntegerField(default=2026)),
            ('date', models.DateField(null=True, blank=True, help_text='Used to order sessions within a year.')),
            ('created_at', models.DateTimeField(auto_now_add=True)),
        ], options={'ordering': ['-year', '-date', '-created_at']}),
        migrations.CreateModel(name='ChildProfile', fields=[
            ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
            ('first_name', models.CharField(max_length=120)),
            ('last_name', models.CharField(max_length=120)),
            ('pin', models.CharField(max_length=4, default=schools.models.generate_pin)),
            ('created_at', models.DateTimeField(auto_now_add=True)),
        ], options={'ordering': ['last_name', 'first_name'], 'verbose_name': 'Child album'}),
        migrations.AddField(model_name='schoolclass', name='session', field=models.ForeignKey(
            to='schools.photosession', related_name='classes', null=True,
            on_delete=django.db.models.deletion.PROTECT,
        )),
        migrations.AddField(model_name='child', name='profile', field=models.ForeignKey(
            to='schools.childprofile', related_name='enrollments', null=True, blank=True,
            on_delete=django.db.models.deletion.PROTECT,
            help_text='Reuse the same child album for later sessions. Leave empty for a new child.',
        )),
        migrations.RunPython(preserve_existing_albums, migrations.RunPython.noop),
        migrations.AddConstraint(model_name='child', constraint=models.UniqueConstraint(
            fields=['school_class', 'profile'], name='unique_child_profile_per_class',
        )),
        migrations.CreateModel(name='ClassUpload', fields=[
            ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
            ('run_matching', models.BooleanField(default=True)),
            ('finished', models.BooleanField(default=False)),
            ('created_at', models.DateTimeField(auto_now_add=True)),
            ('owner', models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=django.db.models.deletion.CASCADE)),
            ('school_class', models.ForeignKey(to='schools.schoolclass', on_delete=django.db.models.deletion.CASCADE)),
        ]),
        migrations.CreateModel(name='UploadReceipt', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('key', models.UUIDField()),
            ('kind', models.CharField(max_length=12)),
            ('filename', models.CharField(max_length=255)),
            ('size', models.PositiveBigIntegerField()),
            ('upload', models.ForeignKey(to='schools.classupload', related_name='receipts', on_delete=django.db.models.deletion.CASCADE)),
        ], options={'constraints': [models.UniqueConstraint(fields=['upload', 'key'], name='unique_class_upload_file')]}),
    ]
