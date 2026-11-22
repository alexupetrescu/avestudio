"""Read-only export of local ClientAlbum originals. Google albums are excluded."""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import tarfile

CHUNK_SIZE = 1024 * 1024


def local_original(image):
    from django.conf import settings
    name = image.image.name
    relative = PurePosixPath(name)
    if (not name.startswith('client_albums/') or relative.is_absolute()
            or '..' in relative.parts or '\\' in name or str(relative) != name):
        raise ValueError('Not a local client album original')
    root = Path(settings.MEDIA_ROOT).resolve()
    path = Path(image.image.storage.path(name))
    if path.is_symlink() or not path.resolve(strict=True).is_relative_to(root / 'client_albums'):
        raise ValueError('Original is outside the client albums directory')
    return path


def open_original(image):
    path = local_original(image)
    descriptor = os.open(path, os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0))
    return os.fdopen(descriptor, 'rb')


def write_index(output):
    from clients.models import AlbumImage, ClientAlbum

    def emit(value):
        output.write(json.dumps(value, ensure_ascii=False) + '\n')
        output.flush()

    # Only these two models are queried; linked Google albums are never fetched.
    album_ids = []
    for album in ClientAlbum.objects.order_by('id').iterator():
        album_ids.append(album.pk)
        emit({'type': 'album', 'id': str(album.pk), 'title': album.title,
              'created_at': album.created_at.isoformat()})
    count = errors = total = 0
    for image in AlbumImage.objects.filter(album_id__in=album_ids).order_by('id').iterator():
        record = {'type': 'image', 'id': image.pk, 'album_id': str(image.album_id),
                  'source_key': image.image.name, 'filename': PurePosixPath(image.image.name).name}
        try:
            digest = hashlib.sha256()
            size = 0
            with open_original(image) as source:
                for chunk in iter(lambda: source.read(CHUNK_SIZE), b''):
                    digest.update(chunk)
                    size += len(chunk)
            record.update(bytes=size, sha256=digest.hexdigest())
            total += size
        except (OSError, ValueError, NotImplementedError):
            record['error'] = 'Missing, unreadable, or unsafe local original'
            errors += 1
        count += 1
        emit(record)
    emit({'type': 'summary', 'images': count, 'bytes': total, 'errors': errors})


def write_photos(output, requested):
    from clients.models import AlbumImage
    wanted = {int(row['id']): row for row in requested}
    if len(wanted) != len(requested) or any(key <= 0 for key in wanted):
        raise ValueError('Invalid export image list')
    found = set()
    with tarfile.open(fileobj=output, mode='w|') as archive:
        for image in AlbumImage.objects.filter(pk__in=wanted).order_by('id').iterator():
            expected = wanted[image.pk]
            if image.image.name != expected['source_key']:
                raise ValueError(f'Image {image.pk} changed after indexing; rerun the export')
            with open_original(image) as source:
                size = os.fstat(source.fileno()).st_size
                if size != expected['bytes']:
                    raise ValueError(f'Image {image.pk} changed after indexing; rerun the export')
                entry = tarfile.TarInfo(str(image.pk))
                entry.size, entry.mode, entry.mtime = size, 0o600, 0
                archive.addfile(entry, source)
            found.add(image.pk)
        if found != set(wanted):
            raise ValueError('Some photos were removed after indexing; rerun the export')
