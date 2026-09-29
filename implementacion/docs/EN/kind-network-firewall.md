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

## Should temporary rules be added on every run?

**Keep any compatibility workaround explicit and conditional.** Unconditional
insertion in `demo.sh`, `postCreateCommand` or Docker startup would silently alter
firewall policy on healthy environments and can accumulate rules or use obsolete
bridge identifiers. It would also affect concurrent kind workloads.

If recurrence justifies a reusable opt-in wrapper, implement it as a separate
infrastructure helper with these acceptance criteria:

- Verify the daemon namespace, bridge option/name and IPv4 subnet dynamically;
  establish this exact legacy/nft conflict and require permission to change it.
- Leave a healthy environment unchanged. Serialize affected lab runs and account
  for other users of the shared kind bridge before inserting rules.
- Retain before/after state, unique ownership comments, catchable-signal cleanup,
  primary/recovery failures and manual recovery instructions.
- Run DNS and registry connectivity probes, the normal demo and cleanup checks.
  A networking workaround must not turn failed delivery checks into success.

This document proposes that helper; no automatic firewall mutation has been added
to the repository entry points.

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
This documentation follow-up used Codex with GPT-6, read-only environment checks
and documentation checks; it did not reapply the workaround or rerun integration.
