# Getting Started

Use this guide when you want the first root-SDK integration from your own
runtime.

The standard flow is:

1. create the client;
2. create or load a workflow session;
3. read `profile.facts()` for reusable open data;
4. call `data.resolve(...)` and `data.waitForResult(...)` for form data;
5. call `actions.run(...)` and `actions.waitForResult(...)` for protected
   actions when the flow needs them.

## Before You Start

You need:

- Node 18 or newer;
- a MagicPay API key from
  [`agents.mercuryo.io/signup`](https://agents.mercuryo.io/signup);
- page or task context that your runtime already understands.

You can either:

- create a new session through `client.sessions.create(...)`; or
- reuse an existing `sessionId` created elsewhere in your runtime.

If your runtime starts from observed browser forms rather than explicit request
input, read [Integration Modes](./integration-modes.md) before you continue.

## 1. Install The SDK

```bash
npm i @mercuryo-ai/magicpay-sdk
```

## 2. Create The Client

```ts
import { createMagicPayClient } from '@mercuryo-ai/magicpay-sdk';

const client = createMagicPayClient({
  gateway: {
    apiKey: process.env.MAGICPAY_API_KEY!,
    apiUrl: 'https://agents-api.mercuryo.io/functions/v1/api',
  },
});
```

`createMagicPayClient(...)` gives you one typed client for session helpers,
profile facts, data resolution, and actions.

## 3. Create Or Load A Session

For backend jobs, workers, MCP tools, and API-only flows, create a regular
session and leave browser-specific fields out of the request body.

```ts
const session = await client.sessions.create({
  description: 'Renew API usage access',
  merchantName: 'ChatGPT',
  context: {
    url: 'https://api.openai.com/v1/responses',
    task: 'call provider api with resolved credentials',
  },
  metadata: {
    source: 'backend-worker',
  },
});

const sessionId = session.session.id;
```

If you already have a `sessionId`, reuse it and skip this step.

Browser runtimes can also attach an optional `browser` block with
`sessionId`, `run`, and `step`. Backend and API-only flows leave that block
out.

## 4. Read Profile Facts

Use `profile.facts()` when open reusable data is enough and you do not need a
protected request yet.

```ts
const facts = await client.profile.facts();
console.log(facts);
```

Think of `profile.facts()` as instant access to public user data (name, email,
locale) that MagicPay can provide without requiring approval.

`profile.facts()` is the broad read model for reusable open data. It is not a
page-matching helper for live browser targets. If your runtime already has
observed target refs on the current page, use `magicpay resolve-fields` or
`magicpay-agent resolve-fields` instead:

- `matched` means one confident open value is ready for that target now;
- `ambiguous` means multiple candidates still compete;
- `no_match` means MagicPay could not pick an applicable value safely.

## 5. Resolve Data For A Protected Step

Use `data.resolve(...)` when the runtime needs actual field values for the
current protected page or form.

```ts
const loginHandle = await client.data.resolve(
  sessionId,
  {
    clientRequestId: 'chatgpt-login-request-1',
    fields: [{ key: 'username' }, { key: 'password' }],
    context: {
      url: 'https://chatgpt.com/auth/login',
      pageTitle: 'Login',
      formPurpose: 'login',
      merchantName: 'ChatGPT',
    },
    saveHint: {
      category: 'login',
      displayName: 'ChatGPT Login',
      schemaRef: 'login.basic',
    },
  }
);

const loginResult = await client.data.waitForResult(sessionId, loginHandle);

if (!loginResult.ok) {
  throw new Error(loginResult.reason);
}

if (loginResult.artifact.kind !== 'values') {
  throw new Error(`Expected values, received ${loginResult.artifact.kind}`);
}

console.log(loginResult.artifact.values);
```

Important root-SDK behavior:

- **`clientRequestId` makes retries safe.** Bring your own stable id (a
  UUID persisted with your task state, or a deterministic
  `"checkout-${taskId}-login"` string). Retrying with the same id returns
  the same `requestId` instead of duplicating the request.
- **Two-step resolve / wait.** `data.resolve(...)` creates the request
  handle; `data.waitForResult(...)` waits for the result. Splitting them
  lets another process resume waiting on the same `requestId` — useful
  when your runtime reconnects, shards, or runs in a short-lived function.
- **Bridge metadata is optional.** `input.bridge` carries browser-only
  identifiers (`pageRef`, `fillRef`, `scopeRef`). API-only flows omit it.

## 6. Run A Protected Action

Use `actions.run(...)` when the task is not "give me field values" but "perform
or confirm a protected action".

```ts
const actionHandle = await client.actions.run(sessionId, {
  clientRequestId: 'checkout-confirm-request-1',
  capability: 'confirm',
  display: {
    summary: 'Approve the final checkout step',
  },
  context: {
    url: 'https://checkout.example.com/review',
    pageTitle: 'Review order',
    merchantName: 'Example Store',
  },
});

const actionResult = await client.actions.waitForResult(sessionId, actionHandle);

if (!actionResult.ok) {
  throw new Error(actionResult.reason);
}
```

The root SDK hides the same waiting and artifact mechanics here too. The
runtime creates the action request, then waits for the final result without
manually coordinating request polling.

## 7. Continue In Your Runtime

At this point the SDK has done its part. Your runtime decides what happens
next:

- fill the browser form with the resolved values;
- continue a provider or wallet flow after an action result;
- call an external API with the resolved values or action artifact;
- resume a broader orchestration loop.

## Optional Browser Bridge

If your runtime already uses `@mercuryo-ai/agentbrowse` and starts from
observed browser forms, the optional bridge is documented in
[Integration Modes](./integration-modes.md) and
[`examples/agentbrowse-bridge.ts`](../examples/agentbrowse-bridge.ts).
