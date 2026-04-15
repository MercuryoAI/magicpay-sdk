# MagicPay SDK Examples

These examples are small integration snippets for the public MagicPay SDK.

The public root-client story is:

- read `profile.facts()` when open reusable data is enough;
- start protected data requests with `data.resolve(...)` and wait for the
  artifact with `data.waitForResult(...)`;
- start protected actions with `actions.run(...)` and wait for the artifact
  with `actions.waitForResult(...)`.

Before you run or adapt them, provide your own:

- MagicPay API key;
- `sessionId`;
- page or task context;
- approval UX;
- browser session, when an example uses AgentBrowse.

## Files

- [`root-client-flow.ts`](./root-client-flow.ts)
- [`data-resolve-values.ts`](./data-resolve-values.ts)
- [`agentbrowse-bridge.ts`](./agentbrowse-bridge.ts)
- [`values-external-api.ts`](./values-external-api.ts)
- [`testing-fetch.ts`](./testing-fetch.ts)

Start with [`root-client-flow.ts`](./root-client-flow.ts) and
[Getting Started](../docs/getting-started.md) for the main root-client flow.
Use [`data-resolve-values.ts`](./data-resolve-values.ts) when you only need a
protected `values` artifact. Use
[`values-external-api.ts`](./values-external-api.ts) when you want to hand
resolved values to another HTTP service. Use
[`agentbrowse-bridge.ts`](./agentbrowse-bridge.ts) only when your runtime
already has AgentBrowse observed forms.
