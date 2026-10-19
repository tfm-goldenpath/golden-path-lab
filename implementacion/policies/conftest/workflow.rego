package workflow

import rego.v1

# The pinned YAML parser represents an unquoted `on` key as "true".
# Examine both representations, including inputs which contain both keys.
event_sources contains events if {
    some key in {"on", "true"}
    events := input[key]
}

triggers contains event if {
    some on in event_sources
    is_object(on)
    some event in object.keys(on)
}
triggers contains event if {
    some on in event_sources
    is_array(on)
    some event in on
}
triggers contains event if {
    some event in event_sources
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
    not bounded_pages_job(job, scope)
}

deny contains sprintf("PR_WRITE: job %s must not receive %s=write on pull_request", [name, scope]) if {
    "pull_request" in triggers
    some name, job in object.get(input, "jobs", {})
    some scope, permission in object.get(job, "permissions", {})
    permission == "write"
}

# Pages is a read-only recorded-evidence publication, not a delivery lane.
# No shell/reusable/local actions or extra permissions in the privileged job.
# Exact official actions + main/manual guard + dependency prevent a name-only exemption.
bounded_pages_job(job, scope) if {
    scope == "pages"
    object.keys(job) - {"if", "needs", "runs-on", "timeout-minutes", "permissions", "environment", "steps"} == set()
    not "env" in object.keys(input)
    not "defaults" in object.keys(input)
    triggers == {"workflow_dispatch"}
    input.permissions == {}
    job["if"] == "github.ref == 'refs/heads/main' && github.event_name == 'workflow_dispatch'"
    job.permissions == {"pages": "write", "id-token": "write"}
    job.environment.name == "github-pages"
    job.environment.url == "${{ steps.deployment.outputs.page_url }}"
    job.needs == "validate"
    validation := input.jobs.validate
    validation["if"] == job["if"]
    validation.permissions == {"contents": "read"}
    count(job.steps) == 2
    job.steps[0].uses == "actions/configure-pages@983d7736d9b0ae728b81ab479565c72886d7745b"
    job.steps[0].with == {"enablement": false}
    job.steps[1].uses == "actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e"
    job.steps[1].id == "deployment"
    object.get(job.steps[1], "with", {}) == {}
    every step in job.steps {
        object.keys(step) - {"name", "id", "uses", "with"} == set()
        not "run" in object.keys(step)
        not "env" in object.keys(step)
    }
    not "uses" in object.keys(job)
    not "env" in object.keys(job)
    not "secrets" in object.keys(job)
    input.concurrency == {"group": "demo-pages", "cancel-in-progress": false}
}
