#!/usr/bin/env python3
"""Bounded CEL capability probe; synthetic content, real local signatures/registry.

This does not authorize a delivery or establish hosted compatibility. It never
installs production policies. Exit 2 means a required migration capability is
blocked; other nonzero exits are probe errors. Python requires only stdlib.
"""

import argparse
import base64
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import time
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[2]
BUNDLE = "application/vnd.dev.sigstore.bundle.v0.3+json"
OCI = "application/vnd.oci.image.manifest.v1+json"
TYPES = {
    "signature": "https://sigstore.dev/cosign/sign/v1",
    "sbom": "https://cyclonedx.org/bom",
    "provenance": "https://slsa.dev/provenance/v1",
    "results": "https://tfm-goldenpath.dev/attestations/verification-results/v1",
}


def encoded(value):
    return json.dumps(value, separators=(",", ":")).encode()


def sha(data):
    return "sha256:" + hashlib.sha256(data).hexdigest()


def save(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")


def evaluation_counts(output):
    counts = re.findall(r"pass: (\d+), fail: (\d+), warn: (\d+), error: (\d+), skip: (\d+)", output)
    if len(counts) != 1:
        raise ValueError("Expected one unambiguous engine count summary")
    passed, failed, warned, errors, skipped = map(int, counts[0])
    if passed + failed != 1 or warned or errors or skipped:
        raise ValueError("Expected one evaluated policy without warnings, errors or skips")
    return passed, failed, warned, errors


def fallback_requests(log):
    requests = []
    for line in log.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        if not isinstance(event, dict):
            continue
        if (event.get("method") == "GET" and event.get("statusCode") == 200 and
                re.fullmatch(r"/v2/classic/manifests/sha256-[0-9a-f]{64}\.att", event.get("path", ""))):
            agents = event.get("headers", {}).get("User-Agent", [])
            if any(agent.startswith("Kyverno/") for agent in agents):
                requests.append({k: event[k] for k in ("method", "path", "statusCode", "headers")})
    return requests


def policy(public_key, generic=False):
    validations = [{
        "expression": "images.containers.size() > 0 && images.containers.all(i, "
                      "verifyImageSignatures(i, [attestors.development]) == 1)",
        "message": "PROBE_GENERIC_SIGNATURE",
    }] if generic else [{
        "expression": "images.containers.size() > 0 && images.containers.all(i, "
                      f"verifyAttestationSignatures(i, attestations.{name}, [attestors.development]) == 1 && "
                      f"extractPayload(i, attestations.{name}).predicate.probe == '{name}')",
        "message": "PROBE_" + name.upper(),
    } for name in TYPES]
    return {
        "apiVersion": "policies.kyverno.io/v1", "kind": "ImageValidatingPolicy",
        "metadata": {"name": "cel-capability-probe"},
        "spec": {
            "evaluation": {"admission": {"enabled": True}, "background": {"enabled": False}},
            "failurePolicy": "Fail", "validationActions": ["Deny"],
            "webhookConfiguration": {"timeoutSeconds": 30},
            "autogen": {"podControllers": {"controllers": []}},
            "matchConstraints": {"resourceRules": [{"apiGroups": [""], "apiVersions": ["v1"],
                "operations": ["CREATE", "UPDATE"], "resources": ["pods"]}]},
            "matchConditions": [{"name": "protected-namespace", "expression": "object.metadata.namespace == 'tfm-golden'"}],
            "matchImageReferences": [{"glob": "*"}],
            "credentials": {"allowInsecureRegistry": True},
            "validationConfigurations": {"mutateDigest": False, "verifyDigest": True, "required": True},
            "attestors": [{"name": "development", "cosign": {
                "key": {"data": public_key},
                "ctlog": {"insecureIgnoreTlog": True, "insecureIgnoreSCT": True},
            }}],
            "attestations": [{"name": name, "intoto": {"type": kind}} for name, kind in TYPES.items()],
            "validations": validations,
        },
    }


class Probe:
    def __init__(self, output, admission=False):
        self.output = output
        self.cid = None
        self.admission = admission
        self.cluster = None
        self.observations = []
        self.environment = {**os.environ, "COSIGN_PASSWORD": ""}
        self.lock = json.loads((ROOT / "tools.lock.json").read_text())

    def command(self, label, args, check=True):
        try:
            result = subprocess.run(args, cwd=ROOT, env=self.environment, capture_output=True, timeout=300)
        except subprocess.TimeoutExpired as error:
            (self.output / (label + ".log")).write_bytes((error.stdout or b"") + (error.stderr or b"") + b"\nPROBE_COMMAND_TIMEOUT\n")
            raise
        (self.output / (label + ".log")).write_bytes(result.stdout + result.stderr)
        if check and result.returncode:
            raise RuntimeError(f"{label} failed ({result.returncode}); inspect retained log")
        return result

    def request(self, method, path, data=None, content_type=None):
        headers = {"Content-Type": content_type} if content_type else {}
        with urllib.request.urlopen(urllib.request.Request(
                "http://" + self.host + path, data=data, headers=headers, method=method), timeout=30) as r:
            return r.read(), r.headers

    def blob(self, repo, data, media_type):
        _, headers = self.request("POST", f"/v2/{repo}/blobs/uploads/", b"")
        location = headers["Location"]
        # zot returns an absolute path; never follow another host supplied by a server.
        if not location.startswith(f"/v2/{repo}/blobs/uploads/"):
            raise RuntimeError("Unexpected upload location")
        self.request("PUT", location + ("&" if "?" in location else "?") + "digest=" + sha(data), data,
                     "application/octet-stream")
        return {"mediaType": media_type, "digest": sha(data), "size": len(data)}

    def manifest(self, repo, manifest, reference=None):
        data = encoded(manifest)
        self.request("PUT", f"/v2/{repo}/manifests/{reference or sha(data)}", data, OCI)
        return {"mediaType": OCI, "digest": sha(data), "size": len(data)}

    def image(self, repo):
        config = self.blob(repo, encoded({"architecture": "amd64", "os": "linux",
            "rootfs": {"type": "layers", "diff_ids": []}, "config": {}}), "application/vnd.oci.image.config.v1+json")
        return self.manifest(repo, {"schemaVersion": 2, "mediaType": OCI, "config": config, "layers": []}, "probe")

    def publish(self, repo, subject, bundles, classic=False):
        config = self.blob(repo, b"{}", "application/vnd.oci.image.config.v1+json" if classic else "application/vnd.oci.empty.v1+json")
        if classic:
            layers = [self.blob(repo, encoded(bundle["dsseEnvelope"]), "application/vnd.dsse.envelope.v1+json") for bundle in bundles]
            self.manifest(repo, {"schemaVersion": 2, "mediaType": OCI, "config": config, "layers": layers},
                          subject["digest"].replace(":", "-") + ".att")
        else:
            for bundle in bundles:
                layer = self.blob(repo, encoded(bundle), BUNDLE)
                self.manifest(repo, {"schemaVersion": 2, "mediaType": OCI, "artifactType": BUNDLE,
                    "subject": subject, "config": config, "layers": [layer]})
        raw, _ = self.request("GET", f"/v2/{repo}/referrers/{subject['digest']}")
        (self.output / (repo + "-referrers.json")).write_bytes(raw)

    def evaluate(self, name, repo, subject, generic=False):
        resource = {"apiVersion": "v1", "kind": "Pod", "metadata": {"name": "cel-probe", "namespace": "tfm-golden"},
                    "spec": {"containers": [{"name": "probe", "image": self.host + "/" + repo + "@" + subject["digest"]}]}}
        resource_file = self.output / (name + ".yaml")
        save(resource_file, resource)
        result = self.command(name, ["kyverno", "apply", str(self.output / ("generic.yaml" if generic else "policy.yaml")),
            "--resource", str(resource_file), "--registry", "--detailed-results", "--warn-no-pass"], check=False)
        text = (result.stdout + result.stderr).decode()
        passed, failed, warned, errors = evaluation_counts(text)
        observation = {"name": name, "image": resource["spec"]["containers"][0]["image"],
                       "exitCode": result.returncode, "pass": passed, "fail": failed, "warn": warned, "error": errors}
        self.observations.append(observation)
        print(json.dumps(observation), flush=True)
        return observation

    def kubectl(self, label, args, check=True, actor=False):
        return self.command(label, ["kubectl", "--kubeconfig", str(self.kubeconfig), "--context", "kind-" + self.cluster,
            "--request-timeout=60s", *(["--as=system:serviceaccount:tfm-golden:deployer"] if actor else []), *args], check)

    def start_cluster(self, private):
        # Same cold-start allowance as the local adapter; no DB or build is needed.
        docker_root = Path(self.command("admission-docker-root", ["docker", "info", "--format", "{{.DockerRootDir}}"]).stdout.decode().strip())
        if shutil.disk_usage(docker_root).free < 8 * 1024**3:
            raise RuntimeError("Insufficient capacity: preserve 3 GiB plus 5 GiB infrastructure allowance")
        versions = dict(line.split("=", 1) for line in (ROOT / "versions.env").read_text().splitlines() if line and not line.startswith("#"))
        self.cluster = "tfm-demo-run-celprobe" + uuid.uuid4().hex[:12]
        self.kubeconfig = private / "kubeconfig"
        self.command("kind-create", ["kind", "create", "cluster", "--name", self.cluster, "--image", versions["KIND_NODE_IMAGE"],
            "--kubeconfig", str(self.kubeconfig), "--wait", "180s"])
        self.command("kind-identity", ["docker", "inspect", "--format", "{{.Id}}", self.cluster + "-control-plane"])
        if os.environ.get("CODESPACES") == "true":
            self.command("codespaces-network", ["python3", "scripts/codespaces-network.py", "ensure", "--cluster", self.cluster,
                "--output", str(self.output / "codespaces-network.json")])
        self.kubectl("namespace", ["create", "namespace", "tfm-golden"])
        self.kubectl("serviceaccount", ["create", "serviceaccount", "deployer", "-n", "tfm-golden"])
        self.kubectl("role", ["create", "role", "probe-writer", "-n", "tfm-golden", "--verb=get,list,watch,create,update,patch", "--resource=pods,deployments.apps"])
        self.kubectl("rolebinding", ["create", "rolebinding", "probe-writer", "-n", "tfm-golden", "--role=probe-writer", "--serviceaccount=tfm-golden:deployer"])
        chart = private / "kyverno.tgz"
        with urllib.request.urlopen(self.lock["charts"]["kyverno"]["url"], timeout=60) as response:
            chart.write_bytes(response.read())
        if hashlib.sha256(chart.read_bytes()).hexdigest() != self.lock["charts"]["kyverno"]["sha256"]:
            raise RuntimeError("Chart checksum mismatch")
        values = self.command("helm-values", ["bash", "-c", "source scripts/lib/lab.sh; mode=local; lock=tools.lock.json; lab_kyverno_values"])
        (self.output / "helm-values.json").write_bytes(values.stdout)
        self.command("helm-install", ["helm", "--kubeconfig", str(self.kubeconfig), "--kube-context", "kind-" + self.cluster,
            "install", "kyverno", str(chart), "--namespace", "kyverno", "--create-namespace", "--values", str(self.output / "helm-values.json"),
            "--wait", "--timeout", "4m"])

    def admission_cases(self):
        runtime = {"apiVersion": "policies.kyverno.io/v1", "kind": "ValidatingPolicy",
            "metadata": {"name": "cel-runtime-capability-probe"}, "spec": {
                "evaluation": {"admission": {"enabled": True}, "background": {"enabled": False}},
                "failurePolicy": "Fail", "validationActions": ["Deny"], "webhookConfiguration": {"timeoutSeconds": 30},
                "autogen": {"podControllers": {"controllers": ["Deployment"]}, "validatingAdmissionPolicy": {"enabled": False}},
                "matchConstraints": {"resourceRules": [{"apiGroups": [""], "apiVersions": ["v1"], "operations": ["CREATE", "UPDATE"], "resources": ["pods"]}]},
                "matchConditions": [{"name": "protected", "expression": "object.metadata.namespace == 'tfm-golden'"}],
                "validations": [{"expression": "object.spec.containers.all(c, has(c.securityContext) && has(c.securityContext.privileged) && c.securityContext.privileged == false)",
                                 "message": "PROBE_RUNTIME_PRIVILEGED"}]}}
        save(self.output / "runtime.yaml", runtime)
        for name in ("policy", "runtime"):
            self.kubectl(name + "-schema", ["apply", "--dry-run=server", "--validate=strict", "-f", str(self.output / (name + ".yaml"))])
            self.kubectl(name + "-install", ["apply", "-f", str(self.output / (name + ".yaml"))])
        for resource, name in [("imagevalidatingpolicy", "cel-capability-probe"), ("validatingpolicy", "cel-runtime-capability-probe")]:
            self.kubectl(resource + "-ready", ["wait", resource + "/" + name, "--for=jsonpath={.status.conditionStatus.ready}=true", "--timeout=120s"])
            self.kubectl(resource + "-loaded", ["get", resource, name, "-o", "json"])
        self.kubectl("endpoints", ["get", "endpointslices", "-n", "kyverno", "-o", "json"])
        self.kubectl("webhooks", ["get", "validatingwebhookconfigurations,mutatingwebhookconfigurations", "-o", "json"])
        legacy = self.kubectl("legacy-policies", ["get", "clusterpolicies", "-o", "json"])
        if json.loads(legacy.stdout)["items"]:
            raise RuntimeError("Unexpected legacy policies in isolated probe")
        for kind in ("validatingpolicies.policies.kyverno.io", "imagevalidatingpolicies.policies.kyverno.io", "policyexceptions.policies.kyverno.io"):
            for verb in ("create", "update", "delete"):
                result = self.kubectl("rbac-" + kind + "-" + verb, ["auth", "can-i", verb, kind], False, True)
                if result.returncode != 1 or result.stdout.strip() != b"no":
                    raise RuntimeError("Workload actor can change policy controls or RBAC query failed")
        for name in ("all-bundles", "no-signature", "tampered", "classic", "runtime-denied"):
            resource = json.loads((self.output / (("all-bundles" if name == "runtime-denied" else name) + ".yaml")).read_text())
            resource["spec"]["containers"][0]["securityContext"] = {"privileged": name == "runtime-denied"}
            file = self.output / ("admission-" + name + ".yaml")
            save(file, resource)
            result = self.kubectl("admission-" + name, ["create", "--dry-run=server", "-f", str(file)], False, True)
            expected = name == "all-bundles"
            if (result.returncode == 0) != expected:
                raise RuntimeError("Unexpected admission decision: " + name)
            if not expected:
                diagnostic = (result.stdout + result.stderr).decode()
                marker = "PROBE_RUNTIME_PRIVILEGED" if name == "runtime-denied" else "PROBE_SIGNATURE"
                if marker not in diagnostic:
                    raise RuntimeError("Unattributed admission failure: " + name)
        self.kubectl("controller-log", ["logs", "-n", "kyverno", "deployment/kyverno-admission-controller", "-c", "kyverno", "--tail=500"])

    def run(self):
        version = self.command("kyverno-version", ["kyverno", "version"]).stdout.decode()
        if "Version: " + self.lock["tools"]["kyverno"]["version"] not in version:
            raise RuntimeError("Kyverno differs from tools.lock.json")
        cosign_version = self.command("cosign-version", ["cosign", "version", "--json"])
        if json.loads(cosign_version.stdout)["gitVersion"] != "v" + self.lock["tools"]["cosign"]["version"]:
            raise RuntimeError("Cosign differs from tools.lock.json")
        active = self.command("active-labs", ["docker", "ps", "-q", "--filter", "label=io.x-k8s.kind.cluster"])
        if active.stdout.strip():
            raise RuntimeError("Another laboratory is active")
        for path in (ROOT, Path(self.command("docker-root", ["docker", "info", "--format", "{{.DockerRootDir}}"]).stdout.decode().strip())):
            if shutil.disk_usage(path).free < 3.5 * 1024**3:
                raise RuntimeError("Insufficient capacity: preserve 3 GiB plus 512 MiB probe growth")
        for label, args in [("cores", ["nproc"]), ("memory", ["free", "-h"]), ("disk", ["df", "-h"]),
                            ("inodes", ["df", "-i"]), ("docker-space", ["docker", "system", "df"])]:
            self.command(label, args)
        with tempfile.TemporaryDirectory(prefix="cel-probe-private-", dir=ROOT / ".tmp") as private_path:
            private = Path(private_path)
            if self.admission:
                self.start_cluster(private)
            save(private / "zot.json", {"distSpecVersion": "1.1.1", "storage": {"rootDirectory": "/var/lib/registry"},
                "http": {"address": "0.0.0.0", "port": "5000"}, "log": {"level": "info"}})
            name = "gp-cel-probe-" + uuid.uuid4().hex[:12]
            network = "kind" if self.admission else "bridge"
            self.cid = self.command("registry-create", ["docker", "create", "--name", name, "--network", network, "--label", "gp.cel-probe=" + name,
                self.lock["images"]["zot"]["reference"], "serve", "/etc/zot/config.json"]).stdout.decode().strip()
            self.command("registry-config", ["docker", "cp", str(private / "zot.json"), self.cid + ":/etc/zot/config.json"])
            self.command("registry-start", ["docker", "start", self.cid])
            self.host = self.command("registry-address", ["docker", "inspect", "--format", "{{(index .NetworkSettings.Networks \"" + network + "\").IPAddress}}", self.cid]).stdout.decode().strip() + ":5000"
            for attempt in range(30):
                try:
                    self.request("GET", "/v2/")
                    break
                except OSError:
                    if attempt == 29:
                        raise
                    time.sleep(1)
            for label, args in [("signing-config", ["signing-config", "create", "--out", str(private / "signing.json")]),
                                ("trusted-root", ["trusted-root", "create", "--out", str(private / "trust.json")]),
                                ("key", ["generate-key-pair", "--output-key-prefix", str(private / "development")])]:
                self.command(label, ["cosign", *args])
            pub = (private / "development.pub").read_text()
            (self.output / "development.pub").write_text(pub)
            save(self.output / "policy.yaml", policy(pub))
            save(self.output / "generic.yaml", policy(pub, generic=True))
            subject = self.image("bundles")
            bundles = {}
            for name, kind in TYPES.items():
                predicate = private / (name + ".json")
                save(predicate, {"probe": name})
                bundle = self.output / (name + ".bundle.json")
                self.command("sign-" + name, ["cosign", "attest", "--yes", "--key", str(private / "development.key"),
                    "--signing-config", str(private / "signing.json"), "--trusted-root", str(private / "trust.json"),
                    "--allow-insecure-registry", "--no-upload", "--predicate", str(predicate), "--type", kind,
                    "--bundle", str(bundle), self.host + "/bundles@" + subject["digest"]])
                bundles[name] = json.loads(bundle.read_text())
            self.publish("bundles", subject, bundles.values())
            self.evaluate("all-bundles", "bundles", subject)
            for repo, selected, generic in [("no-signature", [bundles[k] for k in TYPES if k != "signature"], False),
                                             ("generic-substitution", [bundles["sbom"]], True),
                                             ("classic", list(bundles.values()), False)]:
                other = self.image(repo)
                assert other == subject
                self.publish(repo, subject, selected, classic=repo == "classic")
                self.evaluate(repo, repo, subject, generic)
            bad = copy.deepcopy(bundles["signature"])
            sig = bytearray(base64.b64decode(bad["dsseEnvelope"]["signatures"][0]["sig"]))
            sig[-1] ^= 1
            bad["dsseEnvelope"]["signatures"][0]["sig"] = base64.b64encode(sig).decode()
            self.image("tampered")
            self.publish("tampered", subject, [bad, *[bundles[k] for k in TYPES if k != "signature"]])
            self.evaluate("tampered", "tampered", subject)
            for observed in self.observations:
                expected = observed["name"] in ("all-bundles", "generic-substitution")
                if (observed["pass"], observed["fail"], observed["warn"], observed["error"], observed["exitCode"]) != (int(expected), int(not expected), 0, 0, int(not expected)):
                    raise RuntimeError("Unexpected CLI evaluation: " + observed["name"])
            if self.admission:
                self.admission_cases()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--admission", action="store_true", help="Also create one isolated kind/chart laboratory; requires 8 GiB free")
    args = parser.parse_args()
    args.output = args.output.resolve()
    args.output.mkdir(parents=True, exist_ok=False)
    (ROOT / ".tmp").mkdir(exist_ok=True)
    probe = Probe(args.output, args.admission)
    save(args.output / "source.json", {
        "commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "worktreeStatus": subprocess.check_output(["git", "status", "--porcelain"], cwd=ROOT, text=True),
        "probeSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "lockSha256": hashlib.sha256((ROOT / "tools.lock.json").read_bytes()).hexdigest(),
        "admission": args.admission,
    })
    try:
        probe.run()
        status = "OBSERVED"
    except Exception as error:
        status = "ERROR"
        (args.output / "error.txt").write_text(str(error) + "\n")
        raise
    finally:
        if probe.cid:
            registry_log = probe.command("registry-log", ["docker", "logs", probe.cid], check=False)
            fallback = fallback_requests((registry_log.stdout + registry_log.stderr).decode())
            save(args.output / "classic-fallback-requests.json", fallback)
            if status == "OBSERVED":
                status = "BLOCKED_CLASSIC_FALLBACK" if fallback else "ERROR_NO_FALLBACK_OBSERVATION"
            probe.command("registry-remove", ["docker", "rm", "-f", probe.cid])
            probe.command("registry-absence", ["docker", "inspect", probe.cid], check=False)
        if probe.cluster:
            probe.command("kind-delete", ["kind", "delete", "cluster", "--name", probe.cluster, "--kubeconfig", str(probe.kubeconfig)])
            probe.command("kind-absence", ["docker", "inspect", probe.cluster + "-control-plane"], check=False)
        save(args.output / "observations.json", {"status": locals().get("status", "ERROR"), "cases": probe.observations})
    return 2 if status == "BLOCKED_CLASSIC_FALLBACK" else 1


if __name__ == "__main__":
    raise SystemExit(main())
