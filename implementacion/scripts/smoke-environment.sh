#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
source "$root/versions.env"
[[ $# == 0 ]] || { echo 'Usage: bash scripts/smoke-environment.sh' >&2; exit 2; }
mkdir -p "$root/evidence/environment"
run=$(mktemp -d "$root/evidence/environment/run-XXXXXXXX")
exec > >(tee "$run/run.log") 2>&1
cluster="tfm-env-$(basename "$run" | tr '[:upper:]' '[:lower:]')"
image="tfm-env-probe:${cluster}"
kubeconfig="$run/kubeconfig"
created=0
image_built=0
cleanup() {
  result=$?
  trap - EXIT
  set +e
  if [[ $created == 1 ]]; then
    if [[ $result != 0 ]]; then
      kind export logs "$run/cluster-logs" --name "$cluster"
    fi
    kind delete cluster --name "$cluster"
    cleanup_result=$?
    if [[ $cleanup_result != 0 ]]; then
      echo "Could not delete temporary cluster $cluster; its kubeconfig remains at $kubeconfig."
      result=1
    else
      rm -f -- "$kubeconfig"
    fi
  else
    rm -f -- "$kubeconfig"
  fi
  if [[ $image_built == 1 ]]; then
    docker image rm "$image" || { echo "Could not delete temporary image tag $image."; result=1; }
  fi
  if [[ $result == 0 ]]; then status=PASS; else status=FAIL; fi
  printf '{"check":"environment-smoke","status":"%s","exitCode":%s,"cluster":"%s"}\n' \
    "$status" "$result" "$cluster" > "$run/result.json"
  echo "$status: evidence at $run"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
cp "$root/versions.env" "$run/versions.env"
bash "$root/scripts/check-environment.sh"
docker version --format '{{json .}}' > "$run/docker-version.json"
dpkg-query -W > "$run/os-packages.txt"
docker buildx build --load --platform linux/amd64 --provenance=false \
  --build-arg "NODE_IMAGE=$NODE_IMAGE" --tag "$image" "$root/tests/environment"
image_built=1
docker image inspect "$image" > "$run/image.json"
docker run --rm --network none "$image" > "$run/container.json"
jq -e --arg node "v$NODE_VERSION" \
  '.check == "environment-smoke" and .ok == true and .platform == "linux" and .arch == "x64" and .node == $node' \
  "$run/container.json"

kind get clusters > "$run/existing-clusters.txt"
if grep -Fxq "$cluster" "$run/existing-clusters.txt"; then
  echo 'The temporary name already exists; it will not be modified.' >&2; exit 1
fi
created=1
kind create cluster --name "$cluster" --image "$KIND_NODE_IMAGE" --kubeconfig "$kubeconfig" --wait 180s
k() { kubectl --kubeconfig "$kubeconfig" --context "kind-$cluster" --request-timeout=30s "$@"; }
k wait --for=condition=Ready nodes --all --timeout=120s
k get nodes -o json > "$run/nodes.json"
jq -e --arg version "v$KUBERNETES_VERSION" \
  '(.items | length) > 0 and all(.items[]; .status.nodeInfo.kubeletVersion == $version and .status.nodeInfo.architecture == "amd64")' \
  "$run/nodes.json"
kind load docker-image "$image" --name "$cluster"
k create namespace tfm-environment
for revision in initial updated; do
  k -n tfm-environment create configmap environment-probe --from-literal="revision=$revision" --dry-run=client -o yaml | k apply -f -
done
[[ "$(k -n tfm-environment get configmap environment-probe -o jsonpath='{.data.revision}')" == updated ]]
cat <<EOF | k apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: environment-probe
  namespace: tfm-environment
spec:
  backoffLimit: 0
  activeDeadlineSeconds: 120
  template:
    spec:
      restartPolicy: Never
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: probe
          image: ${image}
          imagePullPolicy: Never
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: [ALL]
          resources:
            requests: {cpu: 50m, memory: 32Mi}
            limits: {cpu: 250m, memory: 128Mi}
EOF
k -n tfm-environment wait --for=condition=complete job/environment-probe --timeout=150s
k -n tfm-environment logs job/environment-probe > "$run/kubernetes.json"
jq -e --arg node "v$NODE_VERSION" \
  '.check == "environment-smoke" and .ok == true and .node == $node and .platform == "linux" and .arch == "x64"' \
  "$run/kubernetes.json"
k -n tfm-environment get pods -o json > "$run/pods.json"
echo 'Verified image build, Docker execution, Ready node, ConfigMap creation/update and completed Job.'
