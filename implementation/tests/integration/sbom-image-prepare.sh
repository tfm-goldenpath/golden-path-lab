#!/usr/bin/env bash
# Opt-in experiment preparation; exports locally and never publishes an image.
set -Eeuo pipefail
repo=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)
cd "$repo"
out=$(realpath -m -- "${1:?usage: sbom-image-prepare.sh NEW_EVIDENCE_DIRECTORY}")
[[ ! -e "$out" ]] || { echo 'Evidence destination must be fresh' >&2; exit 2; }
python3 - "$out" <<'PY'
import os,sys
from pathlib import Path
p=Path(sys.argv[1]);parent=p.parent
while not parent.exists():parent=parent.parent
for path in [parent,Path('/var/lib/docker'),Path('/tmp')]:
 s=os.statvfs(path)
 if s.f_bavail*s.f_frsize<8*1024**3:raise SystemExit('Need 3 GiB reserve plus 5 GiB growth on each used filesystem')
for path in [parent,*parent.parents]:
 if path.is_symlink():raise SystemExit('Unsafe evidence path')
PY
mkdir -p "$out/tools"
state_dir=$out
source src/lib/delivery.sh
version=1.57.1
release=https://github.com/anchore/syft/releases/download/v${version}
for name in syft_${version}_checksums.txt syft_${version}_checksums.txt.sigstore.json syft_${version}_linux_amd64.tar.gz; do
  delivery_analysis_command "download-$name" curl --fail --location --max-time 180 --max-filesize 100000000 "$release/$name" -o "$out/tools/$name"
done
delivery_analysis_command verify-syft cosign verify-blob "$out/tools/syft_${version}_checksums.txt" --bundle "$out/tools/syft_${version}_checksums.txt.sigstore.json" --certificate-identity https://github.com/anchore/syft/.github/workflows/release.yaml@refs/heads/main --certificate-oidc-issuer https://token.actions.githubusercontent.com
python3 - "$out/tools" <<'PY'
import hashlib,json,sys,tarfile
from pathlib import Path
p=Path(sys.argv[1]);lock=json.loads(Path('implementation/tests/integration/sbom-image-tools.json').read_text())['syft'];name='syft_1.57.1_linux_amd64.tar.gz'
expected=[line.split()[0] for line in (p/'syft_1.57.1_checksums.txt').read_text().splitlines() if line.split()[-1]==name]
if expected!=[lock['sha256']] or hashlib.sha256((p/name).read_bytes()).hexdigest()!=lock['sha256']:raise SystemExit('Syft checksum mismatch')
with tarfile.open(p/name) as t:
 members=[m for m in t if m.name=='syft']
 if len(members)!=1 or not members[0].isfile() or members[0].size>300000000:raise SystemExit('Unsafe binary member')
 with (p/'syft').open('xb') as f:f.write(t.extractfile(members[0]).read())
(p/'syft').chmod(0o755)
PY
engine_sha=$(git rev-parse HEAD)
bash bin/deliver init "$out/consumer" --repository https://example.invalid/sbom-spike/node --engine-commit "$engine_sha"
# Use the existing pinned Debian development base for this experimental consumer only.
source implementation/versions.env
python3 - "$out/consumer/service/Dockerfile" "$NODE_IMAGE" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]);lines=p.read_text().splitlines();lines[0]='ARG NODE_IMAGE='+sys.argv[2];p.write_text('\n'.join(lines)+'\n')
PY
git -C "$out/consumer" init
git -C "$out/consumer" add .
git -C "$out/consumer" -c user.name='SBOM experiment' -c user.email=sbom@example.invalid commit -m 'Capture independent Debian Node experiment'
consumer_sha=$(git -C "$out/consumer" rev-parse HEAD)
git -C "$out/consumer" bundle create "$out/consumer.bundle" --all
node src/capture-build-inputs.mjs "$out/consumer/service" "$NODE_IMAGE" "$consumer_sha" '' '' consumer-v1 "$out/consumer" > "$out/build-inputs.json"
df -B1 "$out" /var/lib/docker /tmp > "$out/pre-build-space.txt"
delivery_analysis_command build timeout 900 docker buildx build --platform linux/amd64 --provenance=false --sbom=false --build-arg "BUILD_COMMIT=$consumer_sha" --label "tfm.sbom-spike=$consumer_sha" --metadata-file "$out/build-metadata.json" --output "type=docker,dest=$out/image-docker.tar" "$out/consumer/service"
df -B1 "$out" /var/lib/docker /tmp > "$out/post-build-space.txt"
python3 implementation/tests/integration/sbom-image-run.py "$out/image-docker.tar" "$out/node" "$out/tools/syft"
