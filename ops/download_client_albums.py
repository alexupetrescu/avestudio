"""Download and verify every local Client album original; never modifies the VPS.

Run from the PC: python ops/download_client_albums.py --destination PATH
The remote read-only exporter is sent in memory and needs no server installation.
"""
import argparse
from datetime import datetime, timezone
import getpass
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = 'client-albums-export.json'
REMOTE = r'''
import json, re, socket, subprocess, sys
if socket.gethostname() != 'avestudio-ro':
    raise RuntimeError('Wrong VPS; expected avestudio-ro')
payload = json.load(sys.stdin)
compose = ['docker', 'compose', '--project-name', 'avestudio-staging',
           '--project-directory', '/srv/avestudio', '--env-file',
           '/etc/avestudio-infra/avestudio-staging/release.env',
           '--file', '/srv/avestudio/staging.compose.yml', 'ps', '-q', 'backend']
container = subprocess.check_output(compose).decode().strip()
if not re.fullmatch(r'[0-9a-f]{12,64}', container):
    raise RuntimeError('Expected exactly one running backend; finish deployment first')
code = 'import django; django.setup()\n' + payload['source']
if payload['action'] == 'index':
    code += '\nimport sys; write_index(sys.stdout)\n'
elif payload['action'] == 'photos':
    code += '\nimport sys; write_photos(sys.stdout.buffer, json.load(sys.stdin))\n'
else:
    raise ValueError('Unknown read-only export action')
result = subprocess.run(['docker', 'exec', '-i', container, 'python', '-B', '-c', code],
                        input=json.dumps(payload.get('images', [])).encode())
sys.exit(result.returncode)
'''


def start_remote(action, images, password, config, host):
    if '\n' in password or '\r' in password:
        raise ValueError('A sudo password cannot contain a newline')
    payload = {
        'action': action, 'images': images,
        'source': (ROOT / 'clients/exporting.py').read_text(encoding='utf-8'),
    }
    # -T keeps binary data intact. Password travels through stdin, never arguments.
    command = 'sudo -k -S -p ' + shlex.quote('') + ' python3 -c ' + shlex.quote(REMOTE)
    process = subprocess.Popen(
        ['ssh', '-T', '-F', str(config), host, command],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    try:
        process.stdin.write(password.encode() + b'\n' + json.dumps(payload).encode())
        process.stdin.close()
    except Exception:
        process.kill()
        process.wait()
        raise
    return process


def finish_remote(process):
    error = process.stderr.read().decode('utf-8', 'replace')
    status = process.wait()
    if status:
        raise RuntimeError(f'Read-only export command failed ({status}): ' + error[-2500:])


def read_index(process):
    albums, images, summary = {}, {}, None
    try:
        for line in process.stdout:
            if len(line) > 65536:
                raise ValueError('Unexpectedly large export metadata record')
            record = json.loads(line)
            if record['type'] == 'album':
                albums[record['id']] = record
            elif record['type'] == 'image':
                images[int(record['id'])] = record
                if len(images) % 100 == 0:
                    print(f'Indexed and hashed {len(images)} originals…', flush=True)
            elif record['type'] == 'summary':
                summary = record
        finish_remote(process)
    except Exception:
        if process.poll() is None:
            process.kill()
            process.wait()
        raise
    if summary is None or summary['images'] != len(images):
        raise ValueError('Incomplete export index; no photos will be downloaded')
    return albums, images, summary


def safe_name(value, limit):
    value = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', value).strip(' .')
    return value[:limit].rstrip(' .') or 'album'


def safe_filename(value):
    value = safe_name(value, 255)
    suffix = Path(value).suffix
    if len(suffix) <= 12:
        return safe_name(value[:-len(suffix)] if suffix else value, 90 - len(suffix)) + suffix
    return safe_name(value, 90)


def output_path(destination, album, image):
    album_id = album['id']
    if not re.fullmatch(r'[0-9a-f-]{36}', album_id):
        raise ValueError('Invalid album identity in export index')
    folder = destination / (safe_name(album['title'], 45) + '__' + album_id)
    name = f"{int(image['id'])}_{image['sha256'][:12]}_{safe_filename(image['filename'])}"
    target = folder / name
    if folder.is_symlink() or target.is_symlink() or not target.resolve().is_relative_to(destination):
        raise ValueError('Unsafe output path')
    return target


def checksum(path):
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def needed_images(destination, albums, images):
    needed, skipped = [], 0
    for image in images.values():
        if image.get('error'):
            continue
        target = output_path(destination, albums[image['album_id']], image)
        if target.exists():
            if not target.is_file() or target.stat().st_size != image['bytes'] or checksum(target) != image['sha256']:
                raise ValueError(f'Existing file differs; it will not be overwritten: {target}')
            image['local_path'] = target.relative_to(destination).as_posix()
            skipped += 1
        else:
            needed.append(image)
    return needed, skipped


def receive_photos(stream, destination, albums, images):
    expected = {int(image['id']): image for image in images}
    received = set()
    with tarfile.open(fileobj=stream, mode='r|') as archive:
        for entry in archive:
            if not entry.isreg() or not re.fullmatch(r'[1-9][0-9]*', entry.name):
                raise ValueError('Unexpected archive member; stopped without extracting it')
            image_id = int(entry.name)
            if image_id not in expected or image_id in received:
                raise ValueError('Unexpected or repeated photo in export stream')
            image = expected[image_id]
            if entry.size != image['bytes']:
                raise ValueError(f'Image {image_id} changed size; rerun the export')
            target = output_path(destination, albums[image['album_id']], image)
            target.parent.mkdir(parents=True, exist_ok=True)
            digest = hashlib.sha256()
            temporary = None
            try:
                with tempfile.NamedTemporaryFile(dir=target.parent, prefix='.download-', suffix='.part', delete=False) as out:
                    temporary = Path(out.name)
                    with archive.extractfile(entry) as source:
                        for chunk in iter(lambda: source.read(1024 * 1024), b''):
                            digest.update(chunk)
                            out.write(chunk)
                if digest.hexdigest() != image['sha256']:
                    raise ValueError(f'Checksum failed for image {image_id}; original may have changed. Rerun the export.')
                if target.exists():
                    raise ValueError(f'Output appeared during transfer and will not be overwritten: {target}')
                os.rename(temporary, target)
                image['local_path'] = target.relative_to(destination).as_posix()
                received.add(image_id)
                print(f'Downloaded and verified {len(received)} / {len(expected)} originals', flush=True)
            finally:
                if temporary and temporary.exists():
                    temporary.unlink()
    if received != set(expected):
        raise ValueError('Download was interrupted; rerun to continue from verified files')


def write_manifest(destination, albums, images, complete):
    path = destination / MANIFEST
    if path.is_symlink():
        raise ValueError('Export manifest cannot be a symlink')
    if path.exists():
        previous = json.loads(path.read_text(encoding='utf-8'))
        if previous.get('format') != 'avestudio-client-albums-export-v1':
            raise ValueError('An unrelated manifest exists and will not be replaced')
    document = {
        'format': 'avestudio-client-albums-export-v1', 'completed': complete,
        'indexed_at_utc': datetime.now(timezone.utc).isoformat(),
        'scope': 'ClientAlbum/AlbumImage originals only; linked Google albums excluded',
        'albums': list(albums.values()), 'images': list(images.values()),
    }
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=destination, prefix='.manifest-', delete=False) as out:
        json.dump(document, out, ensure_ascii=False, indent=2)
        temporary = Path(out.name)
    os.replace(temporary, path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination', required=True, type=Path)
    parser.add_argument('--plan', action='store_true', help='Index and show size without downloading images')
    parser.add_argument('--ssh-config', type=Path, default=ROOT / 'ops/ssh.conf')
    parser.add_argument('--ssh-host', default='avestudio-production')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-zA-Z0-9_.-]+', args.ssh_host) or args.ssh_host.startswith('-'):
        raise ValueError('Invalid SSH host alias')
    destination = args.destination.expanduser().resolve()
    password = getpass.getpass('VPS sudo password (not saved): ')
    print('Indexing and hashing local Client album originals on the VPS. Google albums are excluded.', flush=True)
    albums, images, summary = read_index(start_remote('index', [], password, args.ssh_config, args.ssh_host))
    needed, skipped = needed_images(destination, albums, images)
    print(f"{len(albums)} albums · {summary['images']} originals · {summary['bytes'] / 1_000_000_000:.2f} GB · {skipped} already verified · {summary['errors']} missing/unreadable")
    if args.plan:
        return 1 if summary['errors'] else 0
    destination.mkdir(parents=True, exist_ok=True)
    write_manifest(destination, albums, images, False)
    try:
        if needed:
            process = start_remote('photos', needed, password, args.ssh_config, args.ssh_host)
            try:
                receive_photos(process.stdout, destination, albums, needed)
                finish_remote(process)
            finally:
                if process.poll() is None:
                    process.kill()
                    process.wait()
    except Exception:
        write_manifest(destination, albums, images, False)
        raise
    complete = not summary['errors']
    write_manifest(destination, albums, images, complete)
    print('Export complete and verified.' if complete else 'Export incomplete: see missing originals in the manifest.')
    return 0 if complete else 1


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, ValueError, RuntimeError, tarfile.TarError) as error:
        print('EXPORT STOPPED: ' + str(error), file=sys.stderr)
        sys.exit(1)
