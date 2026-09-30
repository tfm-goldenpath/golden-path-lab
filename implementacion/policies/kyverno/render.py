#!/usr/bin/env python3
"""Render admission policies with explicit, per-execution trust (stdlib only)."""

import argparse
import copy
import json
import re
from pathlib import Path

RESULTS_TYPE = "https://tfm-goldenpath.dev/attestations/verification-results/v1"
PROVENANCE_TYPE = "https://slsa.dev/provenance/v1"
SBOM_TYPE = "https://cyclonedx.org/bom"
SIGNATURE_TYPE = "https://sigstore.dev/cosign/sign/v1"
CHECKS = (
    "unitTests", "manifestPolicy", "workflowPolicy", "vulnerabilityPolicy",
    "signature", "sbom", "provenance",
)


def condition(expression, value, message=None):
    result = {"key": "{{ " + expression + " || '' }}", "operator": "Equals", "value": value}
    if message:
        result["message"] = message
    return result


def match_resources():
    return {"any": [{"resources": {
        "kinds": ["Pod"], "namespaces": ["tfm-golden"], "operations": ["CREATE", "UPDATE"]
    }}]}


def policy(name, rules):
    return {
        "apiVersion": "kyverno.io/v1", "kind": "ClusterPolicy",
        "metadata": {
            "name": name,
            "annotations": {"pod-policies.kyverno.io/autogen-controllers": "Deployment"},
        },
        "spec": {
            "background": False,
            "validationFailureAction": "Enforce",
            "failurePolicy": "Fail",
            "webhookTimeoutSeconds": 30,
            "rules": rules,
        },
    }


def render(config):
    if config.get("policy_version", "golden-path-v1") != "golden-path-v1":
        raise ValueError("Results policy must match the trusted golden-path-v1 CI requirement")
    image_repository = config["image_repository"]
    if not re.fullmatch(r"[a-z0-9][a-z0-9._:/-]*", image_repository) or ":" in image_repository.rsplit("/", 1)[-1]:
        raise ValueError("image-repository must be a reference without a tag, digest or wildcards")
    if not re.fullmatch(r"[0-9a-f]{40}", config["commit"]):
        raise ValueError("commit must contain 40 hexadecimal characters")
    if config["sbom_version"] not in {"1.7"}:
        raise ValueError("sbom-version must match the generated and verified CycloneDX version")
    if not config["repository"].startswith("https://"):
        raise ValueError("repository must be an explicit HTTPS URL")
    if config["mode"] == "local":
        public_key = config["public_key"]
        if "-----BEGIN PUBLIC KEY-----" not in public_key or "-----END PUBLIC KEY-----" not in public_key:
            raise ValueError("The development PEM public key is required")
        # Timestamp-free development keys need both exceptions in Kyverno's
        # bundle verifier. Neither exception belongs in the hosted OIDC profile.
        attestor = {"keys": {
            "publicKeys": public_key, "rekor": {"ignoreTlog": True},
            "ctlog": {"ignoreSCT": True},
        }}
    elif config["mode"] == "github":
        identity = config["identity"]
        if not identity.startswith(config["repository"] + "/.github/workflows/") or "@refs/" not in identity:
            raise ValueError("identity must identify the exact repository workflow and its ref")
        if any(character in identity for character in "*?[]"):
            raise ValueError("identity must not contain patterns or wildcards")
        attestor = {"keyless": {
            "issuer": "https://token.actions.githubusercontent.com",
            "subject": identity,
            "rekor": {"url": "https://rekor.sigstore.dev"},
        }}
    else:
        raise ValueError("mode must be local or github")
    attestors = [{"count": 1, "entries": [attestor]}]

    # Explicit registry allow-list avoids bypassing verifyImages with another image.
    image_regex = "^" + re.escape(image_repository) + r"@sha256:[0-9a-f]{64}$"
    container_list = "request.object.spec.[containers, initContainers, ephemeralContainers][]"
    runtime = policy("tfm-runtime", [{
        "name": "restricted-runtime", "match": match_resources(),
        "validate": {
            "message": "RUNTIME: an authorized image pinned by digest and restricted execution are required",
            "pattern": {"spec": {
                "=(hostNetwork)": False, "=(hostPID)": False, "=(hostIPC)": False,
                "securityContext": {"seccompProfile": {"type": "RuntimeDefault"}},
            }},
        },
    }, {
        "name": "restricted-containers", "match": match_resources(),
        "validate": {
            "message": "RUNTIME: all containers must be unprivileged, without privilege escalation or capabilities",
            "foreach": [{"list": container_list, "pattern": {"securityContext": {
                "privileged": False, "allowPrivilegeEscalation": False,
                "runAsNonRoot": True, "readOnlyRootFilesystem": True,
                "capabilities": {"drop": ["ALL"], "X(add)": "null"},
            }}}],
        },
    }, {
        "name": "authorized-image-repository", "match": match_resources(),
        "validate": {
            "message": "IMAGE_REPOSITORY: all images must belong to the authorized repository and use a digest",
            "foreach": [{"list": container_list, "deny": {"conditions": {"all": [{
                "key": "{{ regex_match('" + image_regex + "', element.image) }}",
                "operator": "Equals", "value": False,
            }]}}}],
        },
    }, {
        "name": "no-host-path", "match": match_resources(),
        "validate": {
            "message": "HOST_PATH: the laboratory does not allow hostPath volumes",
            "foreach": [{"list": "request.object.spec.volumes || `[]`", "pattern": {"X(hostPath)": "null"}}],
        },
    }])
    # Debug containers are outside this base: reject the subresource explicitly,
    # since matching Pod alone does not necessarily cover its subresources.
    runtime["spec"]["rules"].append({
        "name": "no-ephemeral-debug-containers",
        "match": {"any": [{"resources": {
            "kinds": ["Pod/ephemeralcontainers"], "namespaces": ["tfm-golden"],
            "operations": ["CREATE", "UPDATE"],
        }}]},
        "preconditions": {"all": [{
            "key": "{{ request.subResource || '' }}", "operator": "Equals", "value": "ephemeralcontainers",
        }]},
        "validate": {"message": "EPHEMERAL: debug containers are not permitted in the protected laboratory namespace", "deny": {}},
    })

    def verifier():
        result = {
            "type": "SigstoreBundle", "imageReferences": [image_repository + "@sha256:*"],
            "mutateDigest": False, "verifyDigest": True, "required": True,
        }
        if config.get("registry_secret"):
            result["imageRegistryCredentials"] = {"secrets": [config["registry_secret"]]}
        return result

    def attestation_policy(name, rule, predicate_type, conditions=()):
        check = verifier()
        descriptor = {"type": predicate_type, "attestors": copy.deepcopy(attestors)}
        if conditions:
            descriptor["conditions"] = [{"all": conditions}]
        check["attestations"] = [descriptor]
        return policy(name, [{"name": rule, "match": match_resources(), "verifyImages": [check]}])

    # Generic bundle signature verification can accept any signed predicate for
    # the digest. Require Cosign's own image-signing statement independently so
    # SBOM, provenance or results alone cannot satisfy the F07 barrier.
    signature = attestation_policy("tfm-signature", "require-image-signature", SIGNATURE_TYPE)
    sbom = attestation_policy("tfm-sbom", "require-sbom", SBOM_TYPE, [
        condition("bomFormat", "CycloneDX"), condition("specVersion", config["sbom_version"]),
    ])
    provenance = attestation_policy("tfm-provenance", "require-provenance", PROVENANCE_TYPE, [
        condition("buildDefinition.buildType", "https://actions.github.io/buildtypes/workflow/v1"
                  if config["mode"] == "github" else "https://tfm-goldenpath.dev/buildtypes/local/v1", "PROVENANCE_BUILD_TYPE"),
        condition("buildDefinition.externalParameters.workflow.repository", config["repository"], "PROVENANCE_REPOSITORY"),
        condition("buildDefinition.resolvedDependencies[0].digest.gitCommit", config["commit"], "PROVENANCE_REVISION"),
        condition("runDetails.builder.id", config["identity"] if config["mode"] == "github"
                  else "https://tfm-goldenpath.dev/builders/local-development", "PROVENANCE_BUILDER"),
    ])
    results = attestation_policy("tfm-results", "require-results", RESULTS_TYPE, [
        condition("policyVersion", "golden-path-v1", "RESULTS_POLICY_VERSION"),
        condition("source.repository", config["repository"]), condition("source.commit", config["commit"]),
        condition("result", "PASS"), *[condition("checks." + check, "PASS") for check in CHECKS],
    ])
    return {"apiVersion": "v1", "kind": "List", "items": [runtime, signature, sbom, provenance, results]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=["local", "github"], required=True)
    parser.add_argument("--repository", required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--image-repository", required=True)
    parser.add_argument("--sbom-version", required=True)
    parser.add_argument("--public-key", type=Path)
    parser.add_argument("--identity")
    parser.add_argument("--policy-version", default="golden-path-v1")
    parser.add_argument("--registry-secret")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if args.mode == "local" and not args.public_key:
        parser.error("--public-key is required in local mode")
    if args.mode == "github" and not args.identity:
        parser.error("--identity is required in github mode")
    config = vars(args).copy()
    config["public_key"] = args.public_key.read_text(encoding="utf-8") if args.public_key else ""
    try:
        rendered = render(config)
    except ValueError as error:
        parser.error(str(error))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(rendered, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
