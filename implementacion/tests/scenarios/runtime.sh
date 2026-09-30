#!/usr/bin/env bash
# F11/F12/L06 share manifest-only trials and state oracles. Definitions only.
scenario_runtime_early() {
  local file=$1 scenario=$2 prefix=$3 code=0
  conftest test --policy policies/conftest --namespace manifests --output json "$file" > "$prefix.json" 2> "$prefix.stderr.log" || code=$?
  node tests/scenarios/runtime-evidence.mjs early "$code" "$prefix.json" "$prefix.stderr.log" "$file" "$scenario" > "$prefix.attribution.json"
}

scenario_runtime_prepare() {
  local scenario kind folder completion
  mkdir "$state_dir/runtime"
  cp docs/EN/cases/F11-F12-L06/operations.json "$state_dir/runtime/operations.json"
  jq '{mode,sourceRepository,sourceCommit,sourceSnapshot,imageRepository,digest,buildTag,identity}' "$state_dir/state.json" > "$state_dir/runtime/identity.json"
  cp policies/conftest/manifests.rego "$state_dir/runtime/manifests-policy.txt"
  # The exact build tag is persisted by delivery_build, including hosted prepare.
  local tag
  tag=$(get buildTag)
  jq --arg tag "$tag" '.spec.template.spec.containers[0].image=$tag' "$state_dir/tfm-golden.json" > "$state_dir/F12-tag.json"
  for scenario in F11 F12 L06; do
    folder="$state_dir/runtime/$scenario"
    mkdir "$folder"
    case "$scenario" in
      F11) cp "$state_dir/F11-privileged.json" "$folder/Deployment.json";;
      F12) cp "$state_dir/F12-tag.json" "$folder/Deployment.json";;
      L06) cp "$state_dir/tfm-golden.json" "$folder/Deployment.json";;
    esac
    jq --arg name "runtime-${scenario,,}" '{apiVersion:"v1",kind:"Pod",metadata:{name:$name,namespace:"tfm-golden",labels:{"tfm-runtime-trial":$name}},spec:.spec.template.spec}' "$folder/Deployment.json" > "$folder/Pod.json"
    for kind in Deployment Pod; do
      scenario_runtime_early "$folder/$kind.json" "$scenario" "$folder/$kind-early"
    done
    diff -u "$state_dir/tfm-golden.json" "$folder/Deployment.json" > "$folder/input-diff.txt" || [[ $? == 1 ]]
    completion="$state_dir/$scenario-completed.json"
    [[ "$scenario" != L06 ]] || completion="$state_dir/L06-result.json"
    jq -n --arg scenario "$scenario" --arg mode "$mode" --arg image "$image" --arg source "$commit" \
      '{scenario:$scenario,lane:$mode,image:$image,sourceCommit:$source,status:"NOT_EXECUTED",reason:"Admission operations not yet reached"}' > "$completion"
  done
}

scenario_runtime_absent() {
  local kind=$1 name=$2 prefix=$3 code=0
  k -n tfm-golden get "$kind" "$name" -o json > "$prefix.json" 2> "$prefix.log" || code=$?
  node tests/scenarios/runtime-evidence.mjs absent "$code" "$prefix.log" "$kind" "$name" > "$prefix.assertion.json"
}

scenario_runtime_snapshot() {
  local prefix=$1
  k get clusterpolicy tfm-runtime tfm-signature tfm-sbom tfm-provenance tfm-results -o json > "$prefix-policies.json"
  node tests/scenarios/runtime-evidence.mjs profile "$prefix-policies.json" "$image" > "$prefix-profile.json"
  k get namespace tfm-golden -o json > "$prefix-namespace.json"
  jq -S '[.items[] | {name:.metadata.name,uid:.metadata.uid,spec:.spec}] | sort_by(.name)' "$prefix-policies.json" > "$prefix-policy-specs.json"
  jq -S '{uid:.metadata.uid,labels:.metadata.labels}' "$prefix-namespace.json" > "$prefix-protection.json"
}

scenario_runtime_tag() {
  local prefix=$1 tag
  tag=$(get buildTag)
  node tests/scenarios/runtime-evidence.mjs resolve "$mode" "$tag" "$image" "$prefix.json" > "$prefix-check.json" 2> "$prefix-error.log"
}

scenario_f12_attribute() {
  local log=$1 name=$2 rejection rule reason
  rejection=$(scenario_admission_single_reason "$log" tfm-runtime authorized-image-repository "$name") || fail 'F12 has an unrelated or additional admission denial.'
  rule=${rejection%%$'\t'*}; reason=${rejection#*$'\t'}
  # Pinned Kyverno foreach deny message; engine/transport/signature failures do not qualify.
  [[ "$reason" == 'validation failure: IMAGE_REPOSITORY: all images must belong to the authorized repository and use a digest' ]] || fail 'F12 did not identify the image-reference deny condition.'
  jq -n --arg rule "$rule" --arg diagnostic "$reason" '{policy:"tfm-runtime",rule:$rule,diagnostic:$diagnostic}' > "$log.attribution.json"
}

scenario_runtime_negative() {
  local scenario=$1 kind=$2 operation=$3 name=quotes-node code=0 observation=0 folder request
  folder="$state_dir/runtime/$scenario/$kind-$operation"
  mkdir "$folder"
  [[ "$kind" != Pod ]] || name="runtime-${scenario,,}"
  if [[ "$operation" == CREATE ]]; then
    scenario_runtime_absent "$kind" "$name" "$folder/before"
    cp "$state_dir/runtime/$scenario/$kind.json" "$folder/request.json"
    request=create
  else
    k -n tfm-golden get deployment quotes-node -o json > "$folder/before.json"
    # Replace is a legal Deployment UPDATE and retains the concurrency precondition.
    # Mutate the observed desired spec, preserving admission defaults and identity.
    if [[ "$scenario" == F11 ]]; then
      jq 'del(.status,.metadata.managedFields) | .spec.template.spec.containers[0].securityContext |= (.privileged=true | .allowPrivilegeEscalation=true)' "$folder/before.json" > "$folder/request.json"
    else
      jq --arg tag "$(get buildTag)" 'del(.status,.metadata.managedFields) | .spec.template.spec.containers[0].image=$tag' "$folder/before.json" > "$folder/request.json"
    fi
    request=replace
  fi
  scenario_runtime_early "$folder/request.json" "$scenario" "$folder/early"
  if [[ "$scenario" == F12 ]]; then scenario_runtime_tag "$folder/tag-before"; fi
  actor tfm-golden "$request" -f "$folder/request.json" > "$folder/response.log" 2>&1 || code=$?
  printf '%s\n' "$code" > "$folder/exit-status.txt"
  # Observe before classification, retaining unfavorable acceptance and any conversion.
  if [[ "$operation" == CREATE ]]; then
    k -n tfm-golden get "$kind" "$name" -o json > "$folder/after.json" 2> "$folder/after.log" || observation=$?
  else
    k -n tfm-golden get deployment quotes-node -o json > "$folder/after.json"
  fi
  if [[ "$scenario" == F12 ]]; then scenario_runtime_tag "$folder/tag-after"; fi
  if [[ "$operation" == CREATE ]]; then
    node tests/scenarios/runtime-evidence.mjs absent "$observation" "$folder/after.log" "$kind" "$name" > "$folder/after.assertion.json"
  else
    node tests/scenarios/runtime-evidence.mjs unchanged "$folder/before.json" "$folder/after.json" > "$folder/state-check.json"
  fi
  [[ "$code" != 0 ]] || fail "$scenario $kind $operation unexpectedly accepted; retained unfavorable state."
  if [[ "$scenario" == F11 ]]; then scenario_f11_attribute "$folder/response.log" "$name"; else scenario_f12_attribute "$folder/response.log" "$name"; fi
  jq -n --arg scenario "$scenario" --arg kind "$kind" --arg operation "$operation" --arg image "$image" \
    '{status:"ATTRIBUTED_REJECTION",scenario:$scenario,kind:$kind,operation:$operation,image:$image,evidence:("runtime/"+$scenario+"/"+$kind+"-"+$operation),early:"early.attribution.json",admission:"response.log.attribution.json"}' > "$folder/result.json"
}

scenario_runtime_create() {
  local scenario
  # Fresh cryptographic verification of the backing digest, including results.
  attestations_ci_gate runtime-authorized authorized
  scenario_runtime_snapshot "$state_dir/runtime/before"
  for scenario in F11 F12; do
    jq '.status="INCOMPLETE" | .reason="Runtime operations started; family acceptance not complete"' "$state_dir/$scenario-completed.json" > "$state_dir/runtime/$scenario/started.json"
    cp "$state_dir/runtime/$scenario/started.json" "$state_dir/$scenario-completed.json"
    scenario_runtime_negative "$scenario" Deployment CREATE
    scenario_runtime_negative "$scenario" Pod CREATE
  done
}

scenario_l06() {
  local folder="$state_dir/runtime/L06" annotation
  annotation="$(basename "$state_dir")-l06"
  jq -n --arg mode "$mode" --arg image "$image" '{scenario:"L06",lane:$mode,image:$image,status:"INCOMPLETE",reason:"L01 creation reached; L06 update and direct Pod checks pending"}' > "$state_dir/L06-result.json"
  # L01 just created this same digest and checked HTTP. Retain controller Pods separately.
  k -n tfm-golden get deployment quotes-node -o json > "$folder/create-deployment.json"
  k -n tfm-golden get pods -l app=quotes-node -o json > "$folder/create-controller-pods.json"
  node scripts/check-image-rollout.mjs --same-image "$image" "$folder/create-deployment.json" "$folder/create-controller-pods.json" > "$folder/create-rollout.json"
  cp "$state_dir/L01-admission.log" "$folder/create-response.log"
  for file in health version quote; do cp "$state_dir/tfm-golden-$file.json" "$folder/create-$file.json"; done
  scenario_runtime_negative F11 Deployment UPDATE
  scenario_runtime_negative F12 Deployment UPDATE
  k -n tfm-golden get deployment quotes-node -o json > "$folder/update-before.json"
  jq --arg annotation "$annotation" 'del(.status,.metadata.managedFields) | .spec.template.metadata.annotations["tfm.goldenpath/l06"]=$annotation' "$folder/update-before.json" > "$folder/update-request.json"
  scenario_runtime_early "$folder/update-request.json" L06 "$folder/update-early"
  actor tfm-golden replace -f "$folder/update-request.json" > "$folder/update-response.log" 2>&1
  k -n tfm-golden get deployment quotes-node -o json > "$folder/update-after.json"
  node tests/scenarios/runtime-evidence.mjs updated "$folder/update-before.json" "$folder/update-after.json" "$annotation" > "$folder/update-change.json"
  probe tfm-golden > "$folder/update-probe.log" 2>&1
  k -n tfm-golden get deployment quotes-node -o json > "$folder/update-deployment.json"
  k -n tfm-golden get pods -l app=quotes-node -o json > "$folder/update-controller-pods.json"
  jq -e --arg annotation "$annotation" '[.items[] | select(.metadata.deletionTimestamp == null)] | length > 0 and all(.metadata.annotations["tfm.goldenpath/l06"]==$annotation)' "$folder/update-controller-pods.json" > "$folder/update-pod-template-check.json"
  node scripts/check-image-rollout.mjs --same-image "$image" "$folder/update-deployment.json" "$folder/update-controller-pods.json" > "$folder/update-rollout.json"
  for file in health version quote; do cp "$state_dir/tfm-golden-$file.json" "$folder/update-$file.json"; done
  cmp "$folder/create-quote.json" "$folder/update-quote.json"
  scenario_runtime_absent Pod runtime-l06 "$folder/pod-before"
  actor tfm-golden create -f "$folder/Pod.json" > "$folder/pod-response.log" 2>&1
  k -n tfm-golden get pod runtime-l06 -o json > "$folder/pod-after.json"
  jq -e --arg image "$image" '.metadata.name=="runtime-l06" and .metadata.labels.app != "quotes-node" and .spec.containers[0].image==$image' "$folder/pod-after.json" > "$folder/pod-check.json"
  k -n tfm-golden delete pod runtime-l06 --wait=true --timeout=60s > "$folder/pod-cleanup.log" 2>&1
  scenario_runtime_absent Pod runtime-l06 "$folder/pod-cleaned"
  scenario_runtime_snapshot "$state_dir/runtime/after"
  cmp "$state_dir/runtime/before-policy-specs.json" "$state_dir/runtime/after-policy-specs.json"
  cmp "$state_dir/runtime/before-protection.json" "$state_dir/runtime/after-protection.json"
  jq -n --arg image "$image" --arg mode "$mode" --slurpfile update "$folder/update-change.json" \
    '{scenario:"L06",status:"PASS",lane:$mode,image:$image,create:"shared-L01",update:$update[0],directPodCreate:"accepted-and-cleaned",controllerPods:"separate-rollout-observations",measurement:"functional-integration-only"}' > "$state_dir/L06-result.json"
  local scenario
  for scenario in F11 F12; do
    jq -n --arg scenario "$scenario" --arg image "$image" --arg mode "$mode" \
      --slurpfile create "$state_dir/runtime/$scenario/Deployment-CREATE/result.json" \
      --slurpfile update "$state_dir/runtime/$scenario/Deployment-UPDATE/result.json" \
      --slurpfile pod "$state_dir/runtime/$scenario/Pod-CREATE/result.json" \
      '{scenario:$scenario,status:"REJECTION_AND_L06_ACCEPTANCE_COMPLETE",lane:$mode,image:$image,operations:[$create[0],$update[0],$pod[0]],positiveControl:"L06-result.json"}' > "$state_dir/$scenario-completed.json"
  done
}
