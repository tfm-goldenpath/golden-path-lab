#!/usr/bin/env python3
"""Optional runtime-rule regression using the actual Kyverno CLI (no cluster)."""

import argparse
import copy
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from test_render import RenderTests, renderer


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--kyverno", default=shutil.which("kyverno"))
    args = parser.parse_args()
    if not args.kyverno:
        parser.error("Optional test: install Kyverno CLI matching the controller version")
    base = json.loads((Path(__file__).parent / "fixtures" / "base.json").read_text(encoding="utf-8"))["manifests"]
    deployment = copy.deepcopy(base)
    deployment["spec"]["template"]["spec"]["containers"][0]["image"] = "registry.example/quotes-node@sha256:" + "a" * 64
    pod = {"apiVersion": "v1", "kind": "Pod", "metadata": copy.deepcopy(base["metadata"]), "spec": copy.deepcopy(deployment["spec"]["template"]["spec"])}
    cases = [("deployment-allow", deployment, None), ("pod-allow", pod, None)]
    for kind, source in [("deployment", deployment), ("pod", pod)]:
        for mutation in ["privileged", "repository", "tag"]:
            value = copy.deepcopy(source)
            spec = value["spec"]["template"]["spec"] if kind == "deployment" else value["spec"]
            if mutation == "privileged":
                spec["containers"][0]["securityContext"]["privileged"] = True
                spec["containers"][0]["securityContext"]["allowPrivilegeEscalation"] = True
                rule = "restricted-containers"
            else:
                spec["containers"][0]["image"] = "untrusted.example/quotes-node@sha256:" + "a" * 64 if mutation == "repository" else "registry.example/quotes-node:latest"
                rule = "authorized-image-repository"
            cases.append((kind + "-" + mutation, value, rule))
    init = copy.deepcopy(deployment)
    init_spec = init["spec"]["template"]["spec"]
    init_spec["initContainers"] = [copy.deepcopy(init_spec["containers"][0])]
    init_spec["initContainers"][0]["securityContext"]["privileged"] = True
    cases.append(("deployment-init-privileged", init, "restricted-containers"))
    legal = copy.deepcopy(deployment)
    legal['spec']['template'].setdefault('metadata', {})['annotations'] = {'tfm.goldenpath/l06': 'trial'}
    cases.append(('L06-annotation-update-shape', legal, None))
    # The CLI evaluates the selected admission operation; it does not perform API validation.
    cases = [(name + '-' + operation, resource, expected, operation)
             for name, resource, expected in cases
             for operation in (['CREATE', 'UPDATE'] if resource['kind'] == 'Deployment' else ['CREATE'])]
    failed = []
    with tempfile.TemporaryDirectory(prefix="gp-kyverno-tests-") as directory:
        directory = Path(directory)
        policy = directory / "runtime.yaml"
        # JSON is valid YAML. The CLI requires a YAML extension to load policies.
        policy.write_text(json.dumps(renderer.render(RenderTests().config())["items"][0]), encoding="utf-8")
        for name, resource, expected_rule, operation in cases:
            file = directory / (name + ".yaml")
            file.write_text(json.dumps(resource), encoding="utf-8")
            values = directory / (name + '-values.yaml')
            context = {'request.operation': operation}
            if operation == 'UPDATE':
                # CLI defaults oldObject to the new resource, which can skip
                # unchanged violations. Supply the accepted original explicitly.
                # https://github.com/kyverno/kyverno/blob/v1.19.1/cmd/cli/kubectl-kyverno/processor/policy_processor.go
                previous = copy.deepcopy(deployment)
                if 'init-privileged' in name:
                    # Keep the init container present in the accepted original;
                    # this test changes its security field, not list membership.
                    previous['spec']['template']['spec']['initContainers'] = [
                        copy.deepcopy(deployment['spec']['template']['spec']['containers'][0])]
                context['request.oldObject'] = previous
            values.write_text(json.dumps({'apiVersion':'cli.kyverno.io/v1alpha1',
                'kind':'Values', 'metadata':{'name':'runtime-operations'}, 'globalValues':context}))
            result = subprocess.run([args.kyverno, "apply", str(policy), "--resource", str(file),
                                     "--values-file", str(values)], capture_output=True, text=True)
            output = result.stdout + result.stderr
            counts = re.search(r"pass: (\d+), fail: (\d+), warn: (\d+), error: (\d+)", output)
            success = False
            if counts:
                passed, denied, _, errors = map(int, counts.groups())
                if expected_rule:
                    success = result.returncode in (0, 1) and denied == 1 and errors == 0 and expected_rule in output
                else:
                    success = result.returncode == 0 and passed > 0 and denied == 0 and errors == 0
            print(("PASS " if success else "FAIL ") + name, flush=True)
            if not success:
                failed.append(name)
                print(output, flush=True)
    print(f"{len(cases) - len(failed)}/{len(cases)} checks using the Kyverno engine", flush=True)
    return bool(failed)


if __name__ == "__main__":
    raise SystemExit(main())
