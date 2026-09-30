#!/usr/bin/env python3
"""Exercise actual Conftest decisions with positive and independently mutated inputs."""

import argparse
import copy
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
POLICIES = HERE.parents[1] / "policies" / "conftest"


def cases():
    base = json.loads((HERE / "fixtures" / "base.json").read_text(encoding="utf-8"))
    result = [(name + "-allow", name, value, None) for name, value in base.items()]

    def add(name, namespace, mutate, expected):
        value = copy.deepcopy(base[namespace])
        mutate(value)
        result.append((name, namespace, value, expected))

    def pod(value):
        return value["spec"]["template"]["spec"]

    add("F11-coordinated", "manifests", lambda value: pod(value)["containers"][0]["securityContext"].update(privileged=True, allowPrivilegeEscalation=True), ["ESCALATION", "PRIVILEGED"])
    add("L06-annotation", "manifests", lambda value: value["spec"]["template"].setdefault("metadata", {}).update(annotations={"tfm.goldenpath/l06":"trial"}), None)
    add("manifest-namespace", "manifests", lambda value: value["metadata"].update(namespace="default"), "NAMESPACE")
    add("manifest-missing-spec", "manifests", lambda value: value.pop("spec"), "WORKLOAD_SHAPE")
    add("manifest-missing-template", "manifests", lambda value: value["spec"].pop("template"), "WORKLOAD_SHAPE")
    add("manifest-missing-pod-spec", "manifests", lambda value: value["spec"]["template"].pop("spec"), "WORKLOAD_SHAPE")
    for invalid in [None, [], "invalid"]:
        add("manifest-pod-spec-" + str(invalid), "manifests", lambda value, invalid=invalid: value["spec"]["template"].update(spec=invalid), "WORKLOAD_SHAPE")
    add("manifest-tag", "manifests", lambda value: pod(value)["containers"][0].update(image="registry.example/quotes-node:latest"), ["DIGEST"])
    for field, unsafe, code in [("privileged", True, "PRIVILEGED"), ("allowPrivilegeEscalation", True, "ESCALATION"), ("runAsNonRoot", False, "NON_ROOT"), ("readOnlyRootFilesystem", False, "READ_ONLY")]:
        add("manifest-" + field, "manifests", lambda value, f=field, u=unsafe: pod(value)["containers"][0]["securityContext"].update({f: u}), code)
    add("manifest-capability-add", "manifests", lambda value: pod(value)["containers"][0]["securityContext"]["capabilities"].update(add=["SYS_ADMIN"]), "CAPABILITIES")
    add("manifest-host-path", "manifests", lambda value: pod(value).update(volumes=[{"name": "root", "hostPath": {"path": "/"}}]), "HOST_PATH")
    add("manifest-host-network", "manifests", lambda value: pod(value).update(hostNetwork=True), "HOST_ACCESS")
    add("manifest-missing-seccomp", "manifests", lambda value: pod(value).pop("securityContext"), "SECCOMP")
    add("manifest-empty-containers", "manifests", lambda value: pod(value).update(containers=[]), "CONTAINERS")
    for field in ["initContainers", "ephemeralContainers"]:
        def unsafe_extra(value, field=field):
            extra = copy.deepcopy(pod(value)["containers"][0])
            extra["securityContext"]["privileged"] = True
            pod(value)[field] = [extra]
        add("manifest-" + field, "manifests", unsafe_extra, "PRIVILEGED")
    direct_pod = copy.deepcopy(base["manifests"])
    direct_pod.update(apiVersion="v1", kind="Pod", spec=direct_pod["spec"]["template"]["spec"])
    result.append(("pod-allow", "manifests", direct_pod, None))
    coordinated = copy.deepcopy(direct_pod)
    coordinated['spec']['containers'][0]['securityContext'].update(privileged=True, allowPrivilegeEscalation=True)
    result.append(('F11-pod-coordinated', 'manifests', coordinated, ['ESCALATION', 'PRIVILEGED']))
    tagged = copy.deepcopy(direct_pod)
    tagged['spec']['containers'][0]['image'] = 'registry.example/quotes-node:run-trial'
    result.append(('F12-pod-tag', 'manifests', tagged, ['DIGEST']))
    for invalid in [None, [], "invalid"]:
        malformed_pod = copy.deepcopy(direct_pod)
        malformed_pod["spec"] = invalid
        result.append(("pod-spec-" + str(invalid), "manifests", malformed_pod, "WORKLOAD_SHAPE"))
    missing_pod = copy.deepcopy(direct_pod)
    missing_pod.pop("spec")
    result.append(("pod-missing-spec", "manifests", missing_pod, "WORKLOAD_SHAPE"))
    bad_pod = copy.deepcopy(direct_pod)
    bad_pod["spec"]["containers"][0]["securityContext"]["privileged"] = True
    result.append(("pod-privileged", "manifests", bad_pod, "PRIVILEGED"))

    add("workflow-tag", "workflow", lambda value: value["jobs"]["delivery"]["steps"][0].update(uses="actions/checkout@v4"), "ACTION_SHA")
    add("workflow-pr-target", "workflow", lambda value: value.update(on={"pull_request_target": {}}), "PULL_REQUEST_TARGET")
    add("workflow-global-write", "workflow", lambda value: value["permissions"].update(packages="write"), "GLOBAL_WRITE")
    add("workflow-job-write-all", "workflow", lambda value: value["jobs"]["delivery"].update(permissions="write-all"), "JOB_PERMISSIONS")
    add("workflow-contents-write", "workflow", lambda value: value["jobs"]["delivery"]["permissions"].update(contents="write"), "EXCESSIVE_WRITE")
    add("workflow-pr-with-write", "workflow", lambda value: value.update(on={"pull_request": {}}), "PR_WRITE")
    add("workflow-implicit-permissions", "workflow", lambda value: value.pop("permissions"), "PERMISSIONS")

    for severity in ["HIGH", "CRITICAL"]:
        for fixed in ["", "2.0.0"]:
            def vulnerability(value, severity=severity, fixed=fixed):
                value["Results"][0]["Vulnerabilities"] = [{"VulnerabilityID": "CVE-SYNTHETIC", "PkgName": "fixture", "Severity": severity, "FixedVersion": fixed}]
            add("trivy-" + severity + ("-fixed" if fixed else "-no-fix"), "trivy", vulnerability, "VULNERABILITY_BLOCK")
    add("trivy-medium-allow", "trivy", lambda value: value["Results"][0].update(Vulnerabilities=[{"VulnerabilityID": "CVE-SYNTHETIC", "PkgName": "fixture", "Severity": "MEDIUM"}]), None)
    add("trivy-empty-results", "trivy", lambda value: value.update(Results=[]), "TRIVY_REPORT_INVALID")
    add("trivy-missing-results", "trivy", lambda value: value.pop("Results"), "TRIVY_REPORT_INVALID")
    add("trivy-object-vulnerabilities", "trivy", lambda value: value["Results"][0].update(Vulnerabilities={}), "TRIVY_RESULT_INVALID")
    add("trivy-missing-type", "trivy", lambda value: value["Results"][0].pop("Type"), "TRIVY_RESULT_INVALID")
    for invalid in [None, "", 42]:
        add("trivy-type-" + str(invalid), "trivy", lambda value, invalid=invalid: value["Results"][0].update(Type=invalid), "TRIVY_RESULT_INVALID")
    add("trivy-missing-vulnerabilities-allow", "trivy", lambda value: value["Results"][0].pop("Vulnerabilities"), None)
    add("trivy-null-vulnerabilities-allow", "trivy", lambda value: value["Results"][0].update(Vulnerabilities=None), None)
    add("trivy-invalid-fixed-version", "trivy", lambda value: value["Results"][0].update(Vulnerabilities=[{"VulnerabilityID":"CVE-SYNTHETIC", "PkgName":"fixture", "Severity":"LOW", "FixedVersion":42}]), "TRIVY_VULNERABILITY_INVALID")
    add("trivy-unknown-severity-spelling", "trivy", lambda value: value["Results"][0].update(Vulnerabilities=[{"VulnerabilityID": "CVE-SYNTHETIC", "PkgName": "fixture", "Severity": "high"}]), "TRIVY_VULNERABILITY_INVALID")
    result.append(("trivy-not-report", "trivy", {}, "TRIVY_REPORT_INVALID"))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--conftest", default=shutil.which("conftest"))
    args = parser.parse_args()
    if not args.conftest:
        parser.error("Conftest is not installed; run the devcontainer installer")
    failures = []
    inputs = cases()
    with tempfile.TemporaryDirectory(prefix="gp-policy-tests-") as directory:
        for name, namespace, value, expected in inputs:
            path = Path(directory) / (name + ".json")
            path.write_text(json.dumps(value), encoding="utf-8")
            completed = subprocess.run([args.conftest, "test", str(path), "--policy", str(POLICIES), "--namespace", namespace, "--output", "json"], capture_output=True, text=True)
            if expected is None:
                success = completed.returncode == 0
            elif isinstance(expected, list):
                rows = json.loads(completed.stdout)
                messages = [f['msg'].split(':')[0] for row in rows for f in row.get('failures', [])]
                success = completed.returncode == 1 and not completed.stderr and sorted(messages) == expected
            else:
                success = completed.returncode == 1 and expected in completed.stdout
            runtime_case = {'F11-coordinated':'F11', 'F11-pod-coordinated':'F11',
                            'manifest-tag':'F12', 'F12-pod-tag':'F12', 'L06-annotation':'L06'}.get(name)
            if runtime_case:
                stdout = Path(directory) / (name + '-stdout.json')
                stderr = Path(directory) / (name + '-stderr.log')
                stdout.write_text(completed.stdout)
                stderr.write_text(completed.stderr)
                classified = subprocess.run(['node', str(HERE.parent / 'scenarios/runtime-evidence.mjs'),
                    'early', str(completed.returncode), str(stdout), str(stderr), str(path), runtime_case],
                    capture_output=True, text=True)
                success = success and classified.returncode == 0
                if classified.returncode:
                    print(classified.stderr)
            print(("PASS " if success else "FAIL ") + name)
            if not success:
                failures.append(name)
                print(completed.stdout + completed.stderr)
    print(f"{len(inputs) - len(failures)}/{len(inputs)} decisions verified by Conftest")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
