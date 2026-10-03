#!/usr/bin/env python3
"""Diagnose and conditionally restore temporary kind forwarding in Codespaces."""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import ipaddress
import json
import os
from pathlib import Path
import re
import shlex
import signal
import subprocess
import uuid

ROOT = Path(__file__).resolve().parents[1]
LEGACY_BASE = '''-P FORWARD DROP
-A FORWARD -j DOCKER-USER
-A FORWARD -j DOCKER-ISOLATION-STAGE-1
-A FORWARD -o docker0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A FORWARD -o docker0 -j DOCKER
-A FORWARD -i docker0 ! -o docker0 -j ACCEPT
-A FORWARD -i docker0 -o docker0 -j ACCEPT'''
NFT_BASE = '''-P FORWARD ACCEPT
-A FORWARD -j DOCKER-USER
-A FORWARD -j DOCKER-FORWARD'''
LEGACY_USER = '-N DOCKER-USER\n-A DOCKER-USER -j RETURN'
LEGACY_ISOLATION1 = '''-N DOCKER-ISOLATION-STAGE-1
-A DOCKER-ISOLATION-STAGE-1 -i docker0 ! -o docker0 -j DOCKER-ISOLATION-STAGE-2
-A DOCKER-ISOLATION-STAGE-1 -j RETURN'''
LEGACY_ISOLATION2 = '''-N DOCKER-ISOLATION-STAGE-2
-A DOCKER-ISOLATION-STAGE-2 -o docker0 -j DROP
-A DOCKER-ISOLATION-STAGE-2 -j RETURN'''


def scoped_rules(identity):
    network, bridge = identity['networkId'], identity['bridge']
    subnet = ipaddress.ip_network(identity['subnet'], strict=True)
    if (not re.fullmatch(r'[a-f0-9]{64}', network) or not re.fullmatch(r'[A-Za-z0-9_.-]{1,15}', bridge)
            or subnet.version != 4 or not subnet.is_private or subnet.prefixlen < 16):
        raise ValueError('Unsafe kind bridge identity or IPv4 subnet')
    comment = ['-m', 'comment', '--comment', 'tfm-codespaces-kind-' + network, '-j', 'ACCEPT']
    return [
        ['-d', str(subnet), '-o', bridge, '-m', 'conntrack', '--ctstate', 'RELATED,ESTABLISHED', *comment],
        ['-s', str(subnet), '-i', bridge, *comment],
    ]


def tokens(text):
    return [shlex.split(line) for line in text.strip().splitlines() if line.strip()]


def known_conflict(snapshot, identity):
    owned = [['-A', 'FORWARD', *r] for r in scoped_rules(identity)]
    legacy = [line for line in tokens(snapshot['legacy']) if line not in owned]
    return (not any(snapshot.get('exitCodes', {}).values())
            and legacy == tokens(LEGACY_BASE) and tokens(snapshot['nft']) == tokens(NFT_BASE)
            and tokens(snapshot['user']) == tokens(LEGACY_USER)
            and tokens(snapshot['isolation1']) == tokens(LEGACY_ISOLATION1)
            and tokens(snapshot['isolation2']) == tokens(LEGACY_ISOLATION2))


class Recovery:
    def __init__(self, output, cluster=None):
        self.output, self.cluster = Path(output), cluster
        self.identity, self.added = None, []
        self.data = {'schema': 'codespaces-kind-network/v1', 'status': 'INSPECTING', 'commands': [],
                     'startedUtc': datetime.now(timezone.utc).isoformat(),
                     'scope': 'Environment connectivity only; no scenario or human task execution',
                     'temporaryRules': 'Retained until explicit removal or environment restart'}

    def save(self):
        if self.output.is_symlink(): raise ValueError('Unsafe network evidence path')
        self.output.parent.mkdir(parents=True, exist_ok=True)
        self.output.write_text(json.dumps(self.data, indent=2) + '\n')

    def command(self, args, required=True, timeout=20):
        try:
            result = subprocess.run(args, text=True, capture_output=True, timeout=timeout)
            code, out, err = result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired as error:
            code, out, err = 124, error.stdout or '', error.stderr or ''
        except OSError as error:
            code, out, err = 127, '', str(error)
        def text(value): return value.decode(errors='replace') if isinstance(value, bytes) else value
        self.data['commands'].append({'args': args, 'exitCode': code, 'stdout': text(out), 'stderr': text(err)})
        self.save()
        if required and code: raise ValueError('Network prerequisite failed: ' + shlex.join(args))
        return code, text(out)

    def inspect(self):
        _, endpoint = self.command(['docker', 'context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'])
        endpoint = endpoint.strip()
        if endpoint != 'unix:///var/run/docker.sock' or os.environ.get('DOCKER_HOST', endpoint) != endpoint:
            raise ValueError('Recovery requires the verified local Docker socket')
        _, pids = self.command(['pgrep', '-x', 'dockerd'])
        if len(pids.split()) != 1: raise ValueError('Cannot identify one local Docker daemon')
        namespace = os.readlink('/proc/self/ns/net')
        _, daemon_namespace = self.command(['sudo', '-n', 'readlink', '/proc/' + pids.strip() + '/ns/net'])
        if daemon_namespace.strip() != namespace: raise ValueError('Docker daemon is in another network namespace')
        _, raw = self.command(['docker', 'network', 'inspect', 'kind'])
        network = json.loads(raw)[0]
        if network['Name'] != 'kind' or network['Driver'] != 'bridge': raise ValueError('Expected the kind bridge network')
        bridge = network.get('Options', {}).get('com.docker.network.bridge.name') or 'br-' + network['Id'][:12]
        subnets = [x['Subnet'] for x in network['IPAM']['Config'] if ipaddress.ip_network(x['Subnet']).version == 4]
        if len(subnets) != 1: raise ValueError('Expected one kind IPv4 subnet')
        identity = {'networkId': network['Id'], 'bridge': bridge, 'subnet': subnets[0], 'namespace': namespace,
                    'bootId': Path('/proc/sys/kernel/random/boot_id').read_text().strip(),
                    'containers': network.get('Containers', {}), 'endpoint': endpoint}
        scoped_rules(identity)
        _, links = self.command(['ip', '-d', '-j', 'link', 'show', 'dev', bridge])
        if json.loads(links)[0].get('linkinfo', {}).get('info_kind') != 'bridge': raise ValueError('Interface is not a Linux bridge')
        match = re.search(r'^KIND_NODE_IMAGE=(.+)$', (ROOT / 'versions.env').read_text(), re.M)
        if not match: raise ValueError('Missing pinned kind image')
        self.image = match[1].strip('"\'')
        self.command(['docker', 'image', 'inspect', self.image, '--format', '{{.Id}}'])
        return identity

    def snapshot(self):
        result = {'exitCodes': {}}
        for key, frontend, chain in [('legacy','legacy','FORWARD'),('nft','nft','FORWARD'),
                                     ('user','legacy','DOCKER-USER'),('isolation1','legacy','DOCKER-ISOLATION-STAGE-1'),
                                     ('isolation2','legacy','DOCKER-ISOLATION-STAGE-2')]:
            result['exitCodes'][key], result[key] = self.command(
                ['sudo','-n','iptables-' + frontend,'-w','5','-S',chain], required=False)
        result['exitCodes']['counters'], counters = self.command(
            ['sudo','-n','iptables-legacy','-w','5','-L','FORWARD','-nvx'], required=False)
        match = re.search(r'policy DROP (\d+) packets', counters)
        result['dropped'] = int(match[1]) if match else None
        return result

    def probe(self, mode, bridge='kind'):
        name = 'tfm-network-probe-' + uuid.uuid4().hex[:12]
        command = ('timeout 12s getent ahostsv4 registry-1.docker.io' if mode == 'dns' else
                   'status=$(curl -4 --max-time 12 -sS -o /dev/null -w "%{http_code}" https://registry-1.docker.io/v2/) && '
                   'printf "HTTP:%s\\n" "$status" && { [ "$status" = 401 ] || [ "$status" = 200 ]; }')
        try:
            code, _ = self.command(['docker','run','--rm','--pull=never','--name',name,'--network',bridge,
                                   '--entrypoint','/bin/sh',self.image,'-c',command], required=False, timeout=18)
            return code
        finally:
            # Only this diagnostic container, never a scenario or user's workload.
            self.command(['docker','rm','-f',name], required=False)
            code, output = self.command(['docker','ps','-a','--filter','name=^' + name + '$','--format','{{.Names}}'], required=False)
            if code or output.strip(): raise ValueError('Diagnostic container cleanup not established')

    def check_workloads(self):
        for container in self.identity['containers']:
            _, labels = self.command(['docker','inspect','--format','{{json .Config.Labels}}',container])
            if not self.cluster or (json.loads(labels) or {}).get('io.x-k8s.kind.cluster') != self.cluster:
                raise ValueError('Other workloads on kind; refusing shared firewall mutation')

    def rule(self, action, args):
        position = ['1'] if action == '-I' else []
        return self.command(['sudo','-n','iptables-legacy','-w','5',action,'FORWARD',*position,*args], required=False)[0]

    def execute(self, action):
        self.added = []
        try:
            if os.environ.get('CODESPACES') != 'true':
                self.data['status'] = 'SKIPPED_NOT_CODESPACES'
                return 0
            self.identity = self.inspect()
            self.data.update(identity=self.identity, before=self.snapshot())
            rules = scoped_rules(self.identity)
            self.data['removeCommands'] = [['sudo','-n','iptables-legacy','-w','5','-D','FORWARD',*r] for r in reversed(rules)]
            self.save()  # Recovery commands exist before any insertion.
            if action == 'remove':
                self.cluster = None
                self.check_workloads()
                for rule in reversed(rules):
                    present = self.rule('-C', rule)
                    if present not in (0,1): raise ValueError('Could not inspect owned forwarding rule')
                    if present == 0 and self.rule('-D', rule): raise ValueError('Could not remove owned forwarding rule')
                self.data.update(status='REMOVED_OR_ABSENT', after=self.snapshot())
                return 0
            dns = self.probe('dns')
            if dns == 0:
                if self.probe('https'): raise ValueError('DNS works but registry HTTPS failed; no rules changed')
                self.data['status'] = 'HEALTHY'
                return 0
            if action != 'ensure': raise ValueError('Kind DNS failed; use ensure to diagnose conditional recovery')
            if dns not in (2,124): raise ValueError('Unexpected DNS probe error; no firewall mutation')
            after_probe = self.snapshot()
            if (not known_conflict(after_probe, self.identity) or self.data['before']['dropped'] is None
                    or after_probe['dropped'] <= self.data['before']['dropped']):
                raise ValueError('The known legacy/nft forwarding conflict is not established')
            if self.probe('dns', 'bridge'): raise ValueError('Default bridge DNS also fails; no firewall mutation')
            confirmed = self.inspect()
            for key in ['networkId','bridge','subnet','namespace','bootId']:
                if confirmed[key] != self.identity[key]: raise ValueError('Network identity changed during diagnosis')
            self.identity = confirmed
            if not known_conflict(self.snapshot(), self.identity):
                raise ValueError('Firewall changed during diagnosis; no rules inserted')
            self.check_workloads()
            for rule in rules:
                present = self.rule('-C', rule)
                if present not in (0,1): raise ValueError('Could not inspect owned forwarding rule')
                if present == 1:
                    self.added.append(rule)
                    self.data['pendingInsertions'] = self.added
                    self.save()
                    if self.rule('-I', rule): raise ValueError('Could not insert scoped forwarding rule')
            if self.probe('dns') or self.probe('https'): raise ValueError('Connectivity still fails after scoped recovery')
            self.data.update(status='RESTORED', after=self.snapshot())
            return 0
        except (Exception, KeyboardInterrupt) as error:
            recovery = []
            for rule in reversed(self.added):
                check = self.rule('-C', rule)
                code = self.rule('-D', rule) if check == 0 else 0 if check == 1 else check
                recovery.append(code)
            code = 130 if isinstance(error, KeyboardInterrupt) else 1
            self.data.update(status='FAILED', error=str(error) or 'Interrupted', primaryExitCode=code,
                             rollbackExitCodes=recovery)
            return code
        finally:
            self.data['finishedUtc'] = datetime.now(timezone.utc).isoformat()
            self.save()


@contextmanager
def mutation_lock():
    path = '/tmp/golden-path-codespaces-network.lock'
    descriptor = os.open(path, os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, 'w') as stream:
        if os.fstat(stream.fileno()).st_uid != os.getuid(): raise ValueError('Network lock has another owner')
        fcntl.flock(stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['check','ensure','remove'], nargs='?', default='check')
    parser.add_argument('--cluster', help='Only this lab cluster may be attached when recovering connectivity')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    if args.cluster and not re.fullmatch(r'tfm-demo-run-[a-z0-9]+', args.cluster): parser.error('Invalid owned cluster name')
    output = args.output or ROOT / 'evidence/environment' / ('codespaces-network-' + uuid.uuid4().hex[:12] + '.json')
    output = output.absolute()
    if output.resolve() != output or output.exists(): parser.error('Use a new non-symlink evidence path')
    recovery = Recovery(output, args.cluster)
    def interrupted(*_): raise KeyboardInterrupt()
    signal.signal(signal.SIGTERM, interrupted)
    try:
        with mutation_lock(): code = recovery.execute(args.action)
    except (OSError, ValueError) as error:
        print('ERROR: ' + str(error)); return 1
    print('Codespaces network: ' + recovery.data['status'] + '; evidence: ' + str(output))
    if code: print('ERROR: ' + recovery.data.get('error', 'Network check failed'))
    return code


if __name__ == '__main__': raise SystemExit(main())
