#!/usr/bin/env bash
set -euo pipefail
source /usr/local/share/golden-path/versions.env
[[ "$(uname -m)" == x86_64 ]] || { echo 'Linux AMD64 is required.' >&2; exit 1; }
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT

download() {
  local url=$1 checksum=$2 output=$3
  curl --fail --show-error --silent --location --retry 3 --connect-timeout 20 --max-time 300 \
    "$url" -o "$work/tool"
  printf '%s  %s\n' "$checksum" "$work/tool" | sha256sum --check --status
  install -m 0755 "$work/tool" "$output"
}

download "https://github.com/kubernetes-sigs/kind/releases/download/v${KIND_VERSION}/kind-linux-amd64" \
  "$KIND_SHA256" /usr/local/bin/kind
download "https://dl.k8s.io/release/v${KUBERNETES_VERSION}/bin/linux/amd64/kubectl" \
  "$KUBECTL_SHA256" /usr/local/bin/kubectl
install -d /usr/local/lib/docker/cli-plugins
download "https://github.com/docker/buildx/releases/download/v${BUILDX_VERSION}/buildx-v${BUILDX_VERSION}.linux-amd64" \
  "$BUILDX_SHA256" /usr/local/lib/docker/cli-plugins/docker-buildx
[[ "$(node --version)" == "v${NODE_VERSION}" ]]
[[ "$(npm --version)" == "$NPM_VERSION" ]]
kind version
kubectl version --client=true --output=json
