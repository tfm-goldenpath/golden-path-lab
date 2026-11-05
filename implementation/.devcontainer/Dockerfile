FROM node:24.22.1-bookworm@sha256:f9b3548b20b15b705b66aeecaeac7dd690c73d5e4661357aac02e60e3d38c88a

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
COPY .devcontainer/codex/package.json /opt/codex/package.json
COPY .devcontainer/codex/package-lock.json /opt/codex/package-lock.json
RUN bash /usr/local/share/golden-path/install-tools.sh
COPY tools.lock.json /usr/local/share/golden-path/tools.lock.json
COPY scripts/install-security-tools.sh /usr/local/share/golden-path/install-security-tools.sh
RUN TOOLS_LOCK_FILE=/usr/local/share/golden-path/tools.lock.json \
    bash /usr/local/share/golden-path/install-security-tools.sh

# No credentials or model requests: verify the optional CLI as the remote user.
USER node
RUN env -i HOME=/home/node PATH=/usr/local/bin:/usr/bin:/bin codex --version \
    && env -i HOME=/home/node PATH=/usr/local/bin:/usr/bin:/bin codex --help >/dev/null
USER root
