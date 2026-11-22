from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from backend.r2_probe import bucket_usage, verify_object_access
from backend.school_storage import r2_client


class Command(BaseCommand):
    help = 'Check the school R2 configuration. --probe writes/reads/deletes one temporary test object.'

    def add_arguments(self, parser):
        parser.add_argument('--probe', action='store_true')
        parser.add_argument('--usage', action='store_true')

    def handle(self, *args, **options):
        try:
            client = r2_client()
            bucket = settings.SCHOOLS_R2_BUCKET
            if options['probe']:
                verify_object_access(client, bucket)
                self.stdout.write(self.style.SUCCESS('R2 write/read/delete check passed.'))
            if options['usage']:
                objects, size = bucket_usage(client, bucket)
                self.stdout.write(f'{bucket}: {objects} objects, {size / 1_000_000_000:.3f} GB.')
                self.stdout.write('The 10 GB-month free allowance is shared across the Cloudflare account; this is bucket usage only.')
            if not options['probe'] and not options['usage']:
                self.stdout.write('R2 configuration is present. Use --probe to verify access or --usage to list bucket usage.')
            self.stdout.write('New school writes: ' + ('R2' if settings.SCHOOLS_R2_ENABLED else 'local (R2 not enabled)'))
        except Exception as error:
            raise CommandError('R2 check failed: ' + str(error)) from error
