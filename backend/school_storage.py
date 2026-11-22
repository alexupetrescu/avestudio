"""New school photos can use private R2; existing local paths stay local."""
from functools import lru_cache
import mimetypes
import re
import tempfile
from urllib.parse import quote
import uuid

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured, SuspiciousFileOperation
from django.core.files import File
from django.core.files.storage import Storage, default_storage

SCOPE = re.compile(r'^schools/([0-9a-f-]{36})/(orig|web|thumb|refs)/(.+)$')
REMOTE = re.compile(r'^schools/([0-9a-f-]{36})/(orig|web|thumb|refs)/__r2__/([0-9a-f]{32})/([^/]+)$')


def is_r2_name(name):
    return bool(REMOTE.fullmatch(name))


def validate_configuration(endpoint, bucket, access_key, secret_key):
    if not re.fullmatch(r'https://[0-9a-f]{32}(?:\.eu|\.us|\.fedramp)?\.r2\.cloudflarestorage\.com', endpoint):
        raise ImproperlyConfigured('Use the HTTPS S3 endpoint shown by Cloudflare R2.')
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{1,61}[a-z0-9]', bucket):
        raise ImproperlyConfigured('Set a valid private R2 bucket name.')
    if not access_key or not secret_key:
        raise ImproperlyConfigured('Both the R2 Access Key ID and Secret Access Key are required.')


@lru_cache(maxsize=2)
def _client(endpoint, access_key, secret_key):
    import boto3
    from botocore.config import Config
    return boto3.client(
        's3', endpoint_url=endpoint, region_name='auto',
        aws_access_key_id=access_key, aws_secret_access_key=secret_key,
        config=Config(
            signature_version='s3v4', s3={'addressing_style': 'path'},
            connect_timeout=10, read_timeout=90, retries={'max_attempts': 3, 'mode': 'standard'},
            request_checksum_calculation='when_required', response_checksum_validation='when_required',
        ),
    )


def r2_client():
    endpoint = getattr(settings, 'SCHOOLS_R2_ENDPOINT', '').rstrip('/')
    bucket = getattr(settings, 'SCHOOLS_R2_BUCKET', '')
    key = getattr(settings, 'SCHOOLS_R2_ACCESS_KEY_ID', '')
    secret = getattr(settings, 'SCHOOLS_R2_SECRET_ACCESS_KEY', '')
    validate_configuration(endpoint, bucket, key, secret)
    return _client(endpoint, key, secret)


class SchoolMediaStorage(Storage):
    def get_available_name(self, name, max_length=None):
        name = str(name).replace('\\', '/')
        if not getattr(settings, 'SCHOOLS_R2_ENABLED', False):
            if is_r2_name(name):
                raise ImproperlyConfigured('Enable R2 before writing an R2 object.')
            return default_storage.get_available_name(name, max_length=max_length)
        match = SCOPE.fullmatch(name)
        if not match or '..' in name.split('/') or '\\' in name:
            raise SuspiciousFileOperation('R2 storage accepts school photo paths only.')
        uuid.UUID(match[1])
        filename = name.rsplit('/', 1)[-1]
        name = f'schools/{match[1]}/{match[2]}/__r2__/{uuid.uuid4().hex}/{filename}'
        if max_length and len(name) > max_length:
            raise SuspiciousFileOperation('Photo filename is too long.')
        return name

    def _save(self, name, content):
        if is_r2_name(name):
            r2_client().put_object(
                Bucket=settings.SCHOOLS_R2_BUCKET, Key=name, Body=content,
                ContentType=mimetypes.guess_type(name)[0] or 'application/octet-stream',
                StorageClass='STANDARD',
                CacheControl='private, no-store',
            )
            return name
        return default_storage.save(name, content)

    def _open(self, name, mode='rb'):
        if not is_r2_name(name):
            return default_storage.open(name, mode)
        if mode not in ('r', 'rb'):
            raise ValueError('R2 photos must be opened for reading.')
        temporary = tempfile.SpooledTemporaryFile(max_size=8 * 1024 * 1024, mode='w+b')
        try:
            r2_client().download_fileobj(settings.SCHOOLS_R2_BUCKET, name, temporary)
            temporary.seek(0)
            return File(temporary, name=name)
        except Exception:
            temporary.close()
            raise

    def delete(self, name):
        if is_r2_name(name):
            r2_client().delete_object(Bucket=settings.SCHOOLS_R2_BUCKET, Key=name)
        else:
            default_storage.delete(name)

    def exists(self, name):
        if not is_r2_name(name):
            return default_storage.exists(name)
        try:
            r2_client().head_object(Bucket=settings.SCHOOLS_R2_BUCKET, Key=name)
            return True
        except Exception as error:
            if getattr(error, 'response', {}).get('Error', {}).get('Code') in ('404', 'NoSuchKey', 'NotFound'):
                return False
            raise

    def size(self, name):
        if is_r2_name(name):
            return r2_client().head_object(Bucket=settings.SCHOOLS_R2_BUCKET, Key=name)['ContentLength']
        return default_storage.size(name)

    def url(self, name):
        if is_r2_name(name):
            return '/media/' + quote(name, safe='/')
        return default_storage.url(name)

    def path(self, name):
        if is_r2_name(name):
            raise NotImplementedError('R2 objects have no local filesystem path.')
        return default_storage.path(name)


def school_media_storage():
    return SchoolMediaStorage()
