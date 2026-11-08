#!/usr/bin/env bash
# One request never exceeds its remaining per-tool/installer budget. No ambient
# curl config, netrc or tokens: these are public assets. Never log redirect URLs
# or raw curl diagnostics, which can contain signed URLs or credentials.
fetch_download() {
  local route=$1 url=$2 destination=$3 accept=$4 cap=$5
  local attempt remaining limit partial metrics status http elapsed
  download_transient=0
  for attempt in 1 2; do
    remaining=$((deadline-SECONDS))
    if (( remaining <= 0 )); then
      printf 'Download tool=%s version=%s route=%s http=000 exit=28 elapsed=%ss: budget exhausted\n' "$tool" "$version" "$route" "$((SECONDS-started))" >&2
      return 28
    fi
    limit=$cap; (( limit <= remaining )) || limit=$remaining
    partial=$(mktemp "${destination}.part.XXXXXXXX") || return 1
    status=0
    metrics=$(curl -q --silent --fail --location --no-netrc --disallow-username-in-url \
      --proto '=https' --proto-redir '=https' --max-redirs 5 \
      --connect-timeout 10 --max-time "$limit" --header "Accept: $accept" \
      --output "$partial" --write-out '%{http_code} %{time_total}' "$url" 2>/dev/null) || status=$?
    read -r http elapsed <<< "$metrics" || true
    [[ "$http" =~ ^[0-9]{3}$ ]] || http=000
    [[ "$elapsed" =~ ^[0-9]+([.][0-9]+)?$ ]] || elapsed=unknown
    printf 'Download tool=%s version=%s route=%s attempt=%s http=%s exit=%s elapsed=%ss\n' \
      "$tool" "$version" "$route" "$attempt" "$http" "$status" "$elapsed" >&2
    if [[ "$status" == 0 && "$http" == 200 ]]; then
      mv -- "$partial" "$destination" || return 1
      return 0
    fi
    rm -f -- "$partial" || return 1
    download_transient=0
    if [[ "$status" == 22 || "$status" == 0 ]]; then
      case "$http" in 408|425|429|500|502|503|504) download_transient=1 ;; esac
      [[ "$status" != 0 ]] || status=22
    else
      case "$status" in 6|7|18|28|35|52|55|56|92) download_transient=1 ;; esac
    fi
    [[ "$download_transient" == 1 ]] || return "$status"
  done
  return "$status"
}

download() {
  local tool=$1 version=$2 url=$3 checksum=$4 destination=$5
  local started=$SECONDS deadline=$((SECONDS+120)) download_transient=0 status=0
  local owner repository tag asset metadata asset_id api
  if (( install_download_deadline < deadline )); then deadline=$install_download_deadline; fi
  [[ "$url" == https://* && "$checksum" =~ ^[a-f0-9]{64}$ ]] || { echo 'Invalid URL or SHA-256 in the lock file.' >&2; return 2; }
  if fetch_download primary "$url" "$destination" application/octet-stream 20; then
    :
  else
    status=$?
    [[ "$download_transient" == 1 ]] || return "$status"
    # Only exact GitHub release URLs with unreserved path components qualify.
    # Non-GitHub URLs retain their primary route; never guess mirrors or tags.
    if [[ ! "$url" =~ ^https://github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)/releases/download/([A-Za-z0-9_.+-]+)/([A-Za-z0-9_.+-]+)$ ]]; then
      return "$status"
    fi
    owner=${BASH_REMATCH[1]}; repository=${BASH_REMATCH[2]}; tag=${BASH_REMATCH[3]}; asset=${BASH_REMATCH[4]}
    api="https://api.github.com/repos/$owner/$repository/releases"
    metadata="${destination}.metadata"
    fetch_download api-metadata "$api/tags/$tag" "$metadata" application/vnd.github+json 15 || return $?
    # Metadata locates a single uploaded asset; it never supplies the trusted hash.
    asset_id=$(jq -er --arg tag "$tag" --arg name "$asset" --arg url "$url" --arg api "$api" \
      --arg release "https://github.com/$owner/$repository/releases/tag/$tag" '
      select(type=="object" and .tag_name==$tag and .html_url==$release and (.assets|type)=="array") |
      [.assets[] | select(.name==$name)] | select(length==1) | .[0] |
      select(.state=="uploaded" and (.size|type)=="number" and .size>0 and .size==(.size|floor) and
        (.id|type)=="number" and .id>0 and .id<9007199254740991 and .id==(.id|floor) and
        .url==($api+"/assets/"+(.id|tostring)) and .browser_download_url==$url) | .id
      ' "$metadata" 2>/dev/null) || { printf 'Download tool=%s version=%s route=api-metadata: invalid asset metadata\n' "$tool" "$version" >&2; return 65; }
    [[ "$asset_id" =~ ^[0-9]+$ ]] || { printf 'Download tool=%s version=%s route=api-metadata: invalid asset metadata\n' "$tool" "$version" >&2; return 65; }
    fetch_download api-asset "$api/assets/$asset_id" "$destination" application/octet-stream 45 || return $?
  fi
  if ! printf '%s  %s\n' "$checksum" "$destination" | sha256sum --check --status; then
    printf 'Download tool=%s version=%s: checksum mismatch; refusing installation\n' "$tool" "$version" >&2
    rm -f -- "$destination" || return 1
    return 65
  fi
}

install_security_tools() (
set -euo pipefail
entry_file=$(realpath -e -- "${BASH_SOURCE[0]}") || return 1
root=$(cd -- "$(dirname -- "$entry_file")/.." && pwd -P) || return 1
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
jq -e '.schemaVersion == 1 and .platform == "linux/amd64" and (.tools | type == "object" and length > 0)' "$lock" >/dev/null || return 1
work=$(mktemp -d) || return 1
trap 'rm -rf -- "$work"' EXIT
install -d "$prefix/bin" || return 1
local install_download_deadline=$((SECONDS+300))
jq -r '.tools | to_entries[] | [.key, .value.version, .value.url, .value.sha256, .value.archive, .value.member] | @tsv' "$lock" > "$work/tools.tsv" || return 1

while IFS=$'\t' read -r name version url checksum archive member; do
  [[ "$name" =~ ^[a-z][a-z0-9-]*$ && "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
    echo 'Invalid name or version in the lock file.' >&2; exit 1;
  }
  target="$work/$name"
  install -d "$target" || return 1
  download "$name" "$version" "$url" "$checksum" "$target/download" || return $?
  case "$archive" in
    binary) binary="$target/download" ;;
    tar.gz)
      [[ "$member" =~ ^[a-zA-Z0-9_-]+(/[a-zA-Z0-9_-]+)*$ ]] || { echo 'Invalid archive member.' >&2; exit 1; }
      tar --extract --gzip --file "$target/download" --directory "$target" --no-same-owner "$member" || return $?
      binary="$target/$member"
      [[ -f "$binary" && ! -L "$binary" ]] || { echo 'The archive member must be a regular file.' >&2; exit 1; }
      ;;
    *) echo "Unsupported download format: $archive" >&2; exit 1 ;;
  esac
  install -m 0755 "$binary" "$prefix/bin/$name" || return $?
  printf 'Installed %s %s in %s/bin (SHA-256 verified).\n' "$name" "$version" "$prefix"
done < "$work/tools.tsv"

if [[ "$platform_tools" == 1 ]]; then
  source "$root/versions.env" || return $?
  download kind "$KIND_VERSION" "https://github.com/kubernetes-sigs/kind/releases/download/v${KIND_VERSION}/kind-linux-amd64" "$KIND_SHA256" "$work/kind" || return $?
  install -m 0755 "$work/kind" "$prefix/bin/kind" || return $?
  download kubectl "$KUBERNETES_VERSION" "https://dl.k8s.io/release/v${KUBERNETES_VERSION}/bin/linux/amd64/kubectl" "$KUBECTL_SHA256" "$work/kubectl" || return $?
  install -m 0755 "$work/kubectl" "$prefix/bin/kubectl" || return $?
  if [[ "$prefix" == /usr/local ]]; then
    plugin_dir=/usr/local/lib/docker/cli-plugins
  else
    plugin_dir="${DOCKER_CONFIG:-$HOME/.docker}/cli-plugins"
  fi
  install -d "$plugin_dir" || return $?
  download buildx "$BUILDX_VERSION" "https://github.com/docker/buildx/releases/download/v${BUILDX_VERSION}/buildx-v${BUILDX_VERSION}.linux-amd64" "$BUILDX_SHA256" "$work/buildx" || return $?
  install -m 0755 "$work/buildx" "$plugin_dir/docker-buildx" || return $?
  printf 'Installed kind %s, kubectl %s and Buildx %s from versions.env.\n' "$KIND_VERSION" "$KUBERNETES_VERSION" "$BUILDX_VERSION"
fi
printf 'Tools ready. Ensure that %s/bin is on PATH.\n' "$prefix"
)

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then install_security_tools "$@"; fi
