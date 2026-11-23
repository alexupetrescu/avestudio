from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('schools', '0005_optional_r2_photo_storage'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ClassAssistant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='class_assignments', to=settings.AUTH_USER_MODEL)),
                ('school_class', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assistant_assignments', to='schools.schoolclass')),
            ],
            options={
                'verbose_name': 'CRM class access', 'verbose_name_plural': 'CRM class access',
                'constraints': [models.UniqueConstraint(fields=('user', 'school_class'), name='unique_class_assistant')],
            },
        ),
        migrations.CreateModel(
            name='AssistantUploadReceipt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.UUIDField()),
                ('kind', models.CharField(choices=[('photo', 'Album photo'), ('reference', 'Reference portrait')], max_length=12)),
                ('filename', models.CharField(max_length=255)),
                ('size', models.PositiveBigIntegerField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('child', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='schools.child')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={'constraints': [models.UniqueConstraint(fields=('user', 'key'), name='unique_assistant_upload')]},
        ),
    ]
