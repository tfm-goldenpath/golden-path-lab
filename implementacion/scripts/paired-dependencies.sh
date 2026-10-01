#!/usr/bin/env bash
# Same hosted tool installation as lane B; setup is excluded from delivery time.
set -Eeuo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
source versions.env
[[ "$(node --version)" == "v$NODE_VERSION" && "$(npm --version)" == "$NPM_VERSION" ]]
npm ci --prefix tooling --ignore-scripts --no-audit --no-fund
sudo env PREFIX=/usr/local bash scripts/install-security-tools.sh --with-platform-tools
python3 scripts/check-tool-versions.py
[[ "$(kind version | awk '{print $2}')" == "v$KIND_VERSION" ]]
[[ "$(kubectl version --client=true -o json | jq -r .clientVersion.gitVersion)" == "v$KUBERNETES_VERSION" ]]
[[ "$(docker buildx version | awk '{print $2}')" == "v$BUILDX_VERSION" ]]
docker info > /dev/null
printf '%s' "$GH_TOKEN" | docker --config "$HOME/.docker" login ghcr.io --username "$GITHUB_ACTOR" --password-stdin
