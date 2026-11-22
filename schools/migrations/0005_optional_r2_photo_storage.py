"""Widen paths and select opt-in storage; no files or existing values are moved."""
import backend.school_storage
from django.db import migrations, models
import schools.models


class Migration(migrations.Migration):
    dependencies = [('schools', '0004_sessions_and_child_albums')]
    operations = [
        migrations.AlterField(model_name='classphoto', name='image', field=models.ImageField(
            'Original', upload_to=schools.models.upload_orig, max_length=500,
            storage=backend.school_storage.school_media_storage,
        )),
        migrations.AlterField(model_name='classphoto', name='web', field=models.ImageField(
            upload_to=schools.models.upload_web, max_length=500,
            storage=backend.school_storage.school_media_storage, blank=True, null=True, editable=False,
        )),
        migrations.AlterField(model_name='classphoto', name='thumb', field=models.ImageField(
            upload_to=schools.models.upload_thumb, max_length=500,
            storage=backend.school_storage.school_media_storage, blank=True, null=True, editable=False,
        )),
        migrations.AlterField(model_name='facereference', name='image', field=models.ImageField(
            upload_to=schools.models.upload_ref, max_length=500,
            storage=backend.school_storage.school_media_storage,
        )),
    ]
