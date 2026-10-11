from django.core.management.base import BaseCommand, CommandError

from schools import face_engine
from schools.face_tasks import run_job
from schools.models import ClassPhoto, FaceJob, PhotoMatch, SchoolClass


class Command(BaseCommand):
    help = "Run face matching for a class synchronously (same code the admin runs in a thread)."

    def add_arguments(self, parser):
        parser.add_argument('--class', dest='class_id', required=True, help='SchoolClass UUID')
        parser.add_argument('--reset', action='store_true',
                            help='Re-process every photo (drops face/filename matches, keeps manual ones)')

    def handle(self, *args, **options):
        try:
            school_class = SchoolClass.objects.get(pk=options['class_id'])
        except (SchoolClass.DoesNotExist, ValueError):
            raise CommandError('Class not found')

        if not face_engine.available():
            self.stdout.write(self.style.WARNING(
                f"Face engine unavailable: {face_engine.unavailable_reason()}. Filename matching only."
            ))

        if options['reset']:
            PhotoMatch.objects.filter(
                photo__school_class=school_class,
                source__in=[PhotoMatch.SOURCE_FACE, PhotoMatch.SOURCE_FILENAME],
            ).delete()
            ClassPhoto.objects.filter(school_class=school_class).update(faces_processed=False)

        job = FaceJob.objects.create(school_class=school_class)
        self.stdout.write(f"Job {job.pk} for {school_class} ...")
        run_job(job.pk)
        job.refresh_from_db()
        self.stdout.write(job.log)
        style = self.style.SUCCESS if job.status == FaceJob.DONE else self.style.ERROR
        self.stdout.write(style(f"{job.status}: {job.matched_photos} matched / {job.unmatched_photos} unmatched"))
