#!/usr/bin/env bash
# Definitions only. demo.sh owns this persistent local lab and its cleanup trap.

manual_task_child() {
  local destination=$1 original=$2 file
  mkdir "$destination"
  cp "$original/state.json" "$destination/state.json"
  for file in unit-tests.log workflow-policy.json versions.txt tools-lock.json database-identity.json development-public-key.pem local-trusted-root.json local-signing-config.json; do
    [[ ! -f "$original/$file" ]] || cp "$original/$file" "$destination/$file"
  done
  state_dir=$destination
  load_delivery_context
}

manual_task_copy_source() {
  local destination=$1 file
  mkdir "$destination"
  for file in Dockerfile exercise.cjs package.json package-lock.json; do
    cp "tests/fixtures/vulnerabilities/f03-vulnerable/$file" "$destination/$file"
  done
}

manual_task_delete() {
  local ns=$1 output=$2 status=0
  k -n "$ns" delete deployment quotes-node --ignore-not-found --wait=true --timeout=90s > "$output-delete.log" 2>&1
  k -n "$ns" get deployment quotes-node -o json > "$output-object.json" 2> "$output-absence.log" || status=$?
  [[ "$status" == 1 && "$(cat "$output-absence.log")" == 'Error from server (NotFound): deployments.apps "quotes-node" not found' ]] || fail 'Task workload absence is not established.'
}

manual_task_probe() {
  local ns=$1
  probe "$ns"
  k -n "$ns" get deployment quotes-node -o json > "$state_dir/deployment.json"
  k -n "$ns" get pods -l app=quotes-node -o json > "$state_dir/pods.json"
  node scripts/check-image-rollout.mjs --same-image "$image" "$state_dir/deployment.json" "$state_dir/pods.json" "$ns" > "$state_dir/rollout.json"
}

manual_task_profile() {
  local output=$1
  k get clusterpolicies -o json | jq -S '[.items[] | {name:.metadata.name,uid:.metadata.uid,generation:.metadata.generation,spec}] | sort_by(.name)' > "$output-policies.json"
  k get namespace tfm-golden tfm-reference -o json | jq -S '[.items[] | {name:.metadata.name,uid:.metadata.uid,labels:.metadata.labels}] | sort_by(.name)' > "$output-namespaces.json"
}

manual_task_profile_check() {
  local stage=${1:-before}
  manual_task_profile "$manual_operation/$stage"
  cmp "$manual_owner/manual-profile-policies.json" "$manual_operation/$stage-policies.json"
  cmp "$manual_owner/manual-profile-namespaces.json" "$manual_operation/$stage-namespaces.json"
  python3 scripts/vulnerability-database.py check "$(get vulnerabilityDatabase)" "$state_dir/database-identity.json"
}

manual_task_cleanup_check() {
  local resource filter
  docker info > "$manual_operation/cleanup-docker.log" 2>&1 || return
  # Buildx ls initializes DOCKER_CONFIG and recreates the deleted private tree.
  # Observe the owned docker-container nodes directly; absence of private state
  # also establishes absence of their local builder metadata.
  for resource in registry cluster builder; do
    case "$resource" in
      registry) filter="name=^${registry}$";;
      cluster) filter="label=io.x-k8s.kind.cluster=$cluster";;
      builder) filter="name=^buildx_buildkit_${builder}[0-9]+$";;
    esac
    docker ps -a --filter "$filter" --format '{{.Names}}' > "$manual_operation/cleanup-$resource.txt" 2> "$manual_operation/cleanup-$resource-error.log" || return
    if [[ -s "$manual_operation/cleanup-$resource.txt" ]]; then
      printf 'ERROR: Owned %s containers remain; inspect cleanup-%s.txt\n' "$resource" "$resource" >&2
      return 1
    fi
  done
  docker volume ls --filter "name=^buildx_buildkit_${builder}[0-9]+_state$" --format '{{.Name}}' > "$manual_operation/cleanup-builder-volumes.txt" 2> "$manual_operation/cleanup-builder-volumes-error.log" || return
  if [[ -s "$manual_operation/cleanup-builder-volumes.txt" || -e "$private" || -L "$private" ]]; then
    printf 'ERROR: Owned builder volumes or private state remain\n' >&2
    return 1
  fi
  printf 'Owned cluster, registry, builder and private state absent\n' > "$manual_operation/cleanup-check.txt"
}

manual_task_detection() {
  local control=$1 evidence=$2
  # Timestamp the attributed control result immediately, before any later phase.
  python3 - "$manual_operation" "$manual_scenario" "$control" "$evidence" "${manual_execution_mode:-manual}" <<'PY'
import json,pathlib,sys
sys.path.insert(0,'scripts')
from manual_tasks import clock,sha256,write_json,SCRIPTED,scripted
folder,scenario,control,evidence,execution=sys.argv[1:]
at=clock()
proof=pathlib.Path(folder)/'detection-evidence.json'
with proof.open('xb') as stream: stream.write(pathlib.Path(evidence).read_bytes())
write_json(pathlib.Path(folder)/'detection.json', {**(SCRIPTED if execution=='scripted' else {}),'status':'ATTRIBUTED_DETECTION','scenario':scenario,
 'control':control,'at':at,'evidence':{'path':proof.name,'sha256':sha256(proof)}})
PY
}

manual_task_check_result() {
  python3 - "$manual_operation" "$manual_scenario" "$1" "$2" "${3:-}" "${manual_execution_mode:-manual}" <<'PY'
import json,pathlib,sys
sys.path.insert(0,'scripts')
from manual_tasks import sha256,write_json,SCRIPTED,scripted
folder,scenario,status,phase,evidence,execution=sys.argv[1:]
value={'schema':'manual-task-check/v1','scenario':scenario,'status':status,'phase':phase}
if execution=='scripted': value.update(SCRIPTED)
if evidence:
 proof=pathlib.Path(evidence)
 if proof.parent != pathlib.Path(folder):
  proof=pathlib.Path(folder)/'check-evidence.json'
  with proof.open('xb') as stream: stream.write(pathlib.Path(evidence).read_bytes())
 value['evidence']={'path':proof.name,'sha256':sha256(proof)}
write_json(pathlib.Path(folder)/'check-result.json',value)
PY
}

manual_task_oracle() {
  local oracle=$1 output=$2 code=0
  shift 2
  manual_task_check_result INTEGRATION_ERROR "$oracle"
  # Capture only this external validator. Calling a whole stage conditionally
  # would suppress errexit inside the shared delivery functions.
  node tests/scenarios/manual-task-evidence.mjs "$oracle" "$@" > "$output" || code=$?
  if [[ "$code" == 43 ]]; then
    jq -e '.status=="CORRECTION_REJECTED" and (.reason | type=="string" and length>0)' "$output" >/dev/null
    manual_task_check_result CORRECTION_REJECTED "$oracle" "$output"
    return 43
  fi
  if [[ "$code" != 0 ]]; then
    manual_task_check_result INTEGRATION_ERROR "$oracle" "$output"
    return "$code"
  fi
  jq -e '.status=="PASS"' "$output" >/dev/null
}

manual_task_prepare() {
  bash scripts/check-environment.sh
  lab_check_environment
  create_state
  manual_owner=$state_dir
  printf '%s\n' "$state_dir" > "$manual_task/operator/state-path.txt"
  cp "$manual_task/record.json" "$state_dir/manual-task.json"
  capture_source_context
  delivery_versions
  docker info --format '{{json .}}' | jq '{NCPU,MemTotal,ServerVersion,Driver,CgroupVersion,OSType,Architecture}' > "$state_dir/manual-resources.json"
  delivery_service_tests
  delivery_workflow_policy
  delivery_database_prepare
  lab_create
  lab_prepare_namespaces
  delivery_build
  load_delivery_context
  delivery_render_manifests
  delivery_check_manifest
  delivery_analyze
  attestations_verify_delivery
  lab_install_admission prepared
  attestations_authorize_results
  # Positive input/functional readiness is outside the task timer, for both arms.
  actor tfm-golden apply -f "$state_dir/tfm-golden.json"
  manual_task_probe tfm-golden
  actor tfm-reference apply -f "$state_dir/tfm-reference.json"
  manual_task_probe tfm-reference
  manual_task_delete tfm-golden "$state_dir/prepared-golden"
  manual_task_delete tfm-reference "$state_dir/prepared-reference"
  manual_task_profile "$state_dir/manual-profile"
  local authorized=$image candidate=$state_dir base=$image registry_ip
  if [[ "$manual_scenario" == F03 ]]; then
    manual_task_copy_source "$manual_task/participant/source"
    manual_task_child "$manual_owner/F03-vulnerable" "$manual_owner"
    id="$(basename "$manual_owner" | tr '[:upper:]' '[:lower:]')-manual-f03"
    delivery_build tests/fixtures/vulnerabilities/f03-vulnerable "$base"
    load_delivery_context
    delivery_render_manifests
    delivery_scan
    delivery_evaluate_vulnerabilities
    scenario_vulnerability_assert F03-vulnerable
    actor tfm-reference apply -f "$state_dir/tfm-reference.json"
    manual_task_probe tfm-reference
    k -n tfm-reference logs deployment/quotes-node > "$state_dir/dependency-behavior.log"
    node tests/scenarios/vulnerability-evidence.mjs compatibility "$state_dir" > "$state_dir/dependency-behavior.json"
    manual_task_delete tfm-reference "$state_dir/prepared-reference"
    candidate=$state_dir
  elif [[ "$manual_scenario" == F10 ]]; then
    manual_task_child "$manual_owner/L01-update" "$manual_owner"
    id="$(basename "$manual_owner" | tr '[:upper:]' '[:lower:]')-manual-f10"
    delivery_build
    load_delivery_context
    delivery_render_manifests
    delivery_check_manifest
    delivery_analyze
    attestations_verify_delivery
    attestations_authorize_results
    candidate=$state_dir
    mkdir "$state_dir/F10-admission"
    node scripts/provenance-scenario-evidence.mjs prepare "$state_dir" "$image" F10 authorized
    cosign attest "${sign_args[@]}" --no-upload --bundle "$state_dir/F10-admission/fixture.bundle.json" --type slsaprovenance1 --predicate "$state_dir/F10-admission/fixture-predicate.json" "$image"
    node scripts/provenance-scenario-evidence.mjs plan "$state_dir" "$image" F10 authorized
    registry_ip=${image_repo%%/*}; registry_ip=${registry_ip%:*}
    [[ "$(docker inspect -f '{{(index .NetworkSettings.Networks "kind").IPAddress}}' "$registry")" == "$registry_ip" ]] || fail 'Registry is not owned by this task.'
    [[ "$(docker inspect -f '{{index .Config.Labels "tfm.lab"}}' "$registry")" == "$cluster" ]] || fail 'Registry owner differs.'
    node scripts/provenance-scenario-evidence.mjs alter "$state_dir" "$image" F10 authorized
    node scripts/provenance-scenario-evidence.mjs snapshot "$state_dir" "$image" F10 authorized negative
    local gate_status=0
    node scripts/ci-verification-gate.mjs "$state_dir" CI-prepared-fault authorized || gate_status=$?
    [[ "$gate_status" == 42 ]] || fail 'F10 preparation did not establish the authenticated origin fault.'
    jq -e '.status=="PROVENANCE_REPOSITORY_UNAUTHORIZED" and .inventoryComplete==true' "$state_dir/CI-prepared-fault.result.json" >/dev/null
    printf '%s\n' "$authorized" > "$manual_task/participant/authorized-artifact.txt"
    if [[ "${manual_execution_mode:-manual}" == scripted ]]; then chmod a-w "$manual_task/participant/authorized-artifact.txt"; fi
  fi
  printf '%s\n' "$image" > "$manual_task/participant/image.txt"
  cp "$candidate/tfm-golden.json" "$manual_task/participant/manifest.json"
  if [[ "$manual_scenario" == F11 ]]; then
    jq '.spec.template.spec.containers[0].securityContext |= (.privileged=true | .allowPrivilegeEscalation=true)' "$candidate/tfm-golden.json" > "$manual_task/participant/manifest.json"
    # Operator-only API-shape and oracle confirmation; never a measured detection.
    jq '.metadata.namespace="tfm-reference"' "$manual_task/participant/manifest.json" > "$manual_owner/F11-api-shape.json"
    actor tfm-reference apply --dry-run=server -f "$manual_owner/F11-api-shape.json" > "$manual_owner/F11-api-shape.log"
    scenario_runtime_early "$manual_task/participant/manifest.json" F11 "$manual_owner/F11-preparation"
  fi
  jq -n --arg scenario "$manual_scenario" --arg owner "$manual_owner" --arg candidate "$candidate" --arg base "$base" --arg authorized "$authorized" --arg image "$image" \
    '{schema:"manual-task-preparation/v1",scenario:$scenario,owner:$owner,candidate:$candidate,base:$base,authorizedArtifact:$authorized,initialImage:$image,entry:"post-build prepared input",hostedNegativeCoverage:"NOT_EXECUTED"}' > "$manual_task/operator/prepared.json"
  python3 - "$manual_task/operator/prepared.json" <<'PY'
import pathlib,sys
sys.path.insert(0,'scripts')
from manual_tasks import sha256,write_json
import json
p=pathlib.Path(sys.argv[1]); v=json.loads(p.read_text()); files=set()
for directory in {v['owner'],v['candidate']}:
 for name in ['state.json','database-identity.json','development-public-key.pem','local-trusted-root.json','tfm-golden.json']:
  f=pathlib.Path(directory)/name
  if f.is_file(): files.add(str(f))
for name in ['manual-profile-policies.json','manual-profile-namespaces.json']:
 files.add(str(pathlib.Path(v['owner'])/name))
v['invariants']={name:sha256(name) for name in sorted(files)}
v['comparability']=json.loads((pathlib.Path(v['owner'])/'manual-resources.json').read_text())
participant=p.parent.parent/'participant'
inputs=[participant/name for name in ['image.txt','manifest.json']]
if v['scenario']=='F03': inputs += [participant/'source'/name for name in ['Dockerfile','exercise.cjs','package.json','package-lock.json']]
v['initialInputs']={str(f):sha256(f) for f in inputs}
record=json.loads((p.parent.parent/'record.json').read_text())
from manual_tasks import SCRIPTED,scripted
if scripted(record):
 v.update(SCRIPTED)
 catalog=participant/'authorized-artifact.txt'
 if catalog.exists(): v['invariants'][str(catalog)]=sha256(catalog)
write_json(p,v)
PY
  cp "$manual_task/operator/prepared.json" "$manual_owner/manual-preparation.json"
  if [[ "${manual_execution_mode:-manual}" != scripted ]]; then
    cp docs/EN/manual-task-participant.md "$manual_task/participant/README.md"
    cp docs/ES/manual-task-participant.md "$manual_task/participant/README.es.md"
  fi
  state_dir=$manual_owner
  preserve=1
}

manual_task_select() {
  local selected original
  selected=$(cat "$manual_task/participant/image.txt")
  original=$(jq -er .initialImage "$manual_task/operator/prepared.json")
  manual_candidate=$(jq -er .candidate "$manual_task/operator/prepared.json")
  if [[ "$manual_scenario" == F10 && "$selected" == "$(jq -er .authorizedArtifact "$manual_task/operator/prepared.json")" ]]; then
    manual_candidate=$manual_owner
  else
    [[ "$selected" == "$original" ]] || fail 'Select an artifact from this task; do not change source or trust.'
  fi
  # Each command has fresh output paths. Previous tool and validation evidence survives.
  local name
  name=$(basename "$manual_operation")
  mkdir -p "$manual_owner/manual-operations"
  manual_task_child "$manual_owner/manual-operations/$name" "$manual_candidate"
  if [[ "$manual_scenario" == F11 ]]; then
    node tests/scenarios/manual-task-evidence.mjs manifest-input "$manual_candidate/tfm-golden.json" "$manual_task/participant/manifest.json" > "$state_dir/input-guard.json"
    cp "$manual_task/participant/manifest.json" "$state_dir/tfm-golden.json"
  else
    delivery_render_manifests
  fi
  jq '.metadata.namespace="tfm-reference"' "$state_dir/tfm-golden.json" > "$state_dir/tfm-reference.json"
  printf '%s\n' "$state_dir" > "$manual_operation/state-path.txt"
  manual_task_profile_check
}

manual_task_control() {
  local control=$1 code=0 decision
  case "$control" in
    scan)
      delivery_scan
      delivery_evaluate_vulnerabilities
      if [[ "$(jq -er .status "$state_dir/analysis.json")" == BLOCKED ]]; then
        if [[ "$manual_scenario" == F03 ]]; then
          node tests/scenarios/vulnerability-evidence.mjs target "$state_dir" F03-vulnerable > "$state_dir/target-attribution.json"
          manual_task_detection scan "$state_dir/target-attribution.json"
          return 42
        fi
        return 43
      fi
      node scripts/vulnerability-evidence.mjs authorize "$state_dir" "$image" > "$state_dir/analysis-authorization.json"
      ;;
    provenance)
      node scripts/ci-verification-gate.mjs "$state_dir" CI-manual authorized || code=$?
      if [[ "$code" == 42 && "$manual_scenario" == F10 ]]; then
        jq -e '.status=="PROVENANCE_REPOSITORY_UNAUTHORIZED" and .inventoryComplete==true' "$state_dir/CI-manual.result.json" >/dev/null
        manual_task_detection provenance "$state_dir/CI-manual.result.json"
        return 42
      fi
      [[ "$code" == 0 ]] || return "$code"
      ;;
    manifest)
      conftest test --policy policies/conftest --namespace manifests --output json "$state_dir/tfm-golden.json" > "$state_dir/manifest-policy.json" 2> "$state_dir/manifest-policy.stderr.log" || code=$?
      node tests/scenarios/manual-task-evidence.mjs manifest-decision "$code" "$state_dir/manifest-policy.json" "$state_dir/manifest-policy.stderr.log" "$state_dir/tfm-golden.json" > "$state_dir/manifest-decision.json"
      if [[ "$(jq -r .detected "$state_dir/manifest-decision.json")" == true ]]; then
        [[ "$manual_scenario" == F11 ]] || return 43
        manual_task_detection manifest "$state_dir/manifest-decision.json"
        if [[ "${manual_check_active:-0}" == 1 ]]; then
          manual_task_check_result CORRECTION_REJECTED manifest "$state_dir/manifest-decision.json"
        fi
        return 42
      fi
      ;;
    *) fail 'Unknown manual control' ;;
  esac
}

manual_task_start() {
  local observed=0
  k -n "$manual_namespace" get deployment quotes-node -o json > "$state_dir/initial-object.json" 2> "$state_dir/initial-absence.log" || observed=$?
  [[ "$observed" == 1 && "$(cat "$state_dir/initial-absence.log")" == 'Error from server (NotFound): deployments.apps "quotes-node" not found' ]] || fail 'Initial workload is not demonstrably absent.'
  if [[ "$manual_arm" == G ]]; then
    case "$manual_scenario" in F03) manual_task_control scan;; F10) manual_task_control provenance;; F11) manual_task_control manifest;; esac
    # If the applicable early control passes, enforce the existing later gate too.
    attestations_ci_gate CI-start authorized
  fi
  actor "$manual_namespace" create -f "$state_dir/$manual_namespace.json" -o json > "$state_dir/admission.json" 2> "$state_dir/admission.log"
  manual_task_probe "$manual_namespace"
}

manual_task_check() {
  local before base file analysis_status manual_check_active=1
  manual_task_check_result INTEGRATION_ERROR correction-input
  before=$(jq -er .candidate "$manual_task/operator/prepared.json")
  if [[ "$manual_scenario" == F03 ]]; then
    # The participant edits dependency manifests; execution wrappers stay fixed.
    mkdir "$state_dir/input-source"
    for file in Dockerfile exercise.cjs package.json package-lock.json; do
      [[ -f "$manual_task/participant/source/$file" && ! -L "$manual_task/participant/source/$file" ]] || fail 'Expected regular fixture input.'
      cp "$manual_task/participant/source/$file" "$state_dir/input-source/$file"
    done
    for file in Dockerfile exercise.cjs; do cmp "$state_dir/input-source/$file" "tests/fixtures/vulnerabilities/f03-vulnerable/$file"; done
    base=$(jq -er .base "$manual_task/operator/prepared.json")
    id="$(basename "$manual_owner" | tr '[:upper:]' '[:lower:]')-$(basename "$manual_operation")"
    node tests/scenarios/manual-task-evidence.mjs authorize-build "$state_dir/input-source" "$commit" "$base" > "$state_dir/input-authorization.json"
    manual_task_check_result INTEGRATION_ERROR build
    delivery_build "$state_dir/input-source" "$base" "$state_dir/input-authorization.json" manual-correction
    # The immutable harness revision and the participant's actual build inputs
    # are separate identities. Bind newly issued F03 evidence to those inputs.
    put sourceSnapshot "$(sha256sum "$state_dir/build-inputs.json" | cut -d ' ' -f 1)"
    load_delivery_context
    delivery_render_manifests
    delivery_check_manifest
    manual_task_check_result INTEGRATION_ERROR scan
    delivery_scan
    delivery_evaluate_vulnerabilities
    analysis_status=$(jq -er .status "$state_dir/analysis.json")
    if [[ "$analysis_status" == BLOCKED ]]; then
      manual_task_check_result CORRECTION_REJECTED vulnerability-policy "$state_dir/analysis.json"
      return 43
    fi
    [[ "$analysis_status" == PASS ]] || fail 'Unexpected vulnerability decision.'
    node scripts/vulnerability-evidence.mjs authorize "$state_dir" "$image" > "$state_dir/analysis-authorization.json"
    if [[ "$manual_arm" == G ]]; then
      manual_task_check_result INTEGRATION_ERROR authorization
      attestations_verify_delivery
      attestations_authorize_results
    fi
  elif [[ "$manual_scenario" == F10 ]]; then
    # Correction selects an existing authorized artifact. No signing or claim rewriting.
    local authorized
    authorized=$(jq -er .authorizedArtifact "$manual_task/operator/prepared.json")
    if [[ "$image" != "$authorized" ]]; then
      jq -n --arg selected "$image" --arg authorized "$authorized" \
        '{status:"CORRECTION_REJECTED",selected:$selected,authorized:$authorized}' > "$state_dir/artifact-selection.json"
      manual_task_check_result CORRECTION_REJECTED artifact-selection "$state_dir/artifact-selection.json"
      return 43
    fi
    manual_task_check_result INTEGRATION_ERROR provenance
    manual_task_control provenance
  else
    manual_task_check_result INTEGRATION_ERROR manifest
    manual_task_control manifest
    [[ "$manual_arm" != G ]] || attestations_ci_gate CI-completion authorized
  fi
  manual_task_check_result INTEGRATION_ERROR admission
  manual_task_delete "$manual_namespace" "$state_dir/completion-before"
  actor "$manual_namespace" create -f "$state_dir/$manual_namespace.json" -o json > "$state_dir/admission.json" 2> "$state_dir/admission.log"
  manual_task_check_result INTEGRATION_ERROR rollout-http
  manual_task_probe "$manual_namespace"
  if [[ "$manual_scenario" == F03 ]]; then
    k -n "$manual_namespace" logs deployment/quotes-node > "$state_dir/dependency-behavior.log"
    manual_task_oracle corrected-dependency "$state_dir/correction.json" "$before" "$state_dir"
  else
    before=$manual_owner
  fi
  manual_task_oracle functional "$state_dir/functional-comparison.json" "$before" "$state_dir" "$manual_namespace"
  # Recheck unchanged enforcement after the final observed workload.
  manual_task_check_result INTEGRATION_ERROR profile
  manual_task_profile_check after
  jq -n --arg scenario "$manual_scenario" --arg image "$image" --arg evidence "$state_dir" \
    --arg execution "${manual_execution_mode:-manual}" \
    '{status:"VALIDATED_COMPLETION",scenario:$scenario,image:$image,evidence:$evidence,humanAcceptance:"pending"} +
    (if $execution=="scripted" then {executionMode:"scripted",dataset:"automated-validation",actor:"automation",eligibleForHumanCalibration:false} else {} end)' > "$manual_operation/completion.json"
  manual_task_check_result VALIDATED_COMPLETION complete "$manual_operation/completion.json"
}

manual_task_dispatch() {
  local command=$1
  manual_task=${2:?}; manual_operation=${3:?}
  [[ "$mode" == local && "$manual_task" == "$root/evidence/manual-tasks/"* && -f "$manual_task/record.json" ]] || fail 'Manual tasks require owned lane A records.'
  manual_scenario=$(jq -er .scenario "$manual_task/record.json")
  manual_arm=$(jq -er .arm "$manual_task/record.json")
  manual_execution_mode=$(jq -r '.executionMode // "manual"' "$manual_task/record.json")
  [[ "$manual_scenario" =~ ^F(03|10|11)$ && "$manual_arm" =~ ^[RG]$ ]] || fail 'Unknown task'
  manual_namespace=tfm-reference; [[ "$manual_arm" != G ]] || manual_namespace=tfm-golden
  if [[ "$command" == prepare ]]; then manual_task_prepare; return; fi
  preserve=1
  if [[ "$command" == check ]]; then manual_task_check_result INTEGRATION_ERROR initialization; fi
  if [[ ! -f "$manual_task/operator/state-path.txt" && "$command" == cleanup ]]; then return; fi
  export GP_STATE_DIR
  GP_STATE_DIR=$(cat "$manual_task/operator/state-path.txt")
  load_state
  [[ "$(jq -er .taskDirectory "$state_dir/manual-task.json")" == "$manual_task" ]] || fail 'Task does not own this laboratory.'
  manual_owner=$state_dir
  preserve=1
  if [[ "$command" == cleanup ]]; then
    # A failed preparation may already have its first archive. Preserve those
    # source bytes and checksums; the separate task record keeps later events.
    if [[ ! -e "$state_dir/.evidence-packaged" ]]; then
      cp "$manual_task/record.json" "$state_dir/manual-task.json"
      jq '{status:(if .status=="COMPLETED" then "PASS" else "INCOMPLETE" end),
        scope:(if .executionMode=="scripted" then "automated-validation" else "manual-task" end),scenario,arm,dataset,humanAcceptance:"pending"} +
        (if .executionMode=="scripted" then {executionMode,actor,eligibleForHumanCalibration} else {} end)' \
        "$manual_task/record.json" > "$state_dir/result.json"
    fi
    preserve=0
    return # demo.sh's owning EXIT trap captures/packages and removes resources.
  fi
  manual_task_select
  case "$command" in
    start) manual_task_start;;
    tool) manual_task_control "${4:?}";;
    check) manual_task_check;;
    *) fail 'Unknown manual task command';;
  esac
}
