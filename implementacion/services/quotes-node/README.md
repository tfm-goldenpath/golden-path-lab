# quotes-node

A synthetic API for laboratory tests. Rates are test data, not commercial prices or an actuarial model. The service uses no personal data, external services or production npm dependencies. For a Spanish explanation of its laboratory role, see the [L01/F13 case](../../docs/ES/cases/L01-F13/README.md).

```bash
npm ci --ignore-scripts
npm test
npm start
```

Node 24 listens on port `3000` (configurable through `PORT`). `GET /healthz` returns `{"status":"ok"}`; `GET /version` returns `name`, `version` and `buildCommit`. The orchestrator must pass the actual commit through `--build-arg BUILD_COMMIT=...`; `unknown` is only for direct development.

```bash
curl -fsS http://localhost:3000/healthz
curl -fsS http://localhost:3000/version
curl -fsS -H 'Content-Type: application/json' -d '{"insuredAmountCents":100000,"coverage":"basic"}' http://localhost:3000/quotes
```

The last response must be `{"currency":"EUR","premiumCents":1000,"tariffVersion":"demo-v1"}`. The only accepted fields are `insuredAmountCents` (an integer from 100 to 100000000 inclusive) and `coverage` (`basic`: 1%; `extended`: 2%), rounding up to the nearest cent. Rules are separated from HTTP transport in `src/validation.js` and `src/quote.js`.

Invalid domain input or malformed JSON returns `400` with an identifiable error code. The body limit is 16 KiB (`413 BODY_TOO_LARGE`), content must be JSON (`415`), and unsupported paths or methods produce `404` or `405`. Tests exercise calculations, boundaries, the HTTP contract and body limits without Docker.

Build the image with this directory as its context. The laboratory passes `SERVICE_NODE_IMAGE` from `versions.env` through the Docker argument `NODE_IMAGE`; the Dockerfile has the same pinned default. The service runs as UID/GID `10001`, without filesystem writes or elevated privileges.

The runtime uses the official Node 24.21.0 image on Alpine 3.23, pinned to its `linux/amd64` manifest. The devcontainer retains a Debian development base. Separating the runtime avoids shipping compilers and utilities that the API does not need. npm and Yarn are removed because startup installs no dependencies: their findings are not filtered out of the report; those programs are absent from the delivered image. Alpine uses musl rather than glibc, so service tests must also run inside this image, especially if native dependencies are added later. Fewer components do not guarantee vulnerability-free future scans or change the HIGH/CRITICAL threshold.

Trivy 0.74.0's [Alpine EOL table](https://github.com/aquasecurity/trivy/blob/v0.74.0/pkg/detector/ospkg/alpine/alpine.go) recognizes 3.23 but omits 3.24. That omission produces a support-metadata warning even though scanning continues; it does not establish that Alpine 3.24 is end of life. The lab uses the supported 3.23 `main` branch (through 2027-11-01) to keep runtime and scanner metadata compatible, retaining the same Node version. Alpine [distinguishes `main` and `community` support](https://alpinelinux.org/releases/): 3.23 `community` support has ended, so adding packages from that repository requires reconsidering this choice. Revisit 3.24 with a released scanner that recognizes it and a new build, service test and vulnerability scan; do not suppress warnings or change the vulnerability threshold.

Selection references: [official Node image variants](https://github.com/nodejs/docker-node#image-variants) and the [Dockerfile used for the pinned Alpine 3.23 image](https://github.com/nodejs/docker-node/blob/93a7bafc324a85ac1ee461604cff87cffacb6d7a/24/alpine3.23/Dockerfile).

```bash
docker build --platform linux/amd64 --build-arg BUILD_COMMIT="$(git rev-parse HEAD)" -t quotes-node:dev .
docker run --rm --read-only --cap-drop ALL --security-opt no-new-privileges --mount "type=bind,source=$(pwd)/test,target=/app/test,readonly" quotes-node:dev node --test 'test/*.test.js'
docker run --rm --read-only --cap-drop ALL --security-opt no-new-privileges --publish 127.0.0.1:3000:3000 quotes-node:dev
```

This direct run checks the service. Laboratory delivery commands add registry access, digests, policies and evidence; direct execution does not replace those checks. See the [integrated execution guide](../../docs/EN/cases/L01-F13/runbook.md).
