# @mercuryo-ai/magicpay-sdk

[![npm version](https://img.shields.io/npm/v/@mercuryo-ai/magicpay-sdk)](https://www.npmjs.com/package/@mercuryo-ai/magicpay-sdk) [![License](https://img.shields.io/badge/license-proprietary-red.svg)](LICENSE.md) [![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

TypeScript SDK for MagicPay: read the user's public profile data, resolve
login/identity/payment form values through approved requests, and run
protected actions.

For browser runtimes that already have observed target refs, use the CLI or
browser-runtime `resolve-fields` helper for narrow open-field matching instead
of trying to match raw `profile.facts()` values in your own prompt or code.

The main client methods are `profile.facts()`,
`data.resolve(...)` / `data.waitForResult(...)`, and
`actions.run(...)` / `actions.waitForResult(...)`.

Use it when your application, worker, agent runtime, or MCP tool needs to:

- read the user's public profile data (name, email) without requiring approval;
- resolve login, identity, wallet, or payment-form data through one request flow;
- run protected actions such as confirmation or provider-backed execution;
- wait for a request to complete without writing your own polling logic;
- keep request inputs, session helpers, and bridge metadata inside one typed client.

The SDK handles communication with the MagicPay service. Browser control,
approval UX, and the business step that follows a returned value or action
result stay in your application.

## Key Terms

The examples below use a few names that recur across the API:

- `session` — a workflow session you create to group related requests.
- `request` — a single task inside a session: either resolving data or
  running a protected action.
- `requestId` / request handle — returned from `data.resolve(...)` or
  `actions.run(...)`; passed into `waitForResult(...)` to wait for the
  outcome.
- `artifact` — the one-time result of a completed request (the actual
  values, or the action outcome). Readable once, for security.
- `clientRequestId` — a stable id you choose, so retries stay idempotent.
- `profile fact` — reusable public user data (name, email, locale) that
  MagicPay can return immediately without approval.

## When To Use It

This package is the right entry point when:

- you run trusted Node or TypeScript code;
- you already own the surrounding browser or API orchestration;
- you want one typed runtime client instead of assembling raw HTTP requests.

Typical integrations:

- backend services and workers;
- MCP tools and agent backends;
- browser runtimes that already know the current page or form context;
- provider-specific flows that need request results without exposing protected values to the model.

## Install

```bash
npm i @mercuryo-ai/magicpay-sdk
```

Create your API key at
[`agents.mercuryo.io/signup`](https://agents.mercuryo.io/signup).

MagicPay API base URL:

```text
https://agents-api.mercuryo.io/functions/v1/api
```

## Choose An Entrypoint

Most integrations use the root package only.

| Entrypoint | Use it when |
| --- | --- |
| `@mercuryo-ai/magicpay-sdk` | You want the standard SDK with all features: session helpers, profile data, data resolution, and action execution. |
| `@mercuryo-ai/magicpay-sdk/core` | You want lower-level pure helpers for request/session state without the networked root client. |
| `@mercuryo-ai/magicpay-sdk/agentbrowse` | You already use `@mercuryo-ai/agentbrowse` and want the optional bridge from observed forms into MagicPay request input. |

If your runtime already starts from observed browser forms and you want the
optional bridge helpers, add AgentBrowse as well:

```bash
npm i @mercuryo-ai/magicpay-sdk @mercuryo-ai/agentbrowse
```

## Quick Start

The minimum happy path: create a client, open a session, resolve one set of
protected values.

```ts
import { createMagicPayClient } from '@mercuryo-ai/magicpay-sdk';

const client = createMagicPayClient({
  gateway: {
    apiKey: process.env.MAGICPAY_API_KEY!,
    apiUrl: 'https://agents-api.mercuryo.io/functions/v1/api',
  },
});

const { session } = await client.sessions.create({
  description: 'Renew API usage access',
  merchantName: 'ChatGPT',
});

const handle = await client.data.resolve(session.id, {
  clientRequestId: 'chatgpt-login-1',
  fields: [{ key: 'username' }, { key: 'password' }],
  context: { url: 'https://chatgpt.com/auth/login', formPurpose: 'login' },
});

const result = await client.data.waitForResult(session.id, handle);

if (!result.ok) throw new Error(result.reason);
if (result.artifact.kind !== 'values') {
  throw new Error(`Unexpected artifact kind: ${result.artifact.kind}`);
}

console.log(result.artifact.values);
```

The flow is always the same shape:

1. create (or reuse) a session;
2. call `profile.facts()` when open reusable data is enough, or
   `data.resolve(...)` → `data.waitForResult(...)` for protected field
   values, or `actions.run(...)` → `actions.waitForResult(...)` for protected
   actions;
3. pass the returned values or action result into your own runtime step.

### `profile.facts()` vs `resolve-fields`

Use `profile.facts()` as the broad open-data read model when your runtime needs
reusable public facts such as name, email, or locale.

Use `resolve-fields` only in browser or CLI runtimes that already have live
observed targets and need a per-target decision for the current page. It
returns one terminal result per target:

- `matched` when one confident candidate is available now;
- `ambiguous` when multiple candidates still compete;
- `no_match` when no applicable open value survives matching.

The root SDK does not take raw `profile.facts()` output and perform page-level
matching for you. That target-by-target decision belongs to the browser-runtime
`resolve-fields` helper.

### Why two calls (`resolve` + `waitForResult`)?

Creating the request and waiting for its result are separate calls on
purpose. `resolve(...)` returns a `requestId` immediately; the actual
wait can happen in the same process, in another process, or after a
reconnect. This matters when:

- your runtime runs in a short-lived function and must persist the
  `requestId` before the user approves;
- you want to show "waiting for approval" UI and only start polling
  later;
- you need idempotent retries — passing the same `clientRequestId`
  returns the same `requestId` instead of creating a duplicate.

If you just want the result in one shot, chain the two calls:

```ts
const handle = await client.data.resolve(sessionId, input);
const result = await client.data.waitForResult(sessionId, handle);
```

### What does a successful result look like?

`waitForResult(...)` returns `{ ok: true, artifact }` where `artifact.kind`
is one of:

- `values` — a field map like `{ username, password }` or
  `{ card_number, exp_month, exp_year, cvv }`. Most data-request results.
- `signature` — a `{ signature, signer }` pair, for requests asking the
  user to sign something.
- `reference` — an opaque `{ reference, metadata? }` pointing at an
  external resource (e.g. a provider-specific transaction id).
- `confirmation` — `{ confirmed: true }` for actions where the user
  approval itself is the result.

Branch on `artifact.kind` before using the values. See
[Error Reference](./docs/error-reference.md) for `{ ok: false, reason }`
handling.

A fuller example with `profile.facts()`, a protected action, and downstream
provider call is in [Getting Started](./docs/getting-started.md) and
[`examples/root-client-flow.ts`](./examples/root-client-flow.ts).

## What Happens After A Result

Your runtime decides what to do with a successful result:

- fill a browser form;
- call a provider API;
- continue a broader orchestration flow;
- report progress back to your own UI or logs.

For browser runtimes, `client.sessions.create(...)` accepts an optional
`browser` binding with `sessionId`, `run`, and `step`. Backend and
API-only flows leave that block out.

For specialized integrations, the SDK also publishes lower-level helpers
under `@mercuryo-ai/magicpay-sdk/core` and
`@mercuryo-ai/magicpay-sdk/agentbrowse`. See
[Integration Modes](./docs/integration-modes.md) if you need either.

## Continue Reading

- Start with [Getting Started](./docs/getting-started.md) for the first root
  integration.
- Read [Integration Modes](./docs/integration-modes.md) if you need help
  choosing between the root SDK, pure helpers, and the optional AgentBrowse
  bridge.
- Use [API Reference](./docs/api-reference.md) and
  [Error Reference](./docs/error-reference.md) as lookup documents while
  integrating.
- Use [Examples Index](./docs/examples.md) for example coverage and bridge
  notes.
- Use [Glossary](./docs/glossary.md) when terms like `resolutionPath`,
  `requestId`, `itemRef`, or `profile fact` are still new.
