FROM node:24.21.0-bookworm@sha256:b977d0f785d96029d8d4c0790b6bf1c2a4c72e0f26319808e7ba2e9d966a1ac3

USER root
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
COPY .devcontainer/debian.sources /etc/apt/sources.list.d/debian.sources
RUN test "$(dpkg --print-architecture)" = amd64 \
    && apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl git jq make openssl python3 sudo \
    && rm -rf /var/lib/apt/lists/* \
    && printf 'node ALL=(root) NOPASSWD:ALL\n' > /etc/sudoers.d/node \
    && chmod 0440 /etc/sudoers.d/node

COPY versions.env /usr/local/share/golden-path/versions.env
COPY .devcontainer/install-tools.sh /usr/local/share/golden-path/install-tools.sh
RUN bash /usr/local/share/golden-path/install-tools.sh
COPY tools.lock.json /usr/local/share/golden-path/tools.lock.json
COPY scripts/install-security-tools.sh /usr/local/share/golden-path/install-security-tools.sh
RUN TOOLS_LOCK_FILE=/usr/local/share/golden-path/tools.lock.json \
    bash /usr/local/share/golden-path/install-security-tools.sh
