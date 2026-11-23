"""Provision a scoped assistant without granting access to Django administration."""

from getpass import getpass

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from schools.models import ClassAssistant, SchoolClass


class Command(BaseCommand):
    help = 'Create an assistant with an interactively entered password and access to existing classes.'

    def add_arguments(self, parser):
        parser.add_argument('username')
        parser.add_argument('--class', dest='class_ids', action='append', required=True, help='Existing class UUID; repeat for multiple classes.')
        parser.add_argument('--first-name', default='')
        parser.add_argument('--last-name', default='')

    def handle(self, *args, **options):
        user_model = get_user_model()
        if user_model.objects.filter(username=options['username']).exists():
            raise CommandError('This username already exists. Manage its CRM class access in Django admin.')
        classes = []
        for class_id in set(options['class_ids']):
            try:
                classes.append(SchoolClass.objects.get(pk=class_id))
            except (SchoolClass.DoesNotExist, ValidationError):
                raise CommandError(f'Class not found: {class_id}')
        user = user_model(username=options['username'], first_name=options['first_name'], last_name=options['last_name'])
        try:
            user.full_clean(exclude=['password'])
            password = getpass('Password: ')
            if password != getpass('Password (again): '):
                raise CommandError('Passwords do not match. No account was created.')
            validate_password(password, user)
        except (EOFError, KeyboardInterrupt):
            raise CommandError('Cancelled. No account was created.')
        except ValidationError as error:
            raise CommandError(' '.join(error.messages))
        with transaction.atomic():
            user.set_password(password)
            user.save()
            ClassAssistant.objects.bulk_create([ClassAssistant(user=user, school_class=school_class) for school_class in classes])
        self.stdout.write(self.style.SUCCESS(f'Created {user.get_username()} with CRM access to {len(classes)} class(es). Sign in at /crm/.'))
