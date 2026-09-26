#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
source "$root/versions.env"
mode=${1:-}
[[ $# -le 1 && ( -z "$mode" || "$mode" == --tools-only ) ]] || {
  echo 'Usage: bash scripts/check-environment.sh [--tools-only]' >&2; exit 2;
}
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
[[ "$(uname -s)/$(uname -m)" == Linux/x86_64 ]] || fail 'This environment requires Linux AMD64.'
for tool in node npm docker dockerd kind kubectl git curl jq make sha256sum python3 trivy conftest cosign helm kyverno act; do
  command -v "$tool" >/dev/null || fail "Missing $tool; rebuild the devcontainer."
done
check() { [[ "$2" == "$3" ]] || fail "$1: expected $3, found $2. Rebuild the environment."; }
check Node "$(node --version)" "v$NODE_VERSION"
check npm "$(npm --version)" "$NPM_VERSION"
check kind "$(kind version | awk '{print $2}')" "v$KIND_VERSION"
check kubectl "$(kubectl version --client=true --output=json | jq -r .clientVersion.gitVersion)" "v$KUBERNETES_VERSION"
check Docker-CLI "$(docker --version | awk '{gsub(/,/, "", $3); print $3}')" "$DOCKER_VERSION"
check dockerd "$(dockerd --version | awk '{gsub(/,/, "", $3); print $3}')" "$DOCKER_VERSION"
check Buildx "$(docker buildx version | awk '{print $2}')" "v$BUILDX_VERSION"
python3 "$root/scripts/check-tool-versions.py"
node --test "$root/tests/environment/probe.test.mjs" "$root/tests/environment/config.test.mjs"
printf 'Tools: Node %s, npm %s, Docker %s, Buildx %s, kind %s, kubectl %s\n' \
  "$NODE_VERSION" "$NPM_VERSION" "$DOCKER_VERSION" "$BUILDX_VERSION" "$KIND_VERSION" "$KUBERNETES_VERSION"
git --version
curl --version | head -n 1
jq --version
if [[ "$mode" == --tools-only ]]; then
  echo 'PASS tools. Run make smoke-env to check the engine and cluster.'
  exit 0
fi
docker info >/dev/null 2>&1 || fail 'The Docker engine is not responding. Reopen the devcontainer or check its internal Docker service.'
check Docker-server "$(docker version --format '{{.Server.Version}}')" "$DOCKER_VERSION"
check Docker-platform "$(docker info --format '{{.OSType}}/{{.Architecture}}')" linux/x86_64
echo 'PASS diagnostics. Run make smoke-env to build and test in Kubernetes.'
