# Testing Guide

Use this guide when you want deterministic SDK tests without real network
traffic.

## Replace Transport With `fetchImpl`

`createMagicPayClient(...)` accepts `fetchImpl`, so your tests can return
predictable `Response` objects for every SDK request.

```ts
import { createMagicPayClient } from '@mercuryo-ai/magicpay-sdk';

const responses = new Map([
  [
    'GET https://agents-api.mercuryo.io/functions/v1/api/profile/facts',
    new Response(JSON.stringify({ facts: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  ],
]);

const client = createMagicPayClient({
  gateway: {
    apiKey: 'test_api_key',
    apiUrl: 'https://agents-api.mercuryo.io/functions/v1/api',
  },
  fetchImpl: async (url, init = {}) => {
    const method = (init.method ?? 'GET').toUpperCase();
    const key = `${method} ${String(url)}`;
    const response = responses.get(key);
    if (!response) {
      throw new Error(`Unexpected ${key}`);
    }
    return response;
  },
});

await client.profile.facts();
```

## What To Test

Target the boundary you own:

- request creation input;
- waiting behavior and retry windows;
- timeout and cancellation handling;
- branching on final `reason` values;
- handoff from MagicPay into your browser or API runtime.

Use `@mercuryo-ai/magicpay-sdk/core` directly when you want pure unit tests for
request/session logic without any network client at all.

## Example File

The same pattern is packaged as a reusable example in
[`examples/testing-fetch.ts`](../examples/testing-fetch.ts).
