# Glossary

Terms you will see in examples, API reference, and error messages. Organized
from highest-level concepts down to specific identifiers.

## Session and request model

### workflow session

A server-side object that groups related requests for one task (e.g. one
checkout, one login). Created with `client.sessions.create(...)`, closed
with `client.sessions.completeWithOutcome(...)`.

### request

A single unit of work inside a session: fetching data (login credentials,
card details) or running an action (sign transaction, confirm payment).
Created by `data.resolve(...)` or `actions.run(...)`.

### request artifact

The one-time result returned after a request is approved and executed. The
server returns it exactly once — the SDK's `waitForResult(...)` handles
the claim. If you need to hand the artifact to another process, pass the
whole result object, not the raw values.

### `artifact.kind`

Which shape the artifact takes. One of:

- `values` — a map of field names to strings (login/identity/card form
  data).
- `signature` — a cryptographic signature plus the signer identity.
- `reference` — an opaque reference to an external resource, with optional
  metadata.
- `confirmation` — just `{ confirmed: true }`, for actions where the only
  outcome needed is approval.

### `resolutionPath`

How MagicPay plans to fulfill a request. Chosen by MagicPay based on trust
rules, policy, and past approvals. One of:

- `auto` — resolved without asking the user; covered by a trust rule or
  prior approval.
- `confirm` — the user must explicitly approve the request in the
  MagicPay UI before values are returned.
- `provide` — the user must type in values directly (used when no stored
  item matches).

Your runtime does not pick `resolutionPath`; it reads it from the handle
and tailors UX (e.g. «waiting for your approval in MagicPay»).

## Stable identifiers

### `requestId`

Server-assigned ID for a single request. Use it to resume waiting via
`client.data.waitForResult(sessionId, requestId)` from another process.

### `clientRequestId`

A stable id **you** pick and pass into `data.resolve(...)` or
`actions.run(...)`. Retrying with the same `clientRequestId` returns the
same `requestId` instead of creating a duplicate — the flow is idempotent
as long as the inputs match.

Good strategies:

- deterministic from your own task id: `"checkout-${taskId}-login"`;
- UUID v4 generated once per attempt and stored alongside the task state.

Avoid: `Date.now()` alone (two retries in the same millisecond collapse);
random strings that you do not persist (defeats the purpose).

### `itemRef`

Stable id of the vault item (or capability-bearing resource) that the
request refers to. Present on request handles once MagicPay has picked
which item to use. Pass `targetItemRef` back in a follow-up request if you
want to pin subsequent calls to the same item.

### vault item

A user-approved saved record in MagicPay — a login, identity document,
payment card, crypto wallet, or similar. Vault items are what `data.resolve(...)`
returns values from.

### profile fact

Public user data (name, email, locale) that MagicPay can return without
requiring approval. Read with `client.profile.facts()`. This is the broad
open-data read model, not a target-by-target browser matching API.

### `resolve-fields`

Observed-target helper used by browser or CLI runtimes to match current
non-secret fields against the session-local open-data snapshot. Returns one
terminal result per target: `matched`, `ambiguous`, or `no_match`.

## Request input fields

### `saveHint`

Metadata telling MagicPay how to classify a request so it can (optionally)
save the result as a new or updated vault item:

- `category` — one of `login`, `identity`, `payment_card`, etc.
- `displayName` — human-readable label, shown in the MagicPay UI.
- `schemaRef` — standard schema id for the field set (e.g. `login.basic`).

### bridge context

Optional ids that tie a request to a specific browser page and form when
your runtime is browser-driven. Present on `input.bridge`:

- `pageRef` — the AgentBrowse `pageRef` identifying the current page state.
- `fillRef` — the AgentBrowse fillable-form id returned by
  `observe(...)`.
- `scopeRef` — the AgentBrowse scope id containing the form.
- `surfaceRef` — target-ref of a specific visible control (rarely needed).

Omit the whole block for API-only flows.

## Errors and stop conditions

### `session_stop`

Terminal state where a session was ended mid-flow by the user, a trust
rule, or the backend. Surfaces as `{ ok: false, reason: 'canceled' }` with
stop details attached to `waitForResult(...)`. Do not retry the same
request inside the same session after a `session_stop`.

### `host_resolution_failed`

Failure kind from `buildDataResolveInputForObservedForm(...)` — the bridge
could not match the observed page to a known host. Caller passes a valid
page URL or host catalog.

### `stored_secret_not_available`

Failure kind from `buildDataResolveInputForObservedForm(...)` — the chosen
vault-item candidate is no longer available for this host. Caller
refreshes the candidate inventory or picks a different item.
