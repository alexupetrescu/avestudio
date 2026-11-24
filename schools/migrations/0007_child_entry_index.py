from django.db import migrations, models


def backfill_entry_indexes(apps, schema_editor):
    Child = apps.get_model('schools', 'Child')
    database = schema_editor.connection.alias
    children = Child.objects.using(database).order_by('school_class_id', models.F('created_at').asc(nulls_last=True), 'pk')
    current_class, index, batch = None, 0, []
    for child in children.iterator(chunk_size=500):
        if child.school_class_id != current_class:
            current_class, index = child.school_class_id, 0
        index += 1
        child.entry_index = index
        batch.append(child)
        if len(batch) == 500:
            Child.objects.using(database).bulk_update(batch, ['entry_index'], batch_size=500)
            batch = []
    if batch:
        Child.objects.using(database).bulk_update(batch, ['entry_index'], batch_size=500)


class Migration(migrations.Migration):
    dependencies = [('schools', '0006_assistant_crm')]
    operations = [
        migrations.AddField(model_name='child', name='entry_index', field=models.PositiveBigIntegerField(editable=False, null=True, verbose_name='Entry index')),
        migrations.RunPython(backfill_entry_indexes, migrations.RunPython.noop),
        migrations.AlterField(model_name='child', name='entry_index', field=models.PositiveBigIntegerField(editable=False, verbose_name='Entry index')),
        migrations.AddConstraint(model_name='child', constraint=models.UniqueConstraint(fields=('school_class', 'entry_index'), name='unique_child_entry_per_class')),
    ]
