#!/usr/bin/env bash
# Real Conftest execution against a labelled synthetic manifest; no cluster.
set -Eeuo pipefail
repo=$(git rev-parse --show-toplevel)
root="$repo/implementacion"
export PATH="$root/.tools/bin:$PATH"
cd "$root"
for tool in node jq conftest mktemp; do command -v "$tool" >/dev/null; done
mkdir -p .tmp
out=$(mktemp -d "$root/.tmp/defense-f11-static-XXXXXXXX")
printf 'STATIC F11 ONLY — synthetic manifest; no image build, signing or Kubernetes admission.\n'
printf 'Evidence: %s\n' "$out"
# A placeholder is sufficient to exercise the manifest policy; it is never pulled.
image="example.invalid/quotes-node@sha256:$(printf '%064d' 0)"
node scripts/lab-contracts.mjs manifest "$image" tfm-golden "$out/valid.json" local
jq '.spec.template.spec.containers[0].securityContext |= (.privileged=true | .allowPrivilegeEscalation=true)' \
  "$out/valid.json" > "$out/F11.json"
conftest test --policy policies/conftest --namespace manifests --output json \
  "$out/valid.json" > "$out/valid-result.json"
status=0
conftest test --policy policies/conftest --namespace manifests --output json \
  "$out/F11.json" > "$out/negative-result.json" 2> "$out/negative-stderr.log" || status=$?
node tests/scenarios/runtime-evidence.mjs early "$status" "$out/negative-result.json" \
  "$out/negative-stderr.log" "$out/F11.json" F11 > "$out/attribution.json"
printf '\n1. Correct configuration: ACCEPTED by Conftest\n'
printf '2. Privileged configuration: EXPECTED REJECTION\n'
jq -r '.[].failures[]?.msg' "$out/negative-result.json"
printf '\nNo F13 or Kubernetes claim is made by this static demonstration.\n'
