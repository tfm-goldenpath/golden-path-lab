# Independent Java consumer

Profile: `java-http-consumer/v1`. Service sources and tests are yours; the POM,
Dockerfile and Docker context are fixed for this trial. No production libraries.
Use the pinned engine's `docs/EN/java-consumer-quickstart.md` (also available in ES)
for tests, delivery, evidence verification and cleanup. Commit inputs before use.

Optional coverage: commit `service/quality-gate.json` with schema
`java-quality-gate/v1` and reviewed lines/methods/branches thresholds, then use
`bash "$ENGINE/bin/deliver" quality --consumer "$CONSUMER" --output "$FRESH_OUTPUT"`.
Without opt-in, quality is NOT_EXECUTED and CI runs ordinary tests once. The
workflow checks out the exact engine and uses bounded Docker producers on Ubuntu;
it does not require Node inside the Maven image. See the engine quickstart for
complete configuration, resource gates, evidence verification and limits.
