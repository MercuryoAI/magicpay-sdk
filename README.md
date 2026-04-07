# @mercuryo-ai/magicpay-sdk

MagicPay SDK is the TypeScript and Node client for MagicPay workflow sessions,
stored-secret catalogs, approval requests, and one-time secret claims.

The npm package publishes the runtime client. The public GitHub repo at
[`MercuryoAI/magicpay-sdk`](https://github.com/MercuryoAI/magicpay-sdk) publishes
the expanded documentation and example integrations only. It does not publish
the SDK source code.

## Install

Install the root SDK when your runtime already knows how it will use a claimed
secret payload:

```bash
npm i @mercuryo-ai/magicpay-sdk
```

Install AgentBrowse as well when your runtime starts from observed protected
forms and wants the MagicPay bridge helpers:

```bash
npm i @mercuryo-ai/magicpay-sdk @mercuryo-ai/agentbrowse
```

Create your API key in the MagicPay control plane:
[`agents.mercuryo.io/signup`](https://agents.mercuryo.io/signup)

MagicPay API base URL:

```text
https://agents-api.mercuryo.io/functions/v1/api
```

## Choose An Entrypoint

| Entrypoint | Use it when |
| --- | --- |
| `@mercuryo-ai/magicpay-sdk` | Your runtime can create request input and consume claimed secrets on its own. |
| `@mercuryo-ai/magicpay-sdk/agentbrowse` | Your runtime already uses `@mercuryo-ai/agentbrowse` and starts from observed forms. |
| `@mercuryo-ai/magicpay-sdk/core` | You need the pure domain helpers without the networked client wrapper. |

## Quick Start

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

This is the normal flow:

1. fetch the catalog for the current host
2. create one approval request for the exact fields you need
3. wait until the request is fulfilled
4. claim the one-time payload
5. hand the payload to your runtime

## Continue Reading

- [Docs Index](./docs/README.md)
- [Getting Started](./docs/getting-started.md)
- [Integration Modes](./docs/integration-modes.md)
- [API Reference](./docs/api-reference.md)
- [Error Reference](./docs/error-reference.md)
- [Testing Guide](./docs/testing.md)
- [Examples Index](./docs/examples.md)
- [Glossary](./docs/glossary.md)
