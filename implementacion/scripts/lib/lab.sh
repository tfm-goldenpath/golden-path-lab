#!/usr/bin/env bash
# Ephemeral infrastructure, admission and resource cleanup.
# Sourced by demo.sh; definitions only. See docs/EN/architecture.md.

k() { kubectl --request-timeout=60s --kubeconfig "$private/kubeconfig" --context "kind-$cluster" "$@"; }
actor() { local ns=$1; shift; k --as="system:serviceaccount:$ns:deployer" "$@"; }
capture_diagnostic() {
  local destination=$1 temporary status=0
  shift
  if [[ -L "$destination" || ( -e "$destination" && ! -f "$destination" ) ]]; then
    printf 'ERROR: refusing unsafe diagnostic output: %s\n' "$destination" >&2
    return 1
  fi
  temporary=$(mktemp -d "$state_dir/.diagnostic-XXXXXXXX") || return 1
  "$@" > "$temporary/output" 2>&1 || true
  mv -fT -- "$temporary/output" "$destination" || status=1
  rm -f -- "$temporary/output" || status=1
  rmdir -- "$temporary" || status=1
  return "$status"
}
cleanup() {
  local package_status=0 marker temporary_marker
  marker="$state_dir/.evidence-packaged"
  [[ -z "$port_pid" ]] || { kill "$port_pid" 2>/dev/null || true; wait "$port_pid" 2>/dev/null || true; }
  if [[ -n "$state_dir" && -d "$state_dir" ]] && [[ -L "$marker" || ( -e "$marker" && ! -f "$marker" ) ]]; then
    printf 'ERROR: refusing unsafe evidence marker: %s\n' "$marker" >&2
    package_status=1
  elif [[ -n "$state_dir" && -d "$state_dir" && ! -e "$marker" ]]; then
    if [[ "$mode" == local && -n "$registry" ]]; then
      capture_diagnostic "$state_dir/registry.log" docker logs --tail 100 "$registry" || package_status=1
    fi
    if [[ -n "$private" && -f "$private/kubeconfig" ]]; then
      capture_diagnostic "$state_dir/cluster-pods.txt" k get pods -A -o wide || package_status=1
      capture_diagnostic "$state_dir/cluster-events.txt" k get events -A --sort-by=.lastTimestamp || package_status=1
      lab_capture_admission_diagnostics || package_status=1
    fi
    local status=FAIL
    [[ -f "$state_dir/result.json" ]] && status=$(jq -r '.status' "$state_dir/result.json")
    if [[ "$package_status" == 0 ]] && python3 scripts/package-evidence.py "$state_dir" "$root/evidence/packages" "$status"; then
      if temporary_marker=$(mktemp "$state_dir/.evidence-marker-XXXXXXXX"); then
        ln -T -- "$temporary_marker" "$marker" || package_status=1
        rm -f -- "$temporary_marker" || package_status=1
      else
        package_status=1
      fi
    else
      package_status=1
    fi
  fi
  [[ -z "$builder" ]] || docker buildx rm "$builder" >/dev/null 2>&1 || true
  [[ -z "$cluster" ]] || kind delete cluster --name "$cluster" >/dev/null 2>&1 || true
  [[ "$mode" != local || -z "$registry" ]] || docker rm -f "$registry" >/dev/null 2>&1 || true
  if [[ -n "$private" && "$(dirname "$private")" == "$root/.tmp" && "$(basename "$private")" =~ ^private-[A-Za-z0-9]+$ && -d "$private" ]]; then
    rm -rf -- "$private"
  fi
  [[ "$package_status" == 0 ]] || printf 'ERROR: could not retain the evidence package.\n' >&2
  return "$package_status"
}
lab_check_environment() {
  local tool
  for tool in node python3 docker kind kubectl jq curl helm cosign trivy conftest tar sha256sum; do need "$tool"; done
  [[ "$(uname -s)/$(uname -m)" == Linux/x86_64 ]] || fail 'Run the lab inside the Linux AMD64 devcontainer.'
  docker info >/dev/null
}

lab_create() {
  local registry_host kind_node attempt; local -a kind_args=()
  record 'Create an isolated kind cluster'
  if [[ "$(docker info --format '{{.CgroupVersion}}')" == 1 ]]; then
    [[ "${GP_CGROUP_V1_COMPAT:-0}" == 1 ]] || fail 'This engine uses cgroup v1. Use the devcontainer on a cgroup v2 host; see the compatibility troubleshooting guide.'
    jq -n '{kind:"Cluster",apiVersion:"kind.x-k8s.io/v1alpha4",kubeadmConfigPatches:["kind: KubeletConfiguration\napiVersion: kubelet.config.k8s.io/v1beta1\nfailCgroupV1: false"]}' > "$state_dir/kind-compatibility.json"
    kind_args+=(--config "$state_dir/kind-compatibility.json")
    record 'Explicit cgroup v1 compatibility: this is not the campaign environment'
  fi
  kind create cluster --name "$cluster" --image "$KIND_NODE_IMAGE" --kubeconfig "$private/kubeconfig" --wait 180s "${kind_args[@]}"
  if [[ "$mode" == local ]]; then
    printf '{"distSpecVersion":"1.1.1","storage":{"rootDirectory":"/var/lib/registry"},"http":{"address":"0.0.0.0","port":"5000"},"log":{"level":"warn"}}\n' > "$private/zot.json"
    # docker cp also works when the daemon is reached through a socket from a devcontainer.
    docker create --name "$registry" --network kind --label tfm.lab="$cluster" \
      "$(jq -r '.images.zot.reference' "$lock")" serve /etc/zot/config.json >/dev/null
    docker cp "$private/zot.json" "$registry:/etc/zot/config.json"
    docker start "$registry" >/dev/null
    registry_host="$(docker inspect -f '{{(index .NetworkSettings.Networks "kind").IPAddress}}' "$registry"):5000"
    image_repo="$registry_host/quotes-node-$id"
    for attempt in {1..120}; do
      if curl -fsS --max-time 2 "http://$registry_host/v2/" >/dev/null 2>&1; then break; fi
      [[ "$(docker inspect -f '{{.State.Running}}' "$registry")" == true ]] || { docker logs "$registry"; fail 'The zot registry stopped running.'; }
      sleep 1
    done
    curl -fsS --max-time 5 "http://$registry_host/v2/" >/dev/null
    printf 'server = "http://%s"\n[host."http://%s"]\n  capabilities = ["pull", "resolve"]\n' "$registry_host" "$registry_host" > "$private/hosts.toml"
    while read -r kind_node; do
      docker exec "$kind_node" mkdir -p "/etc/containerd/certs.d/$registry_host"
      docker cp "$private/hosts.toml" "$kind_node:/etc/containerd/certs.d/$registry_host/hosts.toml"
    done < <(kind get nodes --name "$cluster")
    printf '[registry."%s"]\n  http = true\n  insecure = true\n' "$registry_host" > "$private/buildkitd.toml"
    docker buildx create --name "$builder" --driver docker-container --driver-opt network=kind --driver-opt "image=$(jq -r '.images.buildkit.reference' "$lock")" --buildkitd-config "$private/buildkitd.toml" >/dev/null
  else
    docker buildx create --name "$builder" --driver docker-container --driver-opt "image=$(jq -r '.images.buildkit.reference' "$lock")" >/dev/null
  fi
  put imageRepository "$image_repo"
}

lab_prepare_namespaces() {
  local ns
  for ns in tfm-reference tfm-golden; do
    k create namespace "$ns"
    k -n "$ns" create serviceaccount deployer
    k -n "$ns" create role deployment-writer --verb=get,list,watch,create,update,patch --resource=deployments.apps,pods
    k -n "$ns" create rolebinding deployment-writer --role=deployment-writer --serviceaccount="$ns:deployer"
    if [[ "$mode" == github ]]; then
      k -n "$ns" create secret generic gp-ghcr --type=kubernetes.io/dockerconfigjson --from-file=.dockerconfigjson="$DOCKER_CONFIG/config.json" >/dev/null
    fi
  done
}

lab_install_admission() {
  record 'Install mandatory admission checks and trust limited to this lab'
  curl -fsSL --retry 3 "$(jq -r '.charts.kyverno.url' "$lock")" -o "$private/kyverno.tgz"
  printf '%s  %s\n' "$(jq -r '.charts.kyverno.sha256' "$lock")" "$private/kyverno.tgz" | sha256sum -c --status
  k create namespace kyverno
  if [[ "$mode" == github ]]; then
    k -n kyverno create secret generic gp-ghcr --type=kubernetes.io/dockerconfigjson --from-file=.dockerconfigjson="$DOCKER_CONFIG/config.json" >/dev/null
  fi
  jq -n --arg tag "v$(jq -r '.charts.kyverno.appVersion' "$lock")" --arg admission "$(jq -r '.images.kyverno.admission.digest' "$lock")" \
    --arg init "$(jq -r '.images.kyverno.init.digest' "$lock")" --arg insecure "$([[ "$mode" == local ]] && echo true || echo false)" \
    '{global:{image:{registry:"ghcr.io"}}, admissionController:{replicas:1,container:{image:{tag:($tag+"@"+$admission)},extraArgs:{imageVerifyCacheEnabled:"false",allowInsecureRegistry:$insecure}},initContainer:{image:{tag:($tag+"@"+$init)}}},backgroundController:{enabled:false},cleanupController:{enabled:false},reportsController:{enabled:false},webhooksCleanup:{enabled:false},crds:{migration:{enabled:false}}}' > "$state_dir/kyverno-values.json"
  helm --kubeconfig "$private/kubeconfig" --kube-context "kind-$cluster" upgrade --install kyverno "$private/kyverno.tgz" --namespace kyverno \
    --values "$state_dir/kyverno-values.json" --wait --timeout 5m
  lab_apply_admission_policies initial
}

lab_apply_admission_policies() {
  local lifecycle=${1:-update} pod rejection reason
  [[ "$lifecycle" == initial || "$lifecycle" == update ]] || fail "Invalid admission lifecycle."
  local -a renderer_args
  renderer_args=(--mode "$mode" --repository "$repository" --commit "$commit" --image-repository "$image_repo" --sbom-version "$(get sbomVersion)" --output "$state_dir/admission-policies.json")
  if [[ "$mode" == local ]]; then renderer_args+=(--public-key "$private/cosign.pub"); else renderer_args+=(--identity "$(get identity)" --registry-secret gp-ghcr); fi
  python3 policies/kyverno/render.py "${renderer_args[@]}"
  k apply -f "$state_dir/admission-policies.json"
  k get -f "$state_dir/admission-policies.json" -o json > "$state_dir/admission-policy-applied.json"
  k wait --for=condition=Ready clusterpolicy/tfm-runtime clusterpolicy/tfm-signature clusterpolicy/tfm-sbom clusterpolicy/tfm-provenance clusterpolicy/tfm-results --timeout=120s
  # Only an existing policy revision needs a fresh cache. Initial installation
  # must not disrupt the controller immediately before F13.
  if [[ "$lifecycle" == update ]]; then
    k -n kyverno rollout restart deployment/kyverno-admission-controller
  fi
  k -n kyverno rollout status deployment/kyverno-admission-controller --timeout=180s
  lab_wait_admission_controller
  while IFS= read -r pod; do
    k -n kyverno logs "pod/$pod" -c kyverno --timestamps=true > "$state_dir/admission-startup-$pod.log"
    if grep -Eq 'failed to bootstrap non leader controllers|failed to wait for cache sync' "$state_dir/admission-startup-$pod.log"; then
      fail 'Admission controller failed to load the policy cache.'
    fi
  done < <(jq -r '.pods[]' "$state_dir/admission-controller-ready.json")
  k get -f "$state_dir/admission-policies.json" -o json > "$state_dir/admission-policy-loaded.json"
  jq -e -n --slurpfile applied "$state_dir/admission-policy-applied.json" --slurpfile loaded "$state_dir/admission-policy-loaded.json" '
    def identity: [.items[] | {name:.metadata.name,uid:.metadata.uid,generation:.metadata.generation,spec}] | sort_by(.name);
    ($applied[0] | identity) == ($loaded[0] | identity) and
    ($loaded[0].items | length == 5 and all(.[];
      (.metadata.uid | type == "string" and length > 0) and
      (.metadata.generation | type == "number" and . > 0) and
      any(.status.conditions[]?; .type == "Ready" and .status == "True")))
  ' > "$state_dir/admission-policy-loaded-check.json"
  [[ "$(actor tfm-golden auth can-i update clusterpolicies.kyverno.io 2>/dev/null || true)" == no ]] || fail 'The delivery actor has permission to change the enforcement barriers.'
  # Exercise the actual API-server -> webhook path without persisting a workload.
  # At initial install results are deliberately absent. Reuse the strict shared
  # classifier loaded from f13.sh; this preflight does not count as an F13 trial.
  if actor tfm-golden apply --dry-run=server -f "$state_dir/tfm-golden.json" > "$state_dir/admission-readiness-probe.log" 2>&1; then
    [[ "$lifecycle" == update ]] || fail 'Admission readiness probe unexpectedly accepted missing results.'
  else
    [[ "$lifecycle" == initial ]] || fail 'Legitimate admission readiness probe failed.'
    rejection=$(scenario_admission_single_reason "$state_dir/admission-readiness-probe.log" tfm-results require-results) || fail 'Admission readiness probe has no attributable results denial.'
    reason="${rejection#*$'\t'}"
    [[ "$reason" == 'image attestations verification failed, verifiedCount: 0, requiredCount: 1, error: sigstore bundle verification failed: no matching signatures found' ]] || fail 'Admission readiness probe failed for an unexpected reason.'
  fi
}

# Poll only Kubernetes convergence. API errors/malformed observations abort;
# webhook timeouts are never retried or converted into a successful rejection.
lab_wait_admission_controller() {
  local attempt status prefix
  for attempt in {1..30}; do
    prefix="$state_dir/admission-controller-$attempt"
    k -n kyverno get deployment kyverno-admission-controller -o json > "$prefix-deployment.json"
    k -n kyverno get replicasets -o json > "$prefix-replicasets.json"
    k -n kyverno get pods -o json > "$prefix-pods.json"
    k -n kyverno get endpointslices -l kubernetes.io/service-name=kyverno-svc -o json > "$prefix-endpoints.json"
    status=0
    node "$root/scripts/check-admission-controller.mjs" "$prefix-deployment.json" "$prefix-replicasets.json" "$prefix-pods.json" "$prefix-endpoints.json" > "$prefix-check.json" || status=$?
    if [[ "$status" == 0 ]]; then
      cp "$prefix-check.json" "$state_dir/admission-controller-ready.json"
      return
    fi
    [[ "$status" == 2 ]] || fail 'Unable to validate admission controller observations.'
    sleep 2
  done
  fail 'Admission controller Pods and Service endpoints did not converge.'
}

lab_capture_admission_diagnostics() {
  local pod status=0
  capture_diagnostic "$state_dir/admission-failure-pods.json" k -n kyverno get pods -o json || status=1
  capture_diagnostic "$state_dir/admission-failure-endpoints.json" k -n kyverno get endpointslices -l kubernetes.io/service-name=kyverno-svc -o json || status=1
  # Names are from the owned lab namespace, not Deployment log auto-selection.
  while IFS= read -r pod; do
    capture_diagnostic "$state_dir/admission-failure-$pod.log" k -n kyverno logs "pod/$pod" -c kyverno --timestamps=true --tail=500 || status=1
  done < <(jq -r '.items[]? | .metadata.name | select(test("^kyverno-admission-controller-[a-z0-9-]+$"))' "$state_dir/admission-failure-pods.json" 2>/dev/null)
  return "$status"
}
