# API Reference

This document is the lookup reference for the public MagicPay SDK API.

If you are new to the package, start with [Getting Started](./getting-started.md)
before using this page as a lookup document.

## API Base URL

```text
https://agents-api.mercuryo.io/functions/v1/api
```

Create your API key in the MagicPay control plane:
[`agents.mercuryo.io/signup`](https://agents.mercuryo.io/signup)

## Entrypoints

| Entrypoint | Surface |
| --- | --- |
| `@mercuryo-ai/magicpay-sdk` | `createMagicPayClient(...)`, gateway helpers, public runtime types |
| `@mercuryo-ai/magicpay-sdk/core` | Pure request, session, and catalog helpers |
| `@mercuryo-ai/magicpay-sdk/agentbrowse` | Optional bridge helpers for runtimes that already use AgentBrowse observed forms |
| `@mercuryo-ai/magicpay-sdk/gateway` | Gateway config and transport-error helpers |
| `@mercuryo-ai/magicpay-sdk/session-client` | Lower-level session transport helpers |
| `@mercuryo-ai/magicpay-sdk/session-flow` | Session-outcome builders and classifiers |
| `@mercuryo-ai/magicpay-sdk/request-flow` | Session request-state classifiers |
| `@mercuryo-ai/magicpay-sdk/secret-flow` | Lower-level secret-request transport and pure flow helpers |

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

`fetchImpl` lets you replace network transport in tests or in a custom runtime.

## `client.sessions`

| Method | Purpose |
| --- | --- |
| `create(input, options?)` | Create a remote session |
| `get(sessionId, options?)` | Fetch the raw remote session envelope |
| `getState(sessionId, options?)` | Fetch and immediately project the envelope into `RemoteSessionState` |
| `describe(session)` | Project an already-fetched session envelope into `RemoteSessionState` |
| `completeWithOutcome(sessionId, input, options?)` | Complete the remote session with a final outcome |

## `client.secrets`

| Method | Purpose |
| --- | --- |
| `fetchCatalog(sessionId, urlOrHost, options?)` | Load the stored-secret catalog for one host |
| `createRequest(input, options?)` | Create one approval request for one protected step |
| `poll(sessionId, requestId, options?)` | Fetch the latest request snapshot once |
| `pollUntil(sessionId, requestId, options?)` | Poll until a configured stop condition or transport failure |
| `claim(sessionId, requestId, options?)` | Claim the one-time payload with an auto-generated claim ID |
| `claim(sessionId, requestId, claimId, options?)` | Claim the one-time payload with your own claim ID |

## `pollUntil(...)` Options

| Option | Meaning |
| --- | --- |
| `stopWhen` | Stop on `fulfilled` or on any `terminal` status |
| `timeoutMs` | Maximum polling window |
| `intervalMs` | Initial polling interval |
| `maxIntervalMs` | Upper bound for the polling interval |
| `backoffMultiplier` | Multiplier for interval growth |
| `signal` | Abort signal for caller-driven cancellation |
| `onAttempt` | Callback for each poll attempt |

Default profile:

- timeout: `180_000` ms
- initial interval: `10_000` ms
- max interval: `30_000` ms
- backoff multiplier: `1.2`

## `nextAction` Values

`describeSecretRequestStatus(...)` and `pollUntil(...)` return a status contract
with `nextAction` values that help orchestration layers branch correctly.

| `nextAction` | Meaning |
| --- | --- |
| `poll-secret` | Approval is still pending. |
| `fill-secret` | The request is fulfilled and the payload can be claimed. |
| `ask-user` | Human approval or recovery is required. |
| `request-secret` | Create a new request instead of continuing the current one. |

## `@mercuryo-ai/magicpay-sdk/core`

Important pure helpers:

| Helper | Purpose |
| --- | --- |
| `describeSecretRequestStatus(...)` | Project request status into orchestration-friendly state |
| `evaluateSecretRequestForFill(...)` | Check whether a fulfilled request still matches the observed fill context |
| `resolveSecretCatalogContext(...)` | Resolve the host-specific catalog entry for a URL or host |
| `buildCreateRemoteSessionInput(...)` | Build session-create input from higher-level state |
| `buildCompleteRemoteSessionInput(...)` | Build session-completion input from higher-level state |

## `@mercuryo-ai/magicpay-sdk/agentbrowse`

Important optional bridge helpers:

| Helper | Purpose |
| --- | --- |
| `enrichObservedFormsForUrl(...)` | Attach stored-secret candidates to observed forms for a host |
| `buildRequestInputForObservedForm(...)` | Convert one observed form into MagicPay request input |
| `prepareProtectedFillFromClaim(...)` | Convert a fulfilled claim into AgentBrowse protected-fill input |

Failure kinds for `buildRequestInputForObservedForm(...)` are documented in
[Error Reference](./error-reference.md).

## Gateway Error Helpers

| Helper | Purpose |
| --- | --- |
| `MagicPayRequestError` | Error class for transport or backend request failures |
| `getMagicPayErrorCode(...)` | Normalize MagicPay error codes from a thrown error or response payload |
| `getMagicPayErrorMessage(...)` | Normalize a readable error message |
| `isMagicPayRequestErrorStatus(...)` | Check whether an HTTP status belongs to the SDK error contract |
