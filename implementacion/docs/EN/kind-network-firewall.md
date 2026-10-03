# kind networking in Codespaces: firewall diagnosis and recovery

[Environment guide](environment.md) · [Español](../ES/kind-network-firewall.md)

## What failed and what solved it

BuildKit could not resolve `registry-1.docker.io` through Docker's embedded DNS
(`127.0.0.11`). On this environment, the cause was blocked IPv4 forwarding:

- `iptables-legacy` had `FORWARD DROP` and Docker rules covering `docker0`, but
  no allowance for the user-defined kind bridge.
- `iptables-nft` had a separate `FORWARD ACCEPT` chain with `DOCKER-FORWARD`.
- A container on `kind` failed with `EAI_AGAIN`; the legacy DROP counter increased
  from 390 to 400 during the probe.
- Two temporary legacy forwarding rules restored DNS and allowed the complete
  real `make -C implementacion demo` execution to pass.

These observations establish a conflict between legacy and nft-backed iptables
rules. They do **not** establish use of Docker's native
`--firewall-backend=nftables` option. `iptables-nft` and that daemon option are
different configurations. Docker documents how a separate iptables DROP chain
can still block traffic accepted by nftables in its
[forwarding explanation](https://docs.docker.com/engine/network/firewall-nftables/#forward-policy-in-iptables).

No resolver, registry permission, admission policy or vulnerability threshold was
changed. The two temporary rules were removed after the execution, and the
original legacy FORWARD rules matched the saved snapshot exactly.

## Can this be changed in Codespaces?

The repository configures the privileged Docker-in-Docker feature in both
`.devcontainer/implementacion/devcontainer.json` and
`implementacion/.devcontainer/devcontainer.json`. With a daemon inside that
container and sufficient privileges, its network namespace's firewall can be
managed locally. This does not require changing GitHub's or Azure's external
firewall. A Codespace label or a working Docker socket alone does not establish
that a particular shell can administer the daemon's networking.

During the 2026-09-29 follow-up inspection, the approved command environment used
`unix:///var/run/docker.sock`; `dockerd` PID 67 and the inspecting shell both used
`net:[4026531840]`. The restricted agent sandbox used a different namespace and
could not see the daemon process. This explains why approved execution was needed
here. These namespace IDs are observations, not portable configuration values.

Before changing anything in another terminal/environment, inspect:

```bash
docker context inspect --format '{{.Endpoints.docker.Host}}'
pgrep -a -x dockerd
readlink /proc/self/ns/net
# Compare with /proc/<dockerd-PID>/ns/net using sudo when necessary.
readlink -f /usr/sbin/iptables
sudo iptables-legacy -S FORWARD
sudo iptables-nft -S FORWARD
docker network inspect kind
```

If the daemon is remote or its namespace cannot be verified, have its environment
owner diagnose the forwarding rules there. Changing a client's local firewall
will not repair a remote daemon. Do not infer this specific conflict from a DNS
failure alone: registry outages, proxies and upstream DNS can also fail.

## Exact temporary change used

The observed bridge was `br-6ccd0f219c98`, subnet `172.18.0.0/16`. The wrapper
inserted these two rules at the beginning of the **legacy IPv4 FORWARD** chain:

```text
-i br-6ccd0f219c98 -s 172.18.0.0/16 -m comment --comment sbom-integration-attempt-kmesrCNn -j ACCEPT
-o br-6ccd0f219c98 -d 172.18.0.0/16 -m conntrack --ctstate RELATED,ESTABLISHED -m comment --comment sbom-integration-attempt-kmesrCNn -j ACCEPT
```

The first permits forwarded traffic from the kind bridge/subnet. The second
permits related or established return traffic. They cover all protocols and
destinations for that bridge; they are not DNS-only rules and are not isolated to
one laboratory run. Other containers on the shared kind bridge are also affected.
Insertion before existing legacy chains bypasses their later filtering for
matching packets; other active firewall tables still apply.

The retained wrapper is
`implementacion/evidence/raw/f05-f06-l03-network-review/run-with-forwarding.sh`
(ignored evidence, not a distributed setup script). Its sequence was:

1. Inspect the existing kind network; derive the default bridge name and require
   the observed subnet/gateway. Save `iptables-legacy -S FORWARD`.
2. Install EXIT/INT/TERM cleanup **before** mutation. Use a unique attempt comment.
3. Insert the return rule, then the outbound rule, each with
   `sudo -n iptables-legacy -I FORWARD 1` and the exact arguments above.
4. Resolve the registry from a disposable container on kind, then run the demo.
5. Check each exact rule with `-C` and remove it with `-D`. Compare the resulting
   chain against the saved snapshot. Retain primary and recovery exit codes
   separately; either failure makes the wrapper fail.

For manual recovery after an interrupted wrapper, inspect the retained attempt
and active chain, then use `sudo iptables-legacy -D FORWARD` followed by each
**exact matching rule** above. These example identifiers apply only to the
recorded attempt. Never flush chains, restore a whole old ruleset over concurrent
changes, or globally set `FORWARD ACCEPT` as this laboratory's workaround.
EXIT/INT/TERM cleanup cannot cover SIGKILL or host loss; inspect for leftover
attempt comments before retrying. The original wrapper assumes this environment's
subnet and default bridge naming, so do not install it as a general startup hook.

## Repeatable recovery in Codespaces

At the user's request, local `lab_create` now invokes
[`codespaces-network.py`](../../scripts/codespaces-network.py) when
`CODESPACES=true`, after kind creation and before registry/BuildKit creation.
This covers local delivery and manual-task preparation in both R and G, outside
the human task timer. Hosted lane B does not call the helper. The helper itself
skips environments without that flag.

Each invocation checks the environment. It inserts the temporary pair only when:

- The Docker endpoint is the local socket and the one visible daemon shares the
  caller's network namespace. The current kind network, bridge and IPv4 subnet
  are discovered and checked; identifiers from past attempts are never reused.
- DNS fails on kind, succeeds on the default Docker bridge, and the legacy DROP
  counter rises during the probe. The legacy/nft forwarding, user and isolation
  chains must match the recorded conflict, allowing only this helper's exact
  existing rules. Unknown policies or unrelated connectivity failures stop
  preparation without adding rules.
- The kind bridge has no attached containers except nodes labelled for the
  current lab cluster. Standalone repair requires an idle bridge. Mutations are
  serialized by a local lock; unrelated Docker operations do not take this lock,
  so prepare laboratories sequentially and avoid concurrent firewall changes.

The pair has a stable comment containing the full current network ID. `-C`
checks prevent duplicate insertion. DNS and TLS-verified registry HTTPS must pass
after insertion; HTTP 401 from `/v2/` confirms connectivity to the authenticated
endpoint. An error or catchable interruption rolls back only newly added rules
and retains primary/rollback results. Healthy connectivity leaves rules unchanged.

Successful rules remain active for subsequent preparations until explicitly
removed or lost on environment restart. They affect the **whole kind bridge**,
including future attached containers; this is an environment compatibility change.
Normal lab cleanup retains this shared pair. It never flushes a chain, changes
FORWARD policy or edits daemon startup. A fresh invocation diagnoses recurrence
and can restore the pair after restart. SIGKILL/host loss cannot guarantee rollback;
the JSON includes exact removal commands before insertion.

From the repository root, optional standalone commands are:

```bash
python3 implementacion/scripts/codespaces-network.py check
python3 implementacion/scripts/codespaces-network.py ensure
# After all lab/task cleanup, with no containers attached to kind:
python3 implementacion/scripts/codespaces-network.py remove
```

Each prints `Codespaces network: HEALTHY`, `RESTORED`, `REMOVED_OR_ABSENT` or a
failure and an evidence path. Standalone files are under ignored
`evidence/environment/`. The automatic hook writes `codespaces-network.json` in
the run directory; normal packaging includes this report. It retains identity,
before/after rules, counters, probe command outputs and removal commands. Probes
use the existing pinned kind image with `--pull=never` and remove their own
containers. The helper requires the kind bridge and cached image, normally
created by `lab_create`; it does not create a cluster itself.

The latest preparation `run-E5wAPDEL` / `task-3f6b2c31609e` remains `INCOMPLETE`
after another Docker DNS timeout; its task timer never started and cleanup
completed. The boot identity changed and the previous temporary pair was absent.
The helper's real network and bounded BuildKit observations are retained under
`evidence/environment/codespaces-network-development/`, separately from human
calibration. Source changes require a **new session/plan name**, keeping the old
attempt. See [reusable calibration commands](manual-calibration-session.md).

## Proposed long-term fix

Make Docker startup use a consistent iptables frontend and firewall lifecycle in
the environment that owns the daemon. Preserve the current tool pins while
investigating why legacy rules coexist with the current nft-backed chains.

1. Retain diagnostics/evidence before rebuilding. Inspect the effective
   Docker-in-Docker startup script, alternatives selection, daemon configuration
   and any earlier daemon startup that may have populated legacy rules. The
   origin of the stale rules has not yet been established.
2. Reproduce in a fresh Codespace using the repository's selected devcontainer.
   A devcontainer rebuild alone may retain an outer network namespace; if the
   daemon lives outside it, repair/recreate that owning environment instead.
3. If reproducible, make a focused startup/configuration correction in both
   devcontainer definitions so Docker consistently manages the intended rules.
   Review existing firewall ownership before removing stale rules. Merely changing
   the `iptables` symlink does not remove already-installed legacy rules.
4. Prove DNS and registry HTTPS access from kind, image build/pull and the complete
   demo without temporary exceptions. Repeat after environment restart/recreation
   and verify that no conflicting legacy DROP path reappears.

Switching to Docker's experimental native nftables backend, disabling Docker's
firewall management, or changing the global FORWARD policy is not the proposed
fix. See Docker's [firewall configuration guidance](https://docs.docker.com/engine/network/packet-filtering-firewalls/).
The permanent startup correction remains **proposed and untested**; the temporary
workaround has real integration evidence.

## Evidence and review

Successful local run: `run-nWpDa9ZN`; wrapper attempt: `attempt-kmesrCNn`.
Both `primaryStatus` and `networkRecoveryStatus` were 0. The archive audit verified
776 internal hashes and 108 authentic bundles, and rejected the two expected F08
altered bundles. Local F05/F06 CI and admission plus integrated L03 passed.
Hosted negative scenarios remain NOT_EXECUTED; human review remains pending.

See the [validation record](../../registros/f05_f06_l03_validation_EN.md) for exact
source/digest/archive identities, previous failures and acceptance limits.
Network logs, the actual wrapper, before/after snapshots and audit outputs remain
under `evidence/raw/f05-f06-l03-network-review/` relative to `implementacion/`.
The original documentation follow-up used Codex with GPT-6 and read-only checks;
it did not reapply the workaround. The later automatic helper is a separate
Codex-assisted implementation with synthetic guard/orchestration tests and real
connectivity/BuildKit checks. Full scenario and human acceptance remain separate.
