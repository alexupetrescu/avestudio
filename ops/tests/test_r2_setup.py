import ast
from contextlib import redirect_stdout
from io import StringIO
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from ops.configure_school_r2 import REMOTE, main
from backend.school_storage import _client


class R2SetupTests(unittest.TestCase):
    def test_check_only_probes_without_contacting_the_vps(self):
        with patch('sys.argv', ['configure_school_r2.py']), \
             patch('builtins.input', return_value='a' * 32), \
             patch('getpass.getpass', side_effect=['', 'access', '', 'secret']), \
             patch('ops.configure_school_r2.probe', return_value=(0, 0)) as probe, \
             patch('subprocess.run') as run, patch('builtins.print'):
            self.assertEqual(main(), 0)
            run.assert_not_called()
            self.assertEqual(probe.call_args.args[0], 'https://' + 'a' * 32 + '.r2.cloudflarestorage.com')
            self.assertEqual(probe.call_args.args[2:], ('access', 'secret'))

    def test_remote_setup_checks_deployment_lock_and_does_not_restart_services(self):
        ast.parse(REMOTE)
        self.assertIn('LOCK_EX | fcntl.LOCK_NB', REMOTE)
        self.assertIn('backend.env', REMOTE)
        self.assertIn('O_NOFOLLOW', REMOTE)
        self.assertNotIn("'restart'", REMOTE)
        self.assertNotIn("'up'", REMOTE)

    def test_sdk_can_generate_a_private_eu_r2_url_without_network_or_real_credentials(self):
        from urllib.parse import parse_qs, urlsplit
        client = _client('https://' + 'b' * 32 + '.eu.r2.cloudflarestorage.com', 'synthetic-access', 'synthetic-secret')
        url = client.generate_presigned_url(
            'get_object', Params={'Bucket': 'avestudio-schools', 'Key': 'synthetic.jpg'}, ExpiresIn=60,
        )
        parsed = urlsplit(url)
        self.assertEqual(parsed.scheme, 'https')
        self.assertEqual(parse_qs(parsed.query)['X-Amz-Expires'], ['60'])
        self.assertIn('/auto/s3/aws4_request', parse_qs(parsed.query)['X-Amz-Credential'][0])

    @unittest.skipIf(os.name == 'nt', 'Linux configuration lock and file modes')
    def test_apply_preserves_other_settings_and_makes_a_private_backup(self):
        self.check_environment_layout('avestudio-staging')

    @unittest.skipIf(os.name == 'nt', 'Linux configuration lock and file modes')
    def test_apply_uses_production_credentials_after_cutover(self):
        self.check_environment_layout('avestudio-production')

    def check_environment_layout(self, layout):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'backend.env'
            original = 'DATABASE_PASSWORD=keep-this\nSCHOOLS_R2_BUCKET=old-bucket\n'
            path.write_text(original)
            unused = Path(directory) / 'unused.env'
            unused.write_text('UNUSED=keep\n')
            source = REMOTE.replace('/var/lib/avestudio-deploy/lock', str(Path(directory) / 'lock'))
            source = source.replace('/etc/avestudio-infra/' + layout + '/backend.env', str(path))
            other = 'avestudio-production' if layout == 'avestudio-staging' else 'avestudio-staging'
            source = source.replace('/etc/avestudio-infra/' + other + '/backend.env', str(unused))
            data = {
                'SCHOOLS_R2_ENABLED': 'true', 'SCHOOLS_R2_ENDPOINT': 'https://' + 'a' * 32 + '.eu.r2.cloudflarestorage.com',
                'SCHOOLS_R2_BUCKET': 'avestudio-schools', 'SCHOOLS_R2_ACCESS_KEY_ID': 'access',
                'SCHOOLS_R2_SECRET_ACCESS_KEY': 'secret',
            }
            actual_stat = Path.stat
            def owned_by_root(target, *args, **kwargs):
                row = actual_stat(target, *args, **kwargs)
                return SimpleNamespace(st_uid=0, st_mode=row.st_mode)
            output = StringIO()
            with patch('os.geteuid', return_value=0), patch('socket.gethostname', return_value='avestudio-ro'), \
                 patch('sys.stdin', StringIO(json.dumps(data))), patch.object(Path, 'stat', owned_by_root), \
                 patch('subprocess.check_output', return_value=json.dumps({'services': {'backend': {'env_file': [{'path': str(path)}]}}}).encode()), \
                 redirect_stdout(output):
                exec(compile(source, '<r2-config-test>', 'exec'), {})
            self.assertIn('DATABASE_PASSWORD=keep-this', path.read_text())
            self.assertIn('SCHOOLS_R2_BUCKET=avestudio-schools', path.read_text())
            self.assertNotIn('old-bucket', path.read_text())
            backup = list(Path(directory).glob('backend.env.before-r2-*'))
            self.assertEqual(len(backup), 1)
            self.assertEqual(backup[0].read_text(), original)
            self.assertEqual(backup[0].stat().st_mode & 0o777, 0o600)
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            self.assertEqual(unused.read_text(), 'UNUSED=keep\n')
            self.assertIn(str(path), output.getvalue())
            self.assertNotIn('secret', output.getvalue())

    @unittest.skipIf(os.name == 'nt', 'Linux environment-file guard')
    def test_unknown_or_ambiguous_env_file_does_not_write_credentials(self):
        configurations = [
            ['/tmp/unexpected.env'],
            ['/etc/avestudio-infra/avestudio-production/backend.env',
             '/etc/avestudio-infra/avestudio-staging/backend.env'],
        ]
        for files in configurations:
            with self.subTest(files=files), tempfile.TemporaryDirectory() as directory:
                source = REMOTE.replace('/var/lib/avestudio-deploy/lock', str(Path(directory) / 'lock'))
                data = {
                    'SCHOOLS_R2_ENABLED': 'true', 'SCHOOLS_R2_ENDPOINT': 'https://' + 'a' * 32 + '.r2.cloudflarestorage.com',
                    'SCHOOLS_R2_BUCKET': 'avestudio-schools', 'SCHOOLS_R2_ACCESS_KEY_ID': 'access',
                    'SCHOOLS_R2_SECRET_ACCESS_KEY': 'secret',
                }
                with patch('os.geteuid', return_value=0), patch('socket.gethostname', return_value='avestudio-ro'), \
                     patch('sys.stdin', StringIO(json.dumps(data))), \
                     patch('subprocess.check_output', return_value=json.dumps({'services': {'backend': {'env_file': files}}}).encode()):
                    with self.assertRaisesRegex(RuntimeError, 'exactly one known'):
                        exec(compile(source, '<r2-config-test>', 'exec'), {})
                self.assertEqual([path.name for path in Path(directory).iterdir()], ['lock'])

    @unittest.skipIf(os.name == 'nt', 'Linux deployment lock')
    def test_active_deployment_blocks_configuration_without_writing_files(self):
        with tempfile.TemporaryDirectory() as directory:
            source = REMOTE.replace('/var/lib/avestudio-deploy/lock', str(Path(directory) / 'lock'))
            data = {
                'SCHOOLS_R2_ENABLED': 'true', 'SCHOOLS_R2_ENDPOINT': 'https://' + 'a' * 32 + '.eu.r2.cloudflarestorage.com',
                'SCHOOLS_R2_BUCKET': 'avestudio-schools', 'SCHOOLS_R2_ACCESS_KEY_ID': 'access',
                'SCHOOLS_R2_SECRET_ACCESS_KEY': 'secret',
            }
            with patch('os.geteuid', return_value=0), patch('socket.gethostname', return_value='avestudio-ro'), \
                 patch('sys.stdin', StringIO(json.dumps(data))), patch('fcntl.flock', side_effect=BlockingIOError):
                with self.assertRaisesRegex(RuntimeError, 'deployment is running'):
                    exec(compile(source, '<r2-config-test>', 'exec'), {})
            self.assertEqual([path.name for path in Path(directory).iterdir()], ['lock'])
