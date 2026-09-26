package trivy

import rego.v1

valid_report if {
    input.SchemaVersion == 2
    is_string(input.ArtifactName)
    input.ArtifactName != ""
    input.ArtifactType == "container_image"
    is_object(input.Metadata)
    is_array(input.Results)
    count(input.Results) > 0
}

deny contains "TRIVY_REPORT_INVALID: a complete image report with SchemaVersion=2 and non-empty Results is required" if not valid_report

valid_result(result) if {
    is_object(result)
    is_string(result.Target)
    result.Target != ""
    is_string(result.Class)
    is_string(result.Type)
    result.Type != ""
    vulnerabilities := object.get(result, "Vulnerabilities", [])
    is_array(vulnerabilities)
}
valid_result(result) if {
    is_object(result)
    is_string(result.Target)
    result.Target != ""
    is_string(result.Class)
    is_string(result.Type)
    result.Type != ""
    object.get(result, "Vulnerabilities", []) == null
}

deny contains "TRIVY_RESULT_INVALID: a Results entry is incomplete or has an invalid Vulnerabilities value" if {
    valid_report
    some result in input.Results
    not valid_result(result)
}

valid_vulnerability(vulnerability) if {
    is_object(vulnerability)
    is_string(vulnerability.VulnerabilityID)
    vulnerability.VulnerabilityID != ""
    is_string(vulnerability.PkgName)
    vulnerability.PkgName != ""
    vulnerability.Severity in {"UNKNOWN", "LOW", "MEDIUM", "HIGH", "CRITICAL"}
    is_string(object.get(vulnerability, "FixedVersion", ""))
}

deny contains "TRIVY_VULNERABILITY_INVALID: invalid vulnerability identifier, package or severity" if {
    valid_report
    some result in input.Results
    some vulnerability in object.get(result, "Vulnerabilities", [])
    not valid_vulnerability(vulnerability)
}

deny contains sprintf("VULNERABILITY_BLOCK: %s %s %s (whether or not a fix is available)", [vulnerability.VulnerabilityID, vulnerability.PkgName, vulnerability.Severity]) if {
    valid_report
    some result in input.Results
    some vulnerability in object.get(result, "Vulnerabilities", [])
    vulnerability.Severity in {"HIGH", "CRITICAL"}
}
