# Getting Started

Use this guide when you want to complete the first MagicPay secret-request flow
from your own runtime.

## Before You Start

You need:

- Node 18 or newer
- a MagicPay API key from
  [`agents.mercuryo.io/signup`](https://agents.mercuryo.io/signup)
- a `sessionId` that represents the workflow session you want to continue
- the current page URL or host for the protected step
- a `storedSecretRef` that exists in the host catalog

If terms such as `storedSecretRef` or `fillRef` are new, open the
[Glossary](./glossary.md) first.

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

## 3. Load The Host Catalog

Fetch the stored-secret catalog for the current protected step.

```ts
const sessionId = 'sess_123';
const pageUrl = 'https://checkout.airline.example/payment';

const catalog = await client.secrets.fetchCatalog(sessionId, pageUrl);
```

The catalog tells you which `storedSecretRef` values are available for the host.

## 4. Create One Secret Request

Create one approval request for the exact stored secret and field set you need.

```ts
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
```

The important contract here is narrow scope: one request should describe one
protected fill step, not an entire session.

## 5. Poll Until The Request Is Ready

```ts
const ready = await client.secrets.pollUntil(sessionId, created.requestId, {
  stopWhen: 'fulfilled',
});

if (!ready.success) {
  throw new Error(ready.reason);
}
if (ready.result.snapshot.status !== 'fulfilled') {
  throw new Error(`Request ended as ${ready.result.snapshot.status}`);
}
```

`pollUntil(...)` returns a terminal outcome or a transport failure. The
`nextAction` contract is documented in [API Reference](./api-reference.md).

## 6. Claim The One-Time Payload

```ts
const claim = await client.secrets.claim(sessionId, created.requestId);
if (!claim.success) {
  throw new Error(claim.reason);
}

console.log(claim.result.secret.values);
```

Claim only after the request is fulfilled. A claimed secret payload is
single-use.

## 7. Hand The Payload To Your Runtime

At this point the SDK has done its part. Your runtime decides what happens
next:

- fill a protected browser form
- authenticate to an external API
- hand the claimed values to an MCP tool
- continue a broader orchestration flow

For concrete patterns, open [Examples Index](./examples.md).

## When To Use AgentBrowse

If your runtime begins with `observe(...)` on a live page and wants a typed
bridge from observed forms to MagicPay request input, move to
[Integration Modes](./integration-modes.md) and
[`examples/agentbrowse-bridge.ts`](../examples/agentbrowse-bridge.ts).
