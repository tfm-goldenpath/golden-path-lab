# L01 image replacement: local validation

Date: 2026-09-27. This validates the modified local working tree based on commit `21f8fc46b158ae209c657c33f9376254223d62df`, not the unchanged remote commit. The captured source snapshot is `4dbde69eaa4d4c5773f37ae7b8e710ed71b24b87915bfdae05d882b7e9dbcda3`.

## Observed result

`make demo` completed with exit code 0 in local run `run-XVliHU00`. The test used the pinned laboratory tools in a Linux container, with the host Docker 24.0.5 engine and explicit `GP_CGROUP_V1_COMPAT=1`. This is a compatibility integration test, not the prescribed campaign environment or a timing measurement.

| Check | Observation |
| --- | --- |
| Initial delivery | Reference and Golden Path returned the expected quotation; L01 became ready after authorization. |
| F13 | Rejected only by `tfm-results` for the absent results predicate. |
| F11 | Early policy rejected the input; admission rejected the UPDATE at `allowPrivilegeEscalation`. |
| L01 replacement | A distinct image passed signing, SBOM, provenance and results verification, admission and rollout. The ready Pod's runtime image ID matched the replacement digest, and the quotation stayed equal. |
| Runtime compatibility | Both actual images scanned as Alpine 3.23.6, with zero reported vulnerabilities and no missing-EOL-metadata warning. |
| Policy field | Kyverno accepted the `attestations[].type` field; the deprecated `predicateType` policy-field warning did not appear. |
| Evidence | Archive checksum and 77 internal file hashes verified. Both image evidence sets are present; state, registry credentials and private keys are excluded. |
| Cleanup | The lifecycle completed with exit code 0 and retained its package; the temporary private-key directory was removed. |

Initial digest: `sha256:44238005cd339538f85966ea732df8394bcdf9781f5e2b73d4dcf6b53dc03f0a`.

Replacement digest: `sha256:2fee127586459e6138ba8bec589ab1b13861f4a5412b43fa68fb188982023f10`.

Evidence remains under `evidence/raw/run-XVliHU00/` and `evidence/packages/run-XVliHU00.tar.gz`. The archive SHA-256 is `61790c7a1edb6a94c8740c4c1b4289b3df5b9f3136d920422a14c5ca62e04fac`. `L01-image-update.json` records generation 2 and the ready replacement Pod; `L01-update/` contains that image's evidence. These generated files are intentionally excluded from Git.

## Regression checks and remaining validation

- 194 service/contract/scenario/packaging tests and 6 environment tests passed. The scenario tests call the real L01 functions with controlled external dependencies; the live run above supplies the separate integration evidence.
- 11 Python policy/configuration tests, 52 Conftest decisions, 9 Kyverno engine checks and 32 real-file Conftest checks passed.
- The service's 43 tests also passed inside the actual Alpine runtime image.
- Cosign classic-format/local transparency-option deprecations and Kyverno legacy-policy deprecations remain visible and recorded in the [migration plan](../docs/EN/cosign-bundle-migration.md). They were not silenced or bypassed.
- A fresh GitHub execution on the revised commit is still required to validate both native provenance steps, OIDC signing and hosted admission. No remote changes or workflow dispatches were performed during this validation.
