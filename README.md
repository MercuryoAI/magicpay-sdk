# @mercuryo-ai/magicpay-sdk

[![npm version](https://img.shields.io/npm/v/@mercuryo-ai/magicpay-sdk)](https://www.npmjs.com/package/@mercuryo-ai/magicpay-sdk) [![License](https://img.shields.io/badge/license-proprietary-red.svg)](LICENSE.md) [![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

TypeScript SDK for requesting, approving, and claiming stored secrets in
MagicPay workflows.

Use it when your application, worker, agent runtime, or MCP tool needs to:

- load the stored-secret catalog for the current protected step;
- create one approval request for one protected field group;
- poll until the request is fulfilled or reaches a terminal state;
- claim the single-use secret payload;
- continue the surrounding session flow with typed SDK helpers.

MagicPay SDK focuses on the MagicPay domain flow itself. It is not a browser
automation package. Your runtime still owns browser control, approval UX,
orchestration, and the business action that happens after the claim succeeds.

## When To Use It

This package is the right entry point when:

- you already know which protected step you are continuing;
- you run trusted Node or TypeScript code;
- you want a typed client instead of assembling raw HTTP requests yourself.

Typical integrations:

- backend services and workers;
- MCP tools and agent backends;
- browser automation runtimes that already know the protected target;
- provider-specific API flows that consume a claimed payload outside the
  browser.

## Install

Install the root SDK:

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
| `@mercuryo-ai/magicpay-sdk` | You want the main networked client for catalog, request, poll, claim, and session helpers. |
| `@mercuryo-ai/magicpay-sdk/core` | You want the pure domain helpers without the networked client wrapper. |
| `@mercuryo-ai/magicpay-sdk/agentbrowse` | You already use `@mercuryo-ai/agentbrowse` and want the optional bridge from observed forms to MagicPay request and fill input. |

If your runtime already starts from observed protected forms and you want the
optional browser bridge helpers, add AgentBrowse as well:

```bash
npm i @mercuryo-ai/magicpay-sdk @mercuryo-ai/agentbrowse
```

## Quick Start

This example shows the primary root-SDK path. It assumes you already have a
MagicPay workflow session and know which protected step you are continuing.

```ts
import { createMagicPayClient } from '@mercuryo-ai/magicpay-sdk';

const client = createMagicPayClient({
  gateway: {
    apiKey: process.env.MAGICPAY_API_KEY!,
    apiUrl: 'https://agents-api.mercuryo.io/functions/v1/api',
  },
});

const sessionId = 'sess_123';
const pageUrl = 'https://checkout.airline.example/payment';

const catalog = await client.secrets.fetchCatalog(sessionId, pageUrl);

const created = await client.secrets.createRequest({
  sessionId,
  clientRequestId: 'checkout-card-1',
  fillRef: 'checkout_card',
  purpose: 'payment_card',
  merchantName: 'Airline Example',
  page: {
    url: pageUrl,
    title: 'Payment',
  },
  secretHint: {
    storedSecretRef: 'secret_card_primary',
    kind: 'payment_card',
    host: catalog.host,
    scopeRef: 'payment_form',
    fields: ['pan', 'exp_month', 'exp_year', 'cvv'],
  },
});

const ready = await client.secrets.pollUntil(sessionId, created.requestId, {
  stopWhen: 'fulfilled',
});

if (!ready.success) {
  throw new Error(ready.reason);
}
if (ready.result.snapshot.status !== 'fulfilled') {
  throw new Error(`Request ended as ${ready.result.snapshot.status}`);
}

const claim = await client.secrets.claim(sessionId, created.requestId);
if (!claim.success) {
  throw new Error(claim.reason);
}

console.log(claim.result.secret.values);
```

The normal flow is:

1. fetch the catalog for the current host
2. create one approval request for the exact fields you need
3. wait until the request is fulfilled
4. claim the one-time payload
5. hand the payload to your runtime

## What Happens Next

After the claim succeeds, your runtime decides what to do with the values:

- fill a protected browser form;
- authenticate to an external API;
- hand the payload to another tool;
- continue a larger workflow session.

## Continue Reading

- Start with [Getting Started](./docs/getting-started.md) for the first root
  integration.
- Read [Integration Modes](./docs/integration-modes.md) if you need help
  choosing between the root SDK, pure helpers, and the optional AgentBrowse
  bridge.
- Use [API Reference](./docs/api-reference.md) and
  [Error Reference](./docs/error-reference.md) as lookup documents while
  integrating.
- Use [Examples Index](./docs/examples.md) for runnable snippets.
- Use [Glossary](./docs/glossary.md) when terms like `storedSecretRef`,
  `fillRef`, or `scopeRef` are still new.
