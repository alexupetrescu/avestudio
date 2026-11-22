"""Probe a private R2 bucket, then optionally save credentials for the next release.

No containers are restarted. A running deployment prevents --apply.
Run using the project virtual environment after installing ops/r2-requirements.lock.
"""
import argparse
import getpass
import json
from pathlib import Path
import re
import shlex
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
REMOTE = r'''
import fcntl, json, os, pathlib, re, secrets, socket, stat, subprocess, sys, time
if os.geteuid() != 0 or socket.gethostname() != 'avestudio-ro':
    raise RuntimeError('Run on the expected production VPS with sudo')
data = json.load(sys.stdin)
names = {'SCHOOLS_R2_ENABLED', 'SCHOOLS_R2_ENDPOINT', 'SCHOOLS_R2_BUCKET',
         'SCHOOLS_R2_ACCESS_KEY_ID', 'SCHOOLS_R2_SECRET_ACCESS_KEY'}
if set(data) != names or any(not isinstance(value, str) or '\n' in value or '\r' in value for value in data.values()):
    raise ValueError('Unexpected configuration payload')
if not re.fullmatch(r'https://[0-9a-f]{32}(?:\.eu|\.us|\.fedramp)?\.r2\.cloudflarestorage\.com', data['SCHOOLS_R2_ENDPOINT']):
    raise ValueError('Invalid R2 endpoint')
if not re.fullmatch(r'[a-z0-9][a-z0-9-]{1,61}[a-z0-9]', data['SCHOOLS_R2_BUCKET']):
    raise ValueError('Invalid bucket name')
if data['SCHOOLS_R2_ENABLED'] != 'true':
    raise ValueError('Expected explicit R2 opt-in')
with open('/var/lib/avestudio-deploy/lock', 'a') as lock:
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        raise RuntimeError('A deployment is running. Finish it before saving R2 configuration.')
    path = pathlib.Path('/etc/avestudio-infra/avestudio-staging/backend.env')
    if path.is_symlink() or not path.is_file() or path.stat().st_uid != 0:
        raise RuntimeError('Unexpected backend environment file; nothing changed')
    compose = ['docker', 'compose', '--project-name', 'avestudio-staging',
               '--project-directory', '/srv/avestudio', '--env-file',
               '/etc/avestudio-infra/avestudio-staging/release.env',
               '--file', '/srv/avestudio/staging.compose.yml', 'config',
               '--no-env-resolution', '--format', 'json']
    config = json.loads(subprocess.check_output(compose))
    files = config['services']['backend'].get('env_file', [])
    if str(path) not in [row.get('path') if isinstance(row, dict) else row for row in files]:
        raise RuntimeError('Active backend env_file differs; nothing changed')
    original = path.read_bytes()
    backup = path.with_name(path.name + '.before-r2-' + time.strftime('%Y%m%dT%H%M%SZ', time.gmtime()) + '-' + secrets.token_hex(4))
    def create_private(target, body):
        descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        with os.fdopen(descriptor, 'wb') as output:
            output.write(body)
            output.flush()
            os.fsync(output.fileno())
    create_private(backup, original)
    rows = [row for row in original.decode().splitlines() if row.split('=', 1)[0] not in names]
    rows += [''] + [name + '=' + data[name] for name in sorted(names)]
    temporary = path.with_name(path.name + '.r2-' + secrets.token_hex(8))
    create_private(temporary, ('\n'.join(rows) + '\n').encode())
    os.replace(temporary, path)
    print('R2 configuration saved privately for the next backend deployment. No containers restarted.')
'''


def probe(endpoint, bucket, key, secret):
    from backend.r2_probe import bucket_usage, verify_object_access
    from backend.school_storage import _client, validate_configuration
    validate_configuration(endpoint, bucket, key, secret)
    client = _client(endpoint, key, secret)
    verify_object_access(client, bucket)
    return bucket_usage(client, bucket)


def read_required_secret(label):
    while True:
        value = getpass.getpass(label + ' (hidden; paste then press Enter): ').strip()
        if not value:
            print(label + ' was empty. Paste the value even though no characters appear, then press Enter.')
            continue
        if '\n' in value or '\r' in value:
            raise ValueError('Paste only the single credential value, without extra lines.')
        return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Save the verified credentials on the VPS; no restart')
    parser.add_argument('--jurisdiction', choices=['eu', 'default', 'us'], default='default')
    parser.add_argument('--bucket', default='avestudio-schools')
    args = parser.parse_args()
    account = input('Cloudflare account ID: ').strip().lower()
    if not re.fullmatch(r'[0-9a-f]{32}', account):
        raise ValueError('Use the 32-character Cloudflare account ID.')
    suffix = '' if args.jurisdiction == 'default' else '.' + args.jurisdiction
    endpoint = 'https://' + account + suffix + '.r2.cloudflarestorage.com'
    print('Credential input is hidden: pasted text and stars will not appear. Values are not saved locally.')
    key = read_required_secret('R2 Access Key ID')
    secret = read_required_secret('R2 Secret Access Key')
    print(f'Both credential values received. Checking bucket {args.bucket} using {endpoint}')
    objects, size = probe(endpoint, args.bucket, key, secret)
    print(f'R2 write/read/delete check passed. Bucket contains {objects} objects ({size / 1_000_000_000:.3f} GB).')
    print('Keep bucket public access disabled. The free allowance is account-wide, not a hard storage cap.')
    if not args.apply:
        print(f'Check only. Use --apply --jurisdiction {args.jurisdiction} after the current deployment finishes to save configuration for the next backend release.')
        return 0
    password = getpass.getpass('VPS sudo password (not saved): ')
    if '\n' in password or '\r' in password:
        raise ValueError('Sudo password cannot contain a newline.')
    data = {
        'SCHOOLS_R2_ENABLED': 'true', 'SCHOOLS_R2_ENDPOINT': endpoint,
        'SCHOOLS_R2_BUCKET': args.bucket, 'SCHOOLS_R2_ACCESS_KEY_ID': key,
        'SCHOOLS_R2_SECRET_ACCESS_KEY': secret,
    }
    command = 'sudo -k -S -p ' + shlex.quote('') + ' python3 -c ' + shlex.quote(REMOTE)
    result = subprocess.run(
        ['ssh', '-T', '-F', str(ROOT / 'ops/ssh.conf'), 'avestudio-production', command],
        input=password.encode() + b'\n' + json.dumps(data).encode(),
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    if result.returncode:
        raise RuntimeError('Configuration was not activated: ' + result.stderr.decode('utf-8', 'replace')[-2000:])
    print(result.stdout.decode('utf-8', 'replace').strip())
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except ImportError:
        print('Install the R2 setup dependencies in the project venv: python -m pip install --require-hashes -r ops/r2-requirements.lock', file=sys.stderr)
        sys.exit(1)
    except Exception as error:
        print('R2 SETUP STOPPED: ' + str(error), file=sys.stderr)
        if getattr(error, 'response', {}).get('Error', {}).get('Code') == 'AccessDenied':
            print(
                'Check that the R2 token has Object Read & Write permission for this bucket, '
                'and that the endpoint matches the bucket S3 API endpoint. '
                'Use --jurisdiction default when that endpoint has no .eu. or .us. segment.',
                file=sys.stderr,
            )
        sys.exit(1)
