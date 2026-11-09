# Independent Node HTTP consumer

You own `service/`, its tests, CI and `golden-path.json`. The separately checked
out engine owns policies, tools, verification and ephemeral local infrastructure.
This starter uses only Node built-ins; external dependencies are unsupported in
this first profile. Test with `npm ci --prefix service --ignore-scripts` and
`npm test --prefix service`. Start with `npm start --prefix service`.

Commit this repository before delivery. Supply your actual HTTPS repository
identity when initializing it. An absent remote is recorded as unverified;
local Git verification does not authenticate a remote host or GitHub OIDC.

Use the pinned engine's `bin/deliver check --consumer /absolute/consumer` and
`bin/deliver local --consumer /absolute/consumer` (invoke with `bash`). The engine
checkout must match `golden-path.json` exactly, including committed engine inputs.
Keep the fixed Dockerfile and `.dockerignore`: only package files and `src/`
enter the image. The runtime is Linux AMD64, Node 24, UID 10001, port 3000,
read-only filesystem, `/healthz` and `/version`; the Kubernetes Deployment is
named `quotes-node` in `tfm-golden`. The version returns the consumer commit.

See the pinned engine's `docs/EN/consumer-quickstart.md` (Spanish:
`docs/ES/consumer-quickstart.md`) for prerequisites, engine retrieval, controls,
evidence verification and owned-resource cleanup. Delivery prints the retained
evidence path in the engine checkout and automatically retires its resources.
Hosted signing, publication, Java and production clusters are unsupported.
