# Error Reference

This document lists every failure your code may encounter when using the
MagicPay SDK, and what to do about each one. There are three kinds:

1. **Result reasons** from `waitForResult(...)` — the request completed the
   server round trip but did not produce a usable artifact.
2. **Bridge failure kinds** from the AgentBrowse bridge helpers — input
   could not be built from an observed form.
3. **Thrown errors** from HTTP-level failures — the SDK could not talk to
   the MagicPay service at all.

## 1. Result Reasons

`client.data.waitForResult(...)`, `client.actions.waitForResult(...)`, and
`client.actions.confirm(...)` return `{ ok: false, reason: ... }` when a
request does not produce a usable artifact. `client.data.resolve(...)` and
`client.actions.run(...)` return request handles, not final results, so they
cannot return these reasons directly.

| Reason | When it happens | What to do |
| --- | --- | --- |
| `denied` | The user or a trust rule denied the request. | Stop the flow, or ask the user whether to retry with different input. |
| `expired` | The server-side request TTL elapsed before the user approved or denied. | Create a fresh request if the step still matters. |
| `failed` | MagicPay or a downstream executor returned a terminal failure. Check `errorCode` on the returned result for a specific code. | Inspect `errorCode`, logs, and the surrounding task state before retrying. |
| `canceled` | The caller aborted (`signal`), the session stopped (the `session_stop` path below), or the request was canceled server-side. | Stop the current flow unless your application intentionally resumes it. |
| `timeout` | The local wait window (`timeoutMs`, default 180s) elapsed before the server finished. | The server-side request may still be alive — resume later by calling `waitForResult(...)` with the same `requestId`. |

### `timeout` vs `expired`

These two are often confused:

- `timeout` is **local**. Your `waitForResult(...)` call gave up because
  `timeoutMs` elapsed. The underlying request is still running on the
  server; you can call `waitForResult(...)` again with the same `requestId`
  to resume waiting.
- `expired` is **server-side**. The request itself reached its TTL and the
  server marked it as no longer eligible for approval. A new `resolve(...)`
  or `run(...)` call is needed.

### `session_stop` and `canceled`

When a session stops mid-request (user action, policy, or a parallel
`completeWithOutcome` call), MagicPay surfaces this as `reason: 'canceled'`
with the session-stop details attached. The returned result includes:

- `message` — human-readable explanation.
- `code` — stable code identifying why the session stopped.

If your runtime needs to branch on session-stop causes, check the `code`
before deciding whether to retry or abandon the flow.

## 2. Bridge Failure Kinds

`buildResolveInput(...)` (from `@mercuryo-ai/magicpay-sdk/agentbrowse`)
can fail before anything reaches the network:

| Kind | When it happens | What to do |
| --- | --- | --- |
| `host_resolution_failed` | The bridge could not resolve a usable host from the page URL, host, or catalog. | Pass a valid page URL or a catalog that includes a host. |
| `stored_secret_not_available` | The chosen vault-item candidate is not available for the observed form and host. | Refresh the candidate inventory or pick a different vault item. |

## 3. AgentBrowse Fill Contract

When your runtime composes `match` / `resolve` / `fill` from
`@mercuryo-ai/agentbrowse` with the SDK's composable helpers, three
independent failure surfaces can be reached in one call chain:

- **Your resolver adapter's exceptions.** Anything thrown inside
  `resolver.resolve(...)` or `resolver.fill(...)` propagates. The
  composing example at
  [API Reference → Composing with AgentBrowse primitives](./api-reference.md#composing-with-agentbrowse-primitives)
  uses `throw new Error(result.message ?? result.reason)` so that
  `MagicPayRequestFailureReason` values (`denied`, `expired`, `failed`,
  `canceled`, `timeout`) surface as thrown errors on the caller side —
  the SDK does not re-map them into AgentBrowse failures for you.
- **Bridge input failures.** `buildResolveInput(...)` returns an
  `{ success: false, kind }` outcome with the two kinds listed in
  section 2 — your adapter decides whether to throw or short-circuit.
- **AgentBrowse contract failures.** `fill(...)` itself can return a
  typed contract failure when the match result is ambiguous, has no
  match, or needs a capability your resolver did not implement. The
  stable `error` codes are `match_no_match`, `match_ambiguous`,
  `match_resolver_required`, `match_value_unavailable`, and
  `match_artifact_unavailable`. See the `@mercuryo-ai/agentbrowse`
  package's own API Reference for the full table.

Branch on the most specific layer first: adapter exceptions, then
bridge input failures, then the AgentBrowse contract failure codes.

## 4. HTTP-Level Errors

When the SDK cannot talk to the MagicPay service — network failure, auth
rejection, rate limiting, backend error — methods throw. Catch with the
helpers exported from the root package:

| Helper | What it does |
| --- | --- |
| `MagicPayRequestError` | Error class thrown on network or backend request failures. |
| `getMagicPayErrorCode(err)` | Normalize the MagicPay error code from a thrown error or response body. |
| `getMagicPayErrorMessage(err)` | Normalize a readable message for logs or UI. |
| `isMagicPayRequestErrorStatus(err)` | Check whether an HTTP status is one the SDK treats as a request error. |

```ts
import {
  createMagicPayClient,
  MagicPayRequestError,
  getMagicPayErrorCode,
} from '@mercuryo-ai/magicpay-sdk';

try {
  await client.profile.facts();
} catch (err) {
  if (err instanceof MagicPayRequestError) {
    console.error('MagicPay error:', getMagicPayErrorCode(err));
  } else {
    throw err;
  }
}
```
