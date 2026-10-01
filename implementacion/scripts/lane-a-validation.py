#!/usr/bin/env python3
"""Run existing lane A suites with prerequisites and preservable failure evidence."""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from lane_a_evidence import read, write, regular, sha, verify_package, preserve_databases, copy_smoke, hash_export

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = 'https://github.com/tfm-goldenpath/golden-path-lab'
PAIR = ('7243334fe4ee7073801a86b25c90986b7d3c5ece', 'fc58e220e2d3f38d13216b23e61ffc31271f112f')
SUITES = ('demo', 'vulnerabilities')


class StageFailure(Exception):
    def __init__(self, code, stage):
        self.code, self.stage = code, stage
        super().__init__(f'{stage} exited {code}')


def code_of(returncode):
    return returncode if returncode >= 0 else 128 - returncode


def child_environment():
    # Deliberately exclude credentials, GitHub command files and arbitrary GP_*.
    result = {k: os.environ[k] for k in ('PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'LANG', 'LC_ALL', 'TERM', 'TMPDIR') if k in os.environ}
    result.update(KIND_EXPERIMENTAL_PROVIDER='docker', GP_SOURCE_REPOSITORY=REPOSITORY)
    if os.environ.get('GP_VULNERABILITY_DB'):
        result['GP_VULNERABILITY_DB'] = os.environ['GP_VULNERABILITY_DB']
    return result


def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT.parent), *args], text=True).strip()


def prepare(output, suite, refresh_main=False):
    if suite not in SUITES:
        raise ValueError('Unknown suite')
    output.mkdir(parents=True, exist_ok=False)
    write(output / 'result.json', {'suite': suite, 'lane': 'A', 'status': 'NOT_EXECUTED', 'reason': 'Devcontainer/validation not yet started', 'humanAcceptance': 'pending'})
    identity = {'suite': suite, 'sourceCommit': git('rev-parse', 'HEAD'), 'workingTree': git('status', '--porcelain'),
                'runId': os.environ.get('GITHUB_RUN_ID', 'local'), 'runAttempt': os.environ.get('GITHUB_RUN_ATTEMPT', '1'),
                'sourceRepository': REPOSITORY, 'main': None}
    write(output / 'source.json', identity)
    try:
        if refresh_main:
            if os.environ.get('GITHUB_ACTIONS') != 'true' or git('remote', 'get-url', 'origin').removesuffix('.git') != REPOSITORY:
                raise ValueError('Main refresh is only for the disposable repository Actions checkout')
            with (output / 'main-fetch.log').open('w') as log:
                subprocess.run(['git', '-C', str(ROOT.parent), 'fetch', '--no-tags', 'origin', '+refs/heads/main:refs/remotes/origin/main'], stdout=log, stderr=log, check=True)
            trusted = git('rev-parse', 'refs/remotes/origin/main^{commit}')
            current = subprocess.run(['git', '-C', str(ROOT.parent), 'symbolic-ref', '-q', 'HEAD'], capture_output=True, text=True)
            if current.stdout.strip() == 'refs/heads/main' and git('rev-parse', 'HEAD') != trusted:
                raise ValueError('Refusing to move the checked-out source revision')
            subprocess.run(['git', '-C', str(ROOT.parent), 'update-ref', 'refs/heads/main', trusted], check=True)
            identity['mainSource'] = 'explicit fetch of origin refs/heads/main from fixed repository URL'
        else:
            identity['mainSource'] = 'existing local main; caller must establish its trusted origin'
        identity['main'] = git('rev-parse', 'refs/heads/main^{commit}')
        write(output / 'source.json', identity)
        for relative in ('versions.env', 'tools.lock.json', '../.devcontainer/implementacion/devcontainer.json', '../.devcontainer/implementacion/devcontainer-lock.json', 'tooling/package-lock.json'):
            shutil.copyfile(ROOT / relative, output / Path(relative).name)
    except Exception as error:
        code = code_of(error.returncode) if isinstance(error, subprocess.CalledProcessError) else 1
        write(output / 'preparation-error.json', {'status': 'FAIL', 'reason': str(error), 'exitCode': code})
        write(output / 'result.json', {'suite': suite, 'lane': 'A', 'status': 'FAIL', 'stage': 'prepare', 'exitCode': code, 'humanAcceptance': 'pending'})
        try:
            hash_export(output)
        finally:
            raise StageFailure(code, 'prepare') from error


class Validation:
    def __init__(self, output, suite, root=ROOT, execute=subprocess.run):
        self.output, self.suite, self.root, self.execute = Path(output), suite, Path(root), execute
        self.env = child_environment()
        self.stages = read(self.output / 'stages.json') if (self.output / 'stages.json').exists() else []
        self.run = None
        self.capture = None
        self.smoke_before = set((self.root / 'evidence/environment').glob('run-*'))

    def command(self, name, args, *, required=True, env=None):
        log = self.output / (name + '.log')
        print(f'Lane A {self.suite}: {name}', flush=True)
        with log.open('w') as stream:
            try:
                completed = self.execute(args, cwd=self.root, env=env or self.env, stdout=stream, stderr=subprocess.STDOUT)
                code = code_of(completed.returncode)
            except OSError as error:
                stream.write(str(error) + '\n'); code = 127
        self.stages.append({'stage': name, 'command': args, 'exitCode': code, 'status': 'PASS' if code == 0 else 'FAIL', 'log': log.name})
        write(self.output / 'stages.json', self.stages)
        if required and code:
            raise StageFailure(code, name)
        return code

    def versions(self):
        for name, args in [
            ('node', ['node', '--version']), ('npm', ['npm', '--version']), ('docker-client', ['docker', '--version']),
            ('dockerd', ['dockerd', '--version']), ('docker-server', ['docker', 'version']), ('buildx', ['docker', 'buildx', 'version']),
            ('kind', ['kind', 'version']), ('kubectl', ['kubectl', 'version', '--client', '-o', 'json']),
            ('security-tools', ['python3', 'scripts/check-tool-versions.py']), ('packages', ['dpkg-query', '-W']),
            ('disk', ['df', '-h']), ('kernel', ['uname', '-a'])]:
            self.command('versions-' + name, args, required=False)

    def buildkit(self):
        # Same network, driver, BuildKit and service base as delivery.sh. No fixes.
        config = read(self.root / 'tools.lock.json')
        match = re.search(r'^SERVICE_NODE_IMAGE=(.*)$', (self.root / 'versions.env').read_text(), re.M)
        if not match:
            raise ValueError('Missing pinned service base')
        image = match[1].strip('"\'')
        with tempfile.TemporaryDirectory(prefix='gp-connectivity-') as directory:
            path = Path(directory); builder = path.name.lower()
            (path / 'Dockerfile').write_text('FROM ' + image + '\n')
            shutil.copyfile(path / 'Dockerfile', self.output / 'buildkit-Dockerfile.txt')
            created = False
            original = 0
            try:
                self.command('buildkit-network', ['docker', 'network', 'inspect', 'kind'])
                self.command('buildkit-create', ['docker', 'buildx', 'create', '--name', builder, '--driver', 'docker-container', '--driver-opt', 'network=kind', '--driver-opt', 'image=' + config['images']['buildkit']['reference']])
                created = True
                self.command('buildkit-probe', ['timeout', '--signal=TERM', '--kill-after=10s', '60s', 'docker', 'buildx', 'build', '--builder', builder, '--platform', 'linux/amd64', '--pull', '--progress=plain', '--provenance=false', str(path)])
            except StageFailure as error:
                original = error.code
                raise
            finally:
                if created:
                    self.command('buildkit-daemon', ['docker', 'logs', 'buildx_buildkit_' + builder + '0'], required=False)
                    cleanup = self.command('buildkit-cleanup', ['docker', 'buildx', 'rm', builder], required=False)
                    write(self.output / 'buildkit-outcome.json', {'originalExitCode': original, 'cleanupExitCode': cleanup})
                    if cleanup and not original:
                        raise StageFailure(cleanup, 'buildkit-cleanup')

    def find_run(self):
        if self.capture and self.capture.exists():
            paths = [line.split('=', 1)[1] for line in self.capture.read_text().splitlines() if line.startswith('state_dir=')]
            if len(paths) > 1:
                raise ValueError('Ambiguous suite run identity')
            if paths:
                p = Path(paths[0])
                if p.parent != self.root / 'evidence/raw' or not re.fullmatch(r'run-[A-Za-z0-9]+', p.name) or p.is_symlink() or p.resolve() != p:
                    raise ValueError('Run outside owned evidence root')
                self.run = p
                write(self.output / 'run.json', {'run': p.name})
        return self.run

    def collect(self):
        errors = []
        try:
            self.find_run()
            for smoke in set((self.root / 'evidence/environment').glob('run-*')) - self.smoke_before:
                copy_smoke(smoke, self.output / 'smoke' / smoke.name)
        except Exception as error:
            errors.append(str(error))
        if self.run:
            try:
                package = self.root / 'evidence/packages' / (self.run.name + '.tar.gz')
                if not package.exists():
                    self.command('partial-package', ['python3', 'scripts/package-evidence.py', str(self.run), str(self.root / 'evidence/packages'), 'FAIL'])
                verified = verify_package(package)
                dest = self.output / 'packages'; dest.mkdir(exist_ok=True)
                for p in (package, Path(str(package) + '.sha256')):
                    shutil.copyfile(regular(p), dest / p.name)
                write(self.output / 'package-audit.json', verified)
            except Exception as error:
                errors.append(str(error))
            # Independent of package success: a failed package must not lose DBs.
            try:
                snapshots = preserve_databases(self.run, self.output / 'databases', self.root)
                if any(v['status'] != 'PASS' for v in snapshots):
                    raise ValueError('Database drift: preserved observed bytes separately')
                if (self.run / 'database-identity.json').exists() and not snapshots:
                    raise ValueError('Missing frozen database export')
            except Exception as error:
                errors.append(str(error))
        else:
            write(self.output / 'databases/index.json', {'status': 'NOT_CREATED', 'snapshots': []})
        if errors:
            raise ValueError('; '.join(errors))

    def perform(self):
        if self.suite not in SUITES:
            raise ValueError('Unknown suite')
        original = 0; failure = None; retention = 0
        try:
            source = read(self.output / 'source.json')
            if source['suite'] != self.suite or source['sourceCommit'] != git('rev-parse', 'HEAD') or source['main'] != git('rev-parse', 'refs/heads/main^{commit}'):
                raise ValueError('Source or main changed since preparation')
            self.versions()
            self.command('doctor', ['make', 'doctor'])
            self.command('shared-tests', ['make', 'test', 'WORKFLOW_EVIDENCE=' + str(self.output / 'workflows')])
            self.command('smoke', ['make', 'smoke-env'])
            self.buildkit()
            self.root.joinpath('.tmp').mkdir(exist_ok=True)
            with tempfile.TemporaryDirectory(prefix='lane-a-', dir=self.root / '.tmp') as private:
                if self.suite == 'demo':
                    self.command('l05-source', ['node', 'scripts/l05-source.mjs', str(self.root.parent), *PAIR, str(Path(private) / 'sources')])
                self.capture = Path(private) / 'child-output'
                env = dict(self.env, GITHUB_OUTPUT=str(self.capture))
                if self.suite == 'demo':
                    env.update(GP_L05_FROM_COMMIT=PAIR[0], GP_L05_TO_COMMIT=PAIR[1])
                try:
                    self.command('scenarios', ['make', self.suite], env=env)
                except StageFailure:
                    try:
                        self.find_run()
                    except Exception as error:
                        write(self.output / 'capture-error.json', {'status': 'FAIL', 'reason': str(error)})
                    raise
                else:
                    self.find_run()  # before the private capture file is removed
            if not self.run:
                raise ValueError('Successful command did not record a scenario run')
            self.command('required-results', ['node', 'scripts/lane-a-audit.mjs', self.suite, str(self.run), str(self.output / 'workflows'), source['main'], str(self.output / 'coverage.json')])
            coverage = read(self.output / 'coverage.json')
            if coverage.get('status') != 'PASS' or coverage.get('suite') != self.suite or not coverage.get('boundaries') or any(row.get('status') != 'PASS' for row in coverage['boundaries']):
                raise ValueError('Missing or incomplete required coverage')
        except StageFailure as error:
            original, failure = error.code, error.stage
        except Exception as error:
            original, failure = 1, str(error)
        finally:
            try:
                self.collect()
            except Exception as error:
                retention = 1
                write(self.output / 'retention-error.json', {'status': 'FAIL', 'reason': str(error)})
            result = {'suite': self.suite, 'lane': 'A', 'status': 'PASS' if not original and not retention else 'FAIL', 'originalExitCode': original, 'retentionExitCode': retention,
                      'exitCode': original or retention, 'failedStage': failure, 'scenarioRun': self.run.name if self.run else None, 'scenarioExecution': 'STARTED' if self.run else 'NOT_EXECUTED', 'humanAcceptance': 'pending', 'measurement': 'functional integration only'}
            write(self.output / 'result.json', result)
            try:
                hash_export(self.output)
            except Exception as error:
                retention = 1
                result.update(status='FAIL', retentionExitCode=1, exitCode=original or 1)
                write(self.output / 'result.json', result)
                write(self.output / 'checksum-error.json', {'status': 'FAIL', 'reason': str(error)})
        return original or retention


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('prepare', 'launcher', 'run', 'finalize'))
    parser.add_argument('--suite', choices=SUITES, required=True)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--refresh-main', action='store_true', help='Only the disposable Actions checkout; fetch and record main')
    parser.add_argument('--launcher-outcome', default='unknown')
    args = parser.parse_args()
    if args.output:
        output = args.output.absolute()
    else:
        parent = ROOT / 'evidence/lane-a'; parent.mkdir(parents=True, exist_ok=True)
        output = Path(tempfile.mkdtemp(prefix=args.suite + '-', dir=parent)); output.rmdir()
    print('Validation evidence: ' + str(output), flush=True)
    if args.command == 'prepare':
        prepare(output, args.suite, args.refresh_main)
        return 0
    if args.command == 'launcher':
        validation = Validation(output, args.suite)
        validation.command('launcher-node', ['node', '--version'])
        validation.command('launcher-npm', ['npm', '--version'])
        validation.command('launcher-install', ['npm', 'ci', '--prefix', 'tooling', '--ignore-scripts', '--no-audit', '--no-fund'])
        # postCreate runs npm ci in the mounted checkout. Keep the running host
        # CLI outside that tree so lifecycle installation cannot remove its files.
        parent = Path(os.environ['RUNNER_TEMP'])
        launcher = Path(tempfile.mkdtemp(prefix='lane-a-launcher-', dir=parent))
        shutil.copytree(ROOT / 'tooling/node_modules/@devcontainers/cli', launcher / 'cli')
        (launcher / 'devcontainer').symlink_to(launcher / 'cli/devcontainer.js')
        validation.command('launcher-cli', [str(launcher / 'devcontainer'), '--version'])
        with Path(os.environ['GITHUB_PATH']).open('a') as stream:
            stream.write(str(launcher) + '\n')
        return 0
    if args.command == 'finalize':
        # Runs on the host even when the devcontainer never starts.
        output.mkdir(parents=True, exist_ok=True)
        result = read(output / 'result.json') if (output / 'result.json').exists() else {'suite': args.suite, 'status': 'NOT_EXECUTED'}
        result['launcherOutcome'] = args.launcher_outcome
        if args.launcher_outcome != 'success' or result.get('status') != 'PASS':
            result['status'] = 'FAIL'
        write(output / 'result.json', result); hash_export(output)
        return 0 if result['status'] == 'PASS' else 1
    if not output.exists():
        prepare(output, args.suite)
    return Validation(output, args.suite).perform()


if __name__ == '__main__':
    try:
        sys.exit(main())
    except StageFailure as error:
        print(str(error), file=sys.stderr)
        sys.exit(error.code)
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
