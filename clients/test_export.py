from contextlib import redirect_stdout
from io import BytesIO, StringIO
import json
from pathlib import Path
import tempfile
import tarfile
from unittest.mock import patch

from django.core.files.base import ContentFile
from django.test import TestCase, override_settings

from clients.exporting import write_index, write_photos
from clients.models import AlbumImage, ClientAlbum, GoogleDriveAlbum
from ops.download_client_albums import needed_images, receive_photos, safe_filename, write_manifest, REMOTE


class ClientAlbumExportTests(TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.settings_override = override_settings(
            MEDIA_ROOT=self.root / 'media',
            STORAGES={
                'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
                'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
            },
        )
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        self.album = ClientAlbum.objects.create(title='Album: ANA / 2025')
        self.empty_album = ClientAlbum.objects.create(title='Empty album')
        self.image = AlbumImage.objects.create(album=self.album, image=ContentFile(b'original photo bytes', name='portrait.jpg'))
        GoogleDriveAlbum.objects.create(title='Google linked album', folder_link='https://drive.google.com/drive/folders/test-folder')

    def index(self):
        stream = StringIO()
        write_index(stream)
        records = [json.loads(line) for line in stream.getvalue().splitlines()]
        albums = {record['id']: record for record in records if record['type'] == 'album'}
        images = {record['id']: record for record in records if record['type'] == 'image'}
        return albums, images, records[-1]

    def test_index_includes_all_local_originals_and_empty_albums_but_no_google_albums_or_pins(self):
        albums, images, summary = self.index()
        self.assertEqual(set(albums), {str(self.album.pk), str(self.empty_album.pk)})
        self.assertEqual(list(images), [self.image.pk])
        self.assertEqual(summary['errors'], 0)
        self.assertEqual(summary['bytes'], len(b'original photo bytes'))
        self.assertEqual(len(images[self.image.pk]['sha256']), 64)
        self.assertNotIn('pin', json.dumps(albums))

    def test_stream_download_verifies_original_and_rerun_skips_it(self):
        albums, images, _ = self.index()
        archive = BytesIO()
        write_photos(archive, list(images.values()))
        archive.seek(0)
        destination = self.root / 'export'
        destination.mkdir()
        with redirect_stdout(StringIO()):
            receive_photos(archive, destination, albums, list(images.values()))
        saved = destination / images[self.image.pk]['local_path']
        self.assertEqual(saved.read_bytes(), b'original photo bytes')
        needed, skipped = needed_images(destination, albums, images)
        self.assertEqual(needed, [])
        self.assertEqual(skipped, 1)
        write_manifest(destination, albums, images, True)
        manifest = json.loads((destination / 'client-albums-export.json').read_text())
        self.assertTrue(manifest['completed'])
        self.assertEqual(AlbumImage.objects.count(), 1)
        self.assertTrue(self.image.image.storage.exists(self.image.image.name))

    def test_same_original_filename_in_different_albums_is_preserved_separately(self):
        AlbumImage.objects.create(album=self.empty_album, image=ContentFile(b'other bytes', name='portrait.jpg'))
        albums, images, _ = self.index()
        archive = BytesIO()
        write_photos(archive, list(images.values()))
        archive.seek(0)
        destination = self.root / 'export'
        destination.mkdir()
        with redirect_stdout(StringIO()):
            receive_photos(archive, destination, albums, list(images.values()))
        self.assertEqual(len(list(destination.rglob('*.jpg'))), 2)

    def test_missing_original_is_reported_and_other_files_remain_exportable(self):
        AlbumImage.objects.create(album=self.album, image='client_albums/missing.jpg')
        _, images, summary = self.index()
        self.assertEqual(summary['errors'], 1)
        self.assertEqual(len([image for image in images.values() if not image.get('error')]), 1)

    def test_database_paths_outside_client_albums_are_not_exported(self):
        AlbumImage.objects.create(album=self.album, image='portfolio/private.jpg')
        AlbumImage.objects.create(album=self.album, image='client_albums/../settings.py')
        _, images, summary = self.index()
        self.assertEqual(summary['errors'], 2)
        self.assertEqual(sum('sha256' in image for image in images.values()), 1)

    def test_archive_traversal_and_links_are_never_extracted(self):
        albums, images, _ = self.index()
        for name, kind in [('../escape.jpg', tarfile.REGTYPE), (str(self.image.pk), tarfile.SYMTYPE)]:
            archive = BytesIO()
            with tarfile.open(fileobj=archive, mode='w') as output:
                member = tarfile.TarInfo(name)
                member.type = kind
                output.addfile(member)
            archive.seek(0)
            destination = self.root / 'export'
            destination.mkdir(exist_ok=True)
            with self.assertRaises(ValueError):
                receive_photos(archive, destination, albums, list(images.values()))
        self.assertFalse((self.root / 'escape.jpg').exists())

    def test_corrupt_transfer_is_rejected_and_partial_file_removed(self):
        albums, images, _ = self.index()
        archive = BytesIO()
        with tarfile.open(fileobj=archive, mode='w') as output:
            entry = tarfile.TarInfo(str(self.image.pk))
            content = b'x' * images[self.image.pk]['bytes']
            entry.size = len(content)
            output.addfile(entry, BytesIO(content))
        archive.seek(0)
        destination = self.root / 'export'
        destination.mkdir()
        with self.assertRaises(ValueError):
            receive_photos(archive, destination, albums, list(images.values()))
        self.assertFalse(list(destination.rglob('*.part')))
        self.assertFalse(list(destination.rglob('*.jpg')))

    def test_export_wrapper_generates_valid_python_and_only_read_only_commands(self):
        result = type('Result', (), {'returncode': 0})()
        with patch('socket.gethostname', return_value='avestudio-ro'), \
             patch('sys.stdin', StringIO(json.dumps({'source': 'def write_index(out): pass', 'action': 'index'}))), \
             patch('subprocess.check_output', return_value=b'a' * 64), \
             patch('subprocess.run', return_value=result) as run:
            with self.assertRaises(SystemExit) as stopped:
                exec(compile(REMOTE, '<remote-export>', 'exec'), {})
            self.assertEqual(stopped.exception.code, 0)
            command = run.call_args.args[0]
            self.assertEqual(command[:3], ['docker', 'exec', '-i'])
            compile(command[-1], '<export-in-container>', 'exec')

    def test_long_filenames_keep_their_photo_extension(self):
        filename = safe_filename('p' * 250 + '.jpg')
        self.assertLessEqual(len(filename), 90)
        self.assertTrue(filename.endswith('.jpg'))
