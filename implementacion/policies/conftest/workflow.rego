package workflow

import rego.v1

triggers contains event if {
    on := object.get(input, "on", {})
    is_object(on)
    some event in object.keys(on)
}
triggers contains event if {
    on := object.get(input, "on", [])
    is_array(on)
    some event in on
}
triggers contains event if {
    event := object.get(input, "on", "")
    is_string(event)
}

action_uses contains use if {
    some job in object.get(input, "jobs", {})
    use := job.uses
}
action_uses contains use if {
    some job in object.get(input, "jobs", {})
    some step in object.get(job, "steps", [])
    use := step.uses
}

deny contains "WORKFLOW_SHAPE: jobs must be a non-empty object" if {
    not is_object(object.get(input, "jobs", null))
}
deny contains "WORKFLOW_SHAPE: at least one job is required" if count(object.get(input, "jobs", {})) == 0

deny contains sprintf("ACTION_SHA: %s must be pinned to a full 40-character SHA", [use]) if {
    some use in action_uses
    not startswith(use, "./")
    not regex.match(`^[^\s@]+@[0-9a-f]{40}$`, use)
}

deny contains "PULL_REQUEST_TARGET: this event is excluded from the laboratory" if "pull_request_target" in triggers

deny contains "PERMISSIONS: the workflow must declare permissions as an object" if {
    not is_object(object.get(input, "permissions", null))
}

deny contains sprintf("GLOBAL_WRITE: %s=write must be scoped to the delivery job", [scope]) if {
    some scope, permission in object.get(input, "permissions", {})
    permission == "write"
}

deny contains sprintf("JOB_PERMISSIONS: %s must not use broad permissions", [name]) if {
    some name, job in object.get(input, "jobs", {})
    permissions := object.get(job, "permissions", {})
    not is_object(permissions)
}

deny contains sprintf("EXCESSIVE_WRITE: %s does not require %s=write", [name, scope]) if {
    some name, job in object.get(input, "jobs", {})
    some scope, permission in object.get(job, "permissions", {})
    permission == "write"
    not scope in {"packages", "id-token", "attestations"}
}

deny contains sprintf("PR_WRITE: job %s must not receive %s=write on pull_request", [name, scope]) if {
    "pull_request" in triggers
    some name, job in object.get(input, "jobs", {})
    some scope, permission in object.get(job, "permissions", {})
    permission == "write"
}
