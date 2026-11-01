#!/usr/bin/env python3
"""Gate-two characterization of policy-controller's artifact-digest alternative.

Synthetic predicates, real Cosign signatures and official policy-controller CLI.
This is NOT an implementation of the four-statement-hash contract. No admission
or production policy is installed. Exit 2 is the historical statement-contract
contradiction. Exit 1 means incomplete feasibility or an integration/harness error;
inspect execution, contract and gate receipts separately. The immutable-envelope
mode is a partial gate, never GO_LOCAL. See the linked feasibility reports.
"""

import argparse
import base64
import copy
from collections import Counter
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess

SPEC = importlib.util.spec_from_file_location(
    "cel_probe", Path(__file__).with_name("kyverno-cel-capabilities.py"))
base = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(base)
TESTER_SHA256 = "bf9cd8d21dd17c2c1e890ee540ae19d36021d8d805db9c7754b391c405a41437"


def absence_confirmed(result):
    return result.returncode != 0 and b"no such object:" in result.stderr.lower()


def owned_registry(container, receipt):
    return (container.get("Id") == receipt["id"] and
            container.get("Name") == "/" + receipt["name"] and
            container.get("Config", {}).get("Labels", {}).get("gp.cel-probe") == receipt["name"])


def compare_orders(observations):
    """A reversal cannot quietly change policy, image or the candidate multiset."""
    by_name = {o["name"]: o for o in observations}
    if len(by_name) != len(observations):
        raise ValueError("Repeated observation name")
    for prefix in ("selected-pass", "selected-fail"):
        forward, reverse = [by_name[prefix + suffix] for suffix in ("-forward", "-reverse")]
        if (forward["image"] != reverse["image"] or forward["policySha256"] != reverse["policySha256"] or
                Counter(forward["envelopeOrder"]) != Counter(reverse["envelopeOrder"]) or
                forward["envelopeOrder"] != list(reversed(reverse["envelopeOrder"]))):
            raise ValueError("Order pair changed more than descriptor order")


def statement_bytes(bundle):
    return base64.b64decode(bundle["dsseEnvelope"]["payload"], validate=True)


def binding(bundles, envelopes):
    if set(bundles) != set(base.TYPES) or set(envelopes) != set(base.TYPES):
        raise ValueError("All four independent types are required")
    result = {}
    for kind in base.TYPES:
        envelope = json.loads(envelopes[kind])
        if envelope != bundles[kind]["dsseEnvelope"]:
            raise ValueError("Envelope differs from the retained signed bundle")
        raw = statement_bytes(bundles[kind])
        result[kind] = {"statementSha256": base.sha(raw), "envelopeSha256": base.sha(envelopes[kind])}
    return result


def policy(public_key, expected):
    # Deliberately test the strongest available indirect alternative: every
    # digest must belong to a same-object, authenticated, content-checked result.
    # These envelope hashes are NOT claimed to be statement hashes.
    rules = [f'  some a_{kind}\n'
             f'  a_{kind} = input.authorityMatches.trusted.attestations.{kind}[_]\n'
             f'  a_{kind}.digest == "{expected[kind]["envelopeSha256"]}"'
             for kind in base.TYPES]
    return {"apiVersion": "policy.sigstore.dev/v1beta1", "kind": "ClusterImagePolicy",
        "metadata": {"name": "artifact-selection-probe"}, "spec": {
            "images": [{"glob": "**"}], "mode": "enforce",
            "authorities": [{"name": "trusted", "key": {"data": public_key},
                "signatureFormat": "legacy", "attestations": [
                    {"name": k, "predicateType": t, "policy": {"type": "rego", "data":
                     'package sigstore\ndefault isCompliant = false\nisCompliant {\n'
                     f'  input.predicateType == "{t}"\n'
                     f'  input.predicate.probe == "{k}"\n'
                     '  input.predicate.authorized == true\n}\n'}} for k, t in base.TYPES.items()]}],
            "policy": {"type": "rego", "data":
                'package sigstore\ndefault isCompliant = false\nisCompliant {\n' +
                '\n'.join(rules) + '\n}\n'}}}


def classify(exit_code, stdout, stderr):
    """Only attribute a decision after exactly one complete outer evaluation."""
    if stderr.count("Checking Authority:") != 1 or stderr.count("Validating CIP level policy") != 1:
        raise ValueError("Missing, repeated or unreached authority/outer evaluation")
    snapshots = re.findall(r"CIP level policy: (\{[^\n]+\})", stderr)
    if len(snapshots) != 1:
        raise ValueError("Expected one original evaluated input")
    data = json.loads(snapshots[0])
    matches = data.get("authorityMatches", {})
    if set(matches) != {"trusted"}:
        raise ValueError("Unexpected or omitted authority")
    attestations = matches["trusted"].get("attestations", {})
    if set(attestations) != set(base.TYPES) or any(not v for v in attestations.values()):
        raise ValueError("Missing independently authenticated content")
    if exit_code == 0 and "Verification was successful!" in stderr and not stdout.strip():
        return "ACCEPT", data
    if exit_code == 1:
        result = json.loads(stdout)
        errors = result.get("errors", [])
        if (not result.get("warnings") and len(errors) == 1 and
                "failed evaluating rego policy for type ClusterImagePolicy" in errors[0] and
                "policy is not compliant" in errors[0]):
            return "CONTENT_SELECTION_REJECT", data
    raise ValueError("Unattributed execution/integration error")


def classify_envelope(exit_code, stdout, stderr):
    """Separate internal content failure from outer selection and technical errors.

    Missing-type and authentication diagnoses need the retained inventory and
    independent official verification as well; they are not F13 observations.
    """
    try:
        decision, data = classify(exit_code, stdout, stderr)
        return decision, "OUTER", data
    except (ValueError, KeyError, TypeError):
        pass
    if stderr.count("Checking Authority:") != 1:
        return "INTEGRATION_ERROR", "UNREACHED", None
    if stderr.count("Validating CIP level policy"):
        return "INTEGRATION_ERROR", "OUTER", None
    try:
        result = json.loads(stdout)
        errors = result["errors"]
        if exit_code != 1 or result.get("warnings") or len(errors) != 1:
            raise ValueError("Not a single blocking error")
        error = errors[0]
    except (ValueError, KeyError, TypeError):
        return "INTEGRATION_ERROR", "INTERNAL", None
    if ("policy is not compliant" in error and
            any(f"failed evaluating rego policy for type {kind}:" in error for kind in base.TYPES)):
        return "CONTENT_REJECT", "INTERNAL", None
    if "no matching attestations with type " in error:
        return "MISSING_VERIFIED_TYPE", "INTERNAL", None
    return "INTEGRATION_ERROR", "INTERNAL", None


class Probe(base.Probe):
    def __init__(self, output, tester):
        super().__init__(output, selection_only=True)
        self.tester = str(tester)
        self.commands = []

    def command(self, label, args, check=True):
        self.commands.append({"label": label, "argv": args})
        base.save(self.output / "commands.json", self.commands)
        result = super().command(label, args, check)
        if label == "registry-create" and result.returncode == 0:
            base.save(self.output / "registry-receipt.json", {"id": result.stdout.decode().strip(),
                "name": args[args.index("--name") + 1]})
        return result

    def cleanup_registry(self):
        receipt = json.loads((self.output / "registry-receipt.json").read_text())
        inspected = self.command("registry-owner", ["docker", "inspect", self.cid])
        objects = json.loads(inspected.stdout)
        if len(objects) != 1 or not owned_registry(objects[0], receipt):
            raise RuntimeError("Registry ownership does not match immutable creation receipt")
        self.command("registry-log", ["docker", "logs", self.cid], check=False)
        self.command("registry-remove", ["docker", "rm", "-f", self.cid])
        absent = self.command("registry-absence", ["docker", "inspect", self.cid], check=False)
        confirmed = absence_confirmed(absent)
        base.save(self.output / "cleanup.json", {"containerId": self.cid, "ownershipConfirmed": True,
            "absenceConfirmed": confirmed})
        if not confirmed:
            raise RuntimeError("Registry absence not confirmed")

    def publish_envelopes(self, subject, envelopes):
        config = self.blob("bundles", b"{}", "application/vnd.oci.image.config.v1+json")
        layers = [self.blob("bundles", e, "application/vnd.dsse.envelope.v1+json") for e in envelopes]
        # Official classic DSSE representation: signature is inside the envelope;
        # the descriptor still carries Cosign's required empty signature marker.
        for layer in layers:
            layer["annotations"] = {"dev.cosignproject.cosign/signature": ""}
        self.manifest("bundles", {"schemaVersion": 2, "mediaType": base.OCI,
            "config": config, "layers": layers}, subject["digest"].replace(":", "-") + ".att")

    def evaluate_selection(self, name, subject, envelopes, policy_path, expected):
        self.publish_envelopes(subject, envelopes)
        raw, _ = self.request("GET", "/v2/bundles/manifests/" + subject["digest"].replace(":", "-") + ".att")
        (self.output / (name + "-manifest.json")).write_bytes(raw)
        reference = self.host + "/bundles@" + subject["digest"]
        result = self.command(name, [self.tester, "--policy", str(policy_path),
            "--image", reference, "--log-level", "debug"], check=False)
        decision, evaluated = classify(result.returncode, result.stdout.decode(), result.stderr.decode())
        observation = {"name": name, "image": reference, "expected": expected,
            "observed": decision, "exitCode": result.returncode,
            "matchesExpectation": (decision == "ACCEPT") == (expected == "ACCEPT"),
            "envelopeOrder": [base.sha(e) for e in envelopes],
            "policySha256": base.sha(policy_path.read_bytes()), "evaluatedInput": evaluated}
        self.observations.append(observation)
        base.save(self.output / "observations.json", self.observations)
        print(json.dumps({k: v for k, v in observation.items() if k != "evaluatedInput"}), flush=True)

    def selection_probe(self, private, subject, bundles, public_key):
        original = {k: base.encoded(v["dsseEnvelope"]) for k, v in bundles.items()}
        expected = binding(bundles, original)
        base.save(self.output / "binding.json", expected)
        policy_path = self.output / "artifact-policy.json"
        base.save(policy_path, policy(public_key, expected))
        for k, raw in original.items():
            (self.output / (k + ".envelope.json")).write_bytes(raw)
            (self.output / (k + ".statement.json")).write_bytes(statement_bytes(bundles[k]))
            self.command("authenticate-" + k, ["cosign", "verify-blob-attestation", "--key", str(private / "development.pub"),
                "--insecure-ignore-tlog", "--digest", subject["digest"].split(":")[1], "--digestAlg", "sha256",
                "--type", base.TYPES[k], "--bundle", str(self.output / (k + ".bundle.json"))])

        # Change signed bytes, retaining the signature, subject, key and predicate
        # type. Only the official verifier decides whether authentication fails.
        tampered = copy.deepcopy(bundles["results"])
        raw = statement_bytes(tampered)
        altered = raw.replace(b'"authorized":true', b'"authorized":false')
        if raw == altered:
            raise ValueError("Expected synthetic field was not changed")
        tampered["dsseEnvelope"]["payload"] = base64.b64encode(altered).decode()
        base.save(self.output / "tampered.bundle.json", tampered)
        result = self.command("authenticate-tampered", ["cosign", "verify-blob-attestation", "--key", str(private / "development.pub"),
            "--insecure-ignore-tlog", "--digest", subject["digest"].split(":")[1], "--digestAlg", "sha256",
            "--type", base.TYPES["results"], "--bundle", str(self.output / "tampered.bundle.json")], check=False)
        if result.returncode == 0 or b"accepted signatures do not match threshold" not in result.stderr:
            raise RuntimeError("Byte mutation did not produce the expected cryptographic rejection")
        base.save(self.output / "byte-mutation.json", {"original": base.sha(raw), "altered": base.sha(altered),
            "signatureUnchanged": tampered["dsseEnvelope"]["signatures"] == bundles["results"]["dsseEnvelope"]["signatures"],
            "observed": "AUTHENTICATION_REJECT", "exitCode": result.returncode})

        # Reserialize ONLY the outer envelope, never the authenticated statement.
        # All original signed statement bytes/signatures remain present. The
        # changed layer digest tests whether artifact identity can replace E.
        repacked = json.dumps(bundles["results"]["dsseEnvelope"], indent=2).encode() + b"\n"
        (self.output / "results-repacked.envelope.json").write_bytes(repacked)
        assert json.loads(repacked) == json.loads(original["results"])
        assert base.sha(repacked) != expected["results"]["envelopeSha256"]
        base.save(self.output / "representation.json", {"statementSha256": expected["results"]["statementSha256"],
            "originalEnvelope": base.sha(original["results"]), "repackedEnvelope": base.sha(repacked),
            "statementBytesUnchanged": base64.b64decode(json.loads(repacked)["payload"], validate=True) == raw,
            "signaturesUnchanged": json.loads(repacked)["signatures"] == bundles["results"]["dsseEnvelope"]["signatures"]})

        variants = {
            "original": list(original.values()),
            "duplicate-forward": [*original.values(), repacked],
            "duplicate-reverse": [repacked, *reversed(list(original.values()))],
            "repacked-only": [original[k] if k != "results" else repacked for k in base.TYPES],
        }
        base.save(self.output / "expectations.json", {name: "ACCEPT" for name in variants})
        for name, envelopes in variants.items():
            self.evaluate_selection(name, subject, envelopes, policy_path, "ACCEPT")
        # Positive control proving that the engine can authenticate and evaluate
        # that same repacked statement; only its protected artifact digest changes.
        rebound = copy.deepcopy(expected)
        rebound["results"]["envelopeSha256"] = base.sha(repacked)
        rebound_policy = self.output / "rebound-artifact-policy.json"
        base.save(rebound_policy, policy(public_key, rebound))
        self.evaluate_selection("repacked-rebound-control", subject, variants["repacked-only"], rebound_policy, "ACCEPT")
        if any(not o["matchesExpectation"] for o in self.observations if o["name"] != "repacked-only"):
            raise RuntimeError("A required positive control failed")


class EnvelopeProbe(Probe):
    """New immutable-envelope contract; historical default probe is unchanged."""

    def evaluate_envelope(self, name, subject, envelopes, policy_path, expected):
        self.publish_envelopes(subject, envelopes)
        path = "/v2/bundles/manifests/" + subject["digest"].replace(":", "-") + ".att"
        before, _ = self.request("GET", path)
        (self.output / (name + "-inventory-before.json")).write_bytes(before)
        reference = self.host + "/bundles@" + subject["digest"]
        result = self.command(name, [self.tester, "--policy", str(policy_path),
            "--image", reference, "--log-level", "debug"], check=False)
        after, _ = self.request("GET", path)
        (self.output / (name + "-inventory-after.json")).write_bytes(after)
        decision, stage, data = classify_envelope(result.returncode, result.stdout.decode(), result.stderr.decode())
        item = {"name": name, "image": reference, "expected": expected, "observed": decision,
            "stage": stage, "exitCode": result.returncode, "evaluatedInput": data,
            "envelopeOrder": [base.sha(e) for e in envelopes], "policySha256": base.sha(policy_path.read_bytes()),
            "inventoryStable": before == after, "matchesExpectation": decision == expected and before == after}
        self.observations.append(item)
        base.save(self.output / "observations.json", self.observations)
        print(json.dumps({k: v for k, v in item.items() if k != "evaluatedInput"}), flush=True)
        if not item["matchesExpectation"]:
            raise RuntimeError("Envelope gate failed; retain diagnostics: " + name)

    def selection_probe(self, private, subject, bundles, public_key):
        original = {k: base.encoded(v["dsseEnvelope"]) for k, v in bundles.items()}
        expected = binding(bundles, original)
        base.save(self.output / "binding.json", expected)
        for k, raw in original.items():
            (self.output / (k + ".envelope.json")).write_bytes(raw)
            (self.output / (k + ".statement.json")).write_bytes(statement_bytes(bundles[k]))
            self.command("authenticate-" + k, ["cosign", "verify-blob-attestation", "--key", str(private / "development.pub"),
                "--insecure-ignore-tlog", "--digest", subject["digest"].split(":")[1], "--digestAlg", "sha256",
                "--type", base.TYPES[k], "--bundle", str(self.output / (k + ".bundle.json"))])
        bad = self.sign(private, "results-fail", "results", {"probe": "results", "authorized": False}, subject)
        bad_raw = base.encoded(bad["dsseEnvelope"])
        (self.output / "results-fail.envelope.json").write_bytes(bad_raw)
        selected_fail = copy.deepcopy(expected)
        selected_fail["results"] = {"statementSha256": base.sha(statement_bytes(bad)), "envelopeSha256": base.sha(bad_raw)}
        path = self.output / "envelope-policy.json"
        base.save(path, policy(public_key, expected))
        fail_path = self.output / "fail-policy.json"
        base.save(fail_path, policy(public_key, selected_fail))
        others = [original[k] for k in base.TYPES if k != "results"]
        pair = [*original.values(), bad_raw]
        repacked = json.dumps(bundles["results"]["dsseEnvelope"], indent=2).encode() + b"\n"
        (self.output / "results-repacked.envelope.json").write_bytes(repacked)
        rebound = copy.deepcopy(expected)
        rebound["results"]["envelopeSha256"] = base.sha(repacked)
        rebound_path = self.output / "rebound-policy.json"
        base.save(rebound_path, policy(public_key, rebound))
        cases = [
            ("minimal-original", list(original.values()), path, "ACCEPT"),
            ("identical-duplicates", [*original.values(), original["results"]], path, "ACCEPT"),
            ("selected-pass-forward", pair, path, "ACCEPT"),
            ("selected-pass-reverse", list(reversed(pair)), path, "ACCEPT"),
            ("selected-fail-forward", pair, fail_path, "CONTENT_SELECTION_REJECT"),
            ("selected-fail-reverse", list(reversed(pair)), fail_path, "CONTENT_SELECTION_REJECT"),
            ("selected-fail-only", [*others, bad_raw], fail_path, "CONTENT_REJECT"),
            ("selected-artifact-absent", [*others, repacked], path, "CONTENT_SELECTION_REJECT"),
            ("repacked-new-preparation", [*others, repacked], rebound_path, "ACCEPT"),
        ]
        base.save(self.output / "expectations.json", [{"name": n, "expected": e} for n, _, _, e in cases])
        for name, envelopes, policy_path, outcome in cases:
            self.evaluate_envelope(name, subject, envelopes, policy_path, outcome)
        compare_orders(self.observations)
        base.save(self.output / "minimal-gate.json", {"result": "PASS", "evaluations": len(self.observations),
            "formatsAndFullContracts": "PENDING", "admission": "NOT_EXECUTED"})
        self.producer_format_probe(private, subject, bundles, public_key)

    def producer_format_probe(self, private, subject, bundles, public_key):
        # Exercise the actual image-signing producer, not an attest command with
        # a synthetic predicate named sign/v1. Canonical bundle remains intact.
        file = self.output / "producer-image.bundle.json"
        self.command("producer-image-sign", ["cosign", "sign", "--yes", "--key", str(private / "development.key"),
            "--signing-config", str(private / "signing.json"), "--trusted-root", str(private / "trust.json"),
            "--allow-insecure-registry", "--upload=false", "--bundle", str(file),
            self.host + "/bundles@" + subject["digest"]])
        native = json.loads(file.read_text())
        self.command("producer-image-authenticate", ["cosign", "verify-blob-attestation", "--key", str(private / "development.pub"),
            "--insecure-ignore-tlog", "--digest", subject["digest"].split(":")[1], "--digestAlg", "sha256",
            "--type", base.TYPES["signature"], "--bundle", str(file)])
        original = dict(bundles, signature=native)
        envelopes = {k: base.encoded(v["dsseEnvelope"]) for k, v in original.items()}
        for kind, raw in envelopes.items():
            (self.output / ("producer-" + kind + ".envelope.json")).write_bytes(raw)
        selected = binding(original, envelopes)
        base.save(self.output / "producer-binding.json", selected)
        p = policy(public_key, selected)
        p["spec"]["authorities"][0]["attestations"][0]["policy"]["data"] = (
            'package sigstore\ndefault isCompliant = false\nisCompliant {\n'
            f'  input.predicateType == "{base.TYPES["signature"]}"\n'
            f'  input.subject[_].digest.sha256 == "{subject["digest"].split(":")[1]}"\n' + '}\n')
        path = self.output / "producer-policy.json"
        base.save(path, p)
        self.evaluate_envelope("actual-image-sign-producer", subject, list(envelopes.values()), path, "ACCEPT")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--tester", type=Path, required=True, help="Official v0.15.1 tester; verify its release signature first")
    parser.add_argument("--contract", choices=("statement", "immutable-envelope"), default="statement")
    args = parser.parse_args()
    tester = args.tester.resolve()
    if hashlib.sha256(tester.read_bytes()).hexdigest() != TESTER_SHA256:
        parser.error("Tester does not match the official pinned release")
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=False)
    (base.ROOT / ".tmp").mkdir(exist_ok=True)
    (output / "executed-probe.py").write_bytes(Path(__file__).read_bytes())
    base.save(output / "source.json", {"base": subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip(),
        "status": subprocess.check_output(["git", "status", "--porcelain"], text=True),
        "files": {str(p.relative_to(base.ROOT)): base.sha(p.read_bytes()) for p in (
            Path(__file__).resolve(), Path(__file__).with_name("kyverno-cel-capabilities.py").resolve(), base.ROOT / "tools.lock.json")},
        "testerSha256": TESTER_SHA256, "cache": "CLI NoCache; OCI11 disabled", "admission": "NOT_EXECUTED"})
    probe = (EnvelopeProbe if args.contract == "immutable-envelope" else Probe)(output, tester)
    completed = False
    try:
        probe.run()
        completed = True
    except Exception as error:
        (output / "error.txt").write_text(str(error) + "\n")
    finally:
        if probe.cid:
            try:
                probe.cleanup_registry()
            except Exception as error:
                completed = False
                (output / "cleanup-error.txt").write_text(str(error) + "\n")
        contradictions = [o["name"] for o in probe.observations if not o["matchesExpectation"]]
        decision = "NO_GO" if completed and contradictions == ["repacked-only"] else "INCONCLUSIVE"
        base.save(output / "summary.json", {"execution": "COMPLETED" if completed else "ERROR",
            "contract": args.contract,
            "decision": decision, "unexpectedCases": contradictions, "evaluations": len(probe.observations),
            "scope": "artifact digest alternative, synthetic four predicates, CLI only",
            "localProducerFormats": "actual sign/v1 only" if args.contract == "immutable-envelope" and completed else "NOT_ESTABLISHED",
            "fullLocalContract": "NOT_EXECUTED",
            "admission": "NOT_EXECUTED", "hosted": "NOT_EXECUTED", "adoption": "BLOCKED"})
    return 2 if decision == "NO_GO" else 1


if __name__ == "__main__":
    raise SystemExit(main())
