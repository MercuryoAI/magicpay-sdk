# API Reference

This document is the lookup reference for the public MagicPay SDK API.

If you are new to the package, start with [Getting Started](./getting-started.md)
before using this page as a lookup document.

## API Base URL

```text
https://agents-api.mercuryo.io/functions/v1/api
```

Create your API key in the MagicPay dashboard:
[`agents.mercuryo.io/signup`](https://agents.mercuryo.io/signup)

## Entrypoints

| Entrypoint | What it provides |
| --- | --- |
| `@mercuryo-ai/magicpay-sdk` | `createMagicPayClient(...)`, public runtime types, and the main client |
| `@mercuryo-ai/magicpay-sdk/core` | Lower-level pure request/session helpers |
| `@mercuryo-ai/magicpay-sdk/agentbrowse` | Optional bridge helpers for runtimes that already use AgentBrowse observed forms |
| `@mercuryo-ai/magicpay-sdk/gateway` | Gateway config and HTTP error helpers |
| `@mercuryo-ai/magicpay-sdk/session-client` | Lower-level helpers for session and request HTTP calls |
| `@mercuryo-ai/magicpay-sdk/session-flow` | Session-outcome builders and state classifiers |
| `@mercuryo-ai/magicpay-sdk/request-flow` | Request-state classifiers |

## `createMagicPayClient(...)`

```ts
createMagicPayClient({
  gateway: {
    apiKey: string,
    apiUrl: string,
  },
  fetchImpl?: typeof fetch,
})
```

`fetchImpl` lets you swap in a different `fetch` implementation — useful for
tests and for runtimes that route HTTP through a custom client.

## `client.sessions`

| Method | Purpose |
| --- | --- |
| `create(input, options?)` | Create a remote workflow session |
| `get(sessionId, options?)` | Fetch the raw session object from the server |
| `getState(sessionId, options?)` | Fetch the session and project it into `RemoteSessionState` |
| `describe(session)` | Project an already-fetched session into `RemoteSessionState` |
| `completeWithOutcome(sessionId, input, options?)` | Close the session with a final outcome |

`client.sessions.create(...)` always creates a universal workflow session.
Browser runtimes can optionally attach:

- `browser.sessionId` to bind the session to a live browser runtime
- `browser.run` and `browser.step` to preserve local browser execution metadata

If the `browser` block is omitted, the session remains API/headless-only.

### Session Lifecycle

A workflow session lives on the MagicPay server and has three states:

1. **Open** — created via `create(...)`, accepts `data.resolve(...)` and
   `actions.run(...)` calls. Multiple requests can run inside one session.
2. **Completed** — closed via `completeWithOutcome(...)` with a terminal
   outcome (`success`, `failure`, `abandoned`, etc.). No new requests
   accepted.
3. **Stopped** — terminated mid-flow (by the user, by a trust rule, or by
   the backend). In-flight `waitForResult(...)` calls resolve to
   `{ ok: false, reason: 'canceled', ... }` with `session_stop` details.

Rules of thumb:

- Create one session per logical task. Multiple related requests share
  the same session.
- Always call `completeWithOutcome(...)` when the task finishes — success
  or failure. Uncompleted sessions stay open until the server-side TTL
  expires; pending `waitForResult(...)` calls in other processes will hang
  until then or until the session is stopped.
- A session does not need a closing call for API-only flows if your
  runtime exits cleanly — the backend cleans up eventually — but
  completing explicitly keeps telemetry accurate and frees resources
  sooner.
- `canceled` on a `waitForResult(...)` with `session_stop` details means
  the session was terminated; do not retry the same request inside the
  same session.

## `client.profile`

| Method | Purpose |
| --- | --- |
| `facts(options?)` | Read profile data (name, email, etc.) without requiring approval |

`client.profile.facts()` is the broad open-data read model. It does not accept
observed browser targets and it does not decide which fact belongs to which
current input. Per-target matching on a live observed page is a browser-runtime
concern above this SDK, and that layer should return one terminal decision per
target (`matched`, `ambiguous`, or `no_match`) rather than matching raw
`profile.facts()` output in your own code.

## `client.data`

| Method | Purpose |
| --- | --- |
| `resolve(sessionId, input, options?)` | Create a data-request handle for the current session |
| `waitForResult(sessionId, requestId, options?)` | Wait for or resume the final data result |

## `client.actions`

| Method | Purpose |
| --- | --- |
| `run(sessionId, input, options?)` | Create an action-request handle for the current session |
| `waitForResult(sessionId, requestId, options?)` | Wait for or resume the final action result |
| `confirm(sessionId, input, options?)` | Convenience helper that creates and waits for an explicit confirmation action |

## Request Handles

`data.resolve(...)` and `actions.run(...)` return a `MagicPayRequestHandle`
with:

- `requestId`
- `sessionId`
- `status`
- `resolutionPath`
- optional `itemRef`

For idempotent retries, provide your own stable `clientRequestId` inside the
`input` object passed to `data.resolve(...)` or `actions.run(...)`.

## Client Request Options

| Option | Meaning |
| --- | --- |
| `timeoutMs` | Maximum local waiting window before the SDK returns `reason: "timeout"` |
| `signal` | Abort signal for caller-driven cancellation |

Default profile:

- timeout: `180_000` ms

Bridge-only metadata such as `pageRef`, `fillRef`, and `scopeRef` belongs on
the `input.bridge` field for `data.resolve(...)` or `actions.run(...)`, not in
the request-options object.

Those fields are optional and only belong to browser-driven integrations.

## Root Result Model

`data.waitForResult(...)`, `actions.waitForResult(...)`, and
`actions.confirm(...)` return one of two shapes:

- `{ ok: true, ... }` when the SDK already has the final values or action result;
- `{ ok: false, reason: "denied" | "expired" | "failed" | "canceled" | "timeout", ... }`
  when the request did not succeed.

The root SDK hides:

- request creation through `resolve(...)` / `run(...)`;
- waiting and polling through `waitForResult(...)`;
- result retrieval;
- `session_stop` handling and cancellation propagation.

## `@mercuryo-ai/magicpay-sdk/core`

Important pure helpers:

| Helper | Purpose |
| --- | --- |
| Request/session classifiers | Inspect lower-level response objects without the root client |
| Catalog and bridge helpers | Expose direct host and observed-form logic for runtimes that own their own HTTP layer |
| Session-state builders | Build session create/complete request bodies from higher-level state |

Use this subpath only when the root client is too high-level for your stack.

## `@mercuryo-ai/magicpay-sdk/agentbrowse`

Important optional bridge helpers:

| Helper | Purpose |
| --- | --- |
| `enrichObservedFormsForUrl(...)` | Attach candidate inventory metadata to observed forms for a host |
| `buildDataResolveInputForObservedForm(...)` | Convert one observed form into `data.resolve(...)` input |
| `prepareProtectedFillFromValues(...)` | Convert a values artifact into AgentBrowse protected-fill input |

Failure kinds for `buildDataResolveInputForObservedForm(...)` are documented in
[Error Reference](./error-reference.md).

## Gateway Error Helpers

| Helper | Purpose |
| --- | --- |
| `MagicPayRequestError` | Error class for network or backend request failures |
| `getMagicPayErrorCode(...)` | Normalize MagicPay error codes from a thrown error or response body |
| `getMagicPayErrorMessage(...)` | Normalize a readable error message |
| `isMagicPayRequestErrorStatus(...)` | Check whether an HTTP status is one the SDK treats as a request error |
