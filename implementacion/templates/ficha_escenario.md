# Compact scenario record

Use the current catalogue identifiers and collect completed records in a single file. Specify preparation, expectations and criteria before executing each case; record observed results when evidence is available. The filename is retained for compatibility with existing links.

| Field | Content to specify before evaluation |
|---|---|
| Identification | Fxx/Lxx ID, control block and type: fault or legitimate. |
| Rationale | Threat/requirement, coverage-based selection and source; sector relationship where supported. |
| Preparation | Valid initial input, preconditions, actor capability or simulated fault, trusted components and primary alteration. Leave concrete versions or data pending until verified. |
| Rule under evaluation | Exact acceptance/rejection condition and policy reference. |
| Expected timing | Injection point, expected detection phase and last operation at which blocking is allowed. Fix these before measurement. |
| Checks | Main path and directed downstream check where applicable; how the property is isolated from unrelated rejections. |
| Evidence and permitted use | Record attributing the decision to the control, digest/run and related legitimate case. State whether the input is synthetic or a real scan, and its permitted uses. |
| Traceability | Test, versions and observed result. Initially: **not executed**. Link records when available. |

The reference twenty-scenario catalogue and methodology remain in the Spanish [thesis repository](https://github.com/tfm-goldenpath/golden-path). When preparing operational records, identify the documentary revision used and retain its Fxx/Lxx identifiers; this repository does not maintain a second independent academic catalogue. English and Spanish descriptions refer to the same executable cases and acceptance criteria.

Operational and directed checks have separate identifiers and do not increase the corpus denominator. A generic error does not demonstrate detection; a barrier that was not reached must not be presented as exercised.
