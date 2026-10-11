from django.core.management.base import BaseCommand, CommandError

from schools.models import ClassPhoto, SchoolClass


class Command(BaseCommand):
    help = "Regenerate web + thumb variants for class photos (all, or one class)."

    def add_arguments(self, parser):
        parser.add_argument('--class', dest='class_id', help='SchoolClass UUID (default: all classes)')
        parser.add_argument('--missing-only', action='store_true', help='Only photos without variants')

    def handle(self, *args, **options):
        qs = ClassPhoto.objects.all()
        if options['class_id']:
            try:
                qs = qs.filter(school_class=SchoolClass.objects.get(pk=options['class_id']))
            except (SchoolClass.DoesNotExist, ValueError):
                raise CommandError('Class not found')
        if options['missing_only']:
            qs = qs.filter(web='')

        done = failed = 0
        for photo in qs.iterator():
            try:
                photo.build_variants()
                photo.save(update_fields=['web', 'thumb', 'width', 'height'])
                done += 1
            except Exception as exc:
                failed += 1
                self.stderr.write(f"#{photo.pk} {photo.filename}: {exc}")
        self.stdout.write(self.style.SUCCESS(f"Rebuilt {done} photo(s), {failed} failed."))
