# Examples Index

These examples are focused integration recipes for the public MagicPay SDK.

Use them as integration recipes, not as a complete application template. You
still need to provide your own:

- gateway config
- real session IDs
- host URLs
- approval UX
- browser-session lifecycle, when applicable

## Example Files

| File | When to use it |
| --- | --- |
| [`request-poll-claim.ts`](../examples/request-poll-claim.ts) | You want the normal root-client flow: fetch catalog, create request, poll, claim. |
| [`agentbrowse-bridge.ts`](../examples/agentbrowse-bridge.ts) | You already use AgentBrowse and want the observed-form bridge. |
| [`claim-external-api.ts`](../examples/claim-external-api.ts) | You want to claim a payload and pass it straight into an external API call. |
| [`testing-fetch.ts`](../examples/testing-fetch.ts) | You want deterministic tests with `fetchImpl`. |

## Which Example Should You Start With?

- Start with [`request-poll-claim.ts`](../examples/request-poll-claim.ts) if you
  are integrating MagicPay into a backend, worker, CLI, or custom runtime.
- Start with [`agentbrowse-bridge.ts`](../examples/agentbrowse-bridge.ts) only
  when you already have AgentBrowse observed forms and need the optional
  browser bridge.
- Use [`claim-external-api.ts`](../examples/claim-external-api.ts) when the
  payload should go into a provider API instead of a browser fill.
- Use [`testing-fetch.ts`](../examples/testing-fetch.ts) when your next task is
  test coverage rather than live integration.
