#!/usr/bin/env bash
set -euo pipefail

root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
lock=${TOOLS_LOCK_FILE:-$root/tools.lock.json}
prefix=${PREFIX:-/usr/local}
platform_tools=0
case ${1:-} in
  '') [[ $# == 0 ]] || { echo 'Invalid arguments.' >&2; exit 2; } ;;
  --with-platform-tools) [[ $# == 1 ]] || exit 2; platform_tools=1 ;;
  *) echo 'Usage: [PREFIX=/path] bash scripts/install-security-tools.sh [--with-platform-tools]' >&2; exit 2 ;;
esac
[[ "$(uname -s)/$(uname -m)" == Linux/x86_64 ]] || { echo 'Linux AMD64 is required.' >&2; exit 1; }
[[ "$prefix" == /* && "$prefix" != / ]] || { echo 'PREFIX must be an absolute path other than /.' >&2; exit 2; }
for tool in curl jq sha256sum tar install; do
  command -v "$tool" >/dev/null || { echo "Missing required base tool $tool." >&2; exit 1; }
done
jq -e '.schemaVersion == 1 and .platform == "linux/amd64" and (.tools | type == "object" and length > 0)' "$lock" >/dev/null
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
install -d "$prefix/bin"

download() {
  local url=$1 checksum=$2 destination=$3
  [[ "$url" == https://* && "$checksum" =~ ^[a-f0-9]{64}$ ]] || { echo 'Invalid URL or SHA-256 in the lock file.' >&2; exit 1; }
  curl --fail --show-error --silent --location --proto '=https' --proto-redir '=https' \
    --retry 3 --connect-timeout 20 --max-time 300 "$url" -o "$destination"
  printf '%s  %s\n' "$checksum" "$destination" | sha256sum --check --status || {
    echo "Downloaded SHA-256 does not match: $url" >&2; exit 1;
  }
}

while IFS=$'\t' read -r name version url checksum archive member; do
  [[ "$name" =~ ^[a-z][a-z0-9-]*$ && "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
    echo 'Invalid name or version in the lock file.' >&2; exit 1;
  }
  target="$work/$name"
  install -d "$target"
  download "$url" "$checksum" "$target/download"
  case "$archive" in
    binary) binary="$target/download" ;;
    tar.gz)
      [[ "$member" =~ ^[a-zA-Z0-9_-]+(/[a-zA-Z0-9_-]+)*$ ]] || { echo 'Invalid archive member.' >&2; exit 1; }
      tar --extract --gzip --file "$target/download" --directory "$target" --no-same-owner "$member"
      binary="$target/$member"
      [[ -f "$binary" && ! -L "$binary" ]] || { echo 'The archive member must be a regular file.' >&2; exit 1; }
      ;;
    *) echo "Unsupported download format: $archive" >&2; exit 1 ;;
  esac
  install -m 0755 "$binary" "$prefix/bin/$name"
  printf 'Installed %s %s in %s/bin (SHA-256 verified).\n' "$name" "$version" "$prefix"
done < <(jq -r '.tools | to_entries[] | [.key, .value.version, .value.url, .value.sha256, .value.archive, .value.member] | @tsv' "$lock")

if [[ "$platform_tools" == 1 ]]; then
  source "$root/versions.env"
  download "https://github.com/kubernetes-sigs/kind/releases/download/v${KIND_VERSION}/kind-linux-amd64" "$KIND_SHA256" "$work/kind"
  install -m 0755 "$work/kind" "$prefix/bin/kind"
  download "https://dl.k8s.io/release/v${KUBERNETES_VERSION}/bin/linux/amd64/kubectl" "$KUBECTL_SHA256" "$work/kubectl"
  install -m 0755 "$work/kubectl" "$prefix/bin/kubectl"
  if [[ "$prefix" == /usr/local ]]; then
    plugin_dir=/usr/local/lib/docker/cli-plugins
  else
    plugin_dir="${DOCKER_CONFIG:-$HOME/.docker}/cli-plugins"
  fi
  install -d "$plugin_dir"
  download "https://github.com/docker/buildx/releases/download/v${BUILDX_VERSION}/buildx-v${BUILDX_VERSION}.linux-amd64" "$BUILDX_SHA256" "$work/buildx"
  install -m 0755 "$work/buildx" "$plugin_dir/docker-buildx"
  printf 'Installed kind %s, kubectl %s and Buildx %s from versions.env.\n' "$KIND_VERSION" "$KUBERNETES_VERSION" "$BUILDX_VERSION"
fi
printf 'Tools ready. Ensure that %s/bin is on PATH.\n' "$prefix"
