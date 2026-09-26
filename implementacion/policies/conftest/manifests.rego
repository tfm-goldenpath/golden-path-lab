package manifests

import rego.v1

workload if input.kind in {"Pod", "Deployment"}

pod_spec := input.spec if input.kind == "Pod"
pod_spec := input.spec.template.spec if input.kind == "Deployment"

containers contains container if {
    some field in ["containers", "initContainers", "ephemeralContainers"]
    some container in object.get(pod_spec, field, [])
}

deny contains "MANIFEST_KIND: only Pod or Deployment resources are evaluated in this baseline" if not workload

deny contains "NAMESPACE: the protected namespace must be tfm-golden" if {
    workload
    object.get(object.get(input, "metadata", {}), "namespace", "") != "tfm-golden"
}

deny contains "CONTAINERS: at least one container is required" if {
    workload
    count(object.get(pod_spec, "containers", [])) == 0
}

deny contains sprintf("DIGEST: %s requires an image pinned to a sha256 digest", [container.name]) if {
    some container in containers
    not regex.match(`^[^\s@]+@sha256:[0-9a-f]{64}$`, object.get(container, "image", ""))
}

deny contains sprintf("PRIVILEGED: %s must declare privileged=false", [container.name]) if {
    some container in containers
    object.get(object.get(container, "securityContext", {}), "privileged", true) != false
}

deny contains sprintf("ESCALATION: %s must declare allowPrivilegeEscalation=false", [container.name]) if {
    some container in containers
    object.get(object.get(container, "securityContext", {}), "allowPrivilegeEscalation", true) != false
}

deny contains sprintf("NON_ROOT: %s must declare runAsNonRoot=true", [container.name]) if {
    some container in containers
    object.get(object.get(container, "securityContext", {}), "runAsNonRoot", false) != true
}

deny contains sprintf("READ_ONLY: %s must use a read-only root filesystem", [container.name]) if {
    some container in containers
    object.get(object.get(container, "securityContext", {}), "readOnlyRootFilesystem", false) != true
}

deny contains sprintf("CAPABILITIES: %s must drop ALL capabilities", [container.name]) if {
    some container in containers
    capabilities := object.get(object.get(container, "securityContext", {}), "capabilities", {})
    not "ALL" in object.get(capabilities, "drop", [])
}

deny contains sprintf("CAPABILITIES: %s must not add capabilities", [container.name]) if {
    some container in containers
    capabilities := object.get(object.get(container, "securityContext", {}), "capabilities", {})
    "add" in object.keys(capabilities)
}

deny contains sprintf("HOST_ACCESS: %s is not allowed", [field]) if {
    some field in ["hostNetwork", "hostPID", "hostIPC"]
    object.get(pod_spec, field, false) != false
}

deny contains "SECCOMP: the Pod must use RuntimeDefault" if {
    workload
    context := object.get(pod_spec, "securityContext", {})
    object.get(object.get(context, "seccompProfile", {}), "type", "") != "RuntimeDefault"
}

deny contains "HOST_PATH: hostPath volumes are not allowed" if {
    some volume in object.get(pod_spec, "volumes", [])
    "hostPath" in object.keys(volume)
}
