# Examples Index

These examples are focused integration notes for the public MagicPay SDK.

The public model is:

- `profile.facts()` for open reusable data;
- `data.resolve(...)` plus `data.waitForResult(...)` for protected or
  mixed-value field resolution;
- `actions.run(...)` plus `actions.waitForResult(...)` for protected actions.

Before you run or adapt them, provide your own:

- gateway config;
- real session IDs;
- page or task context;
- approval UX;
- browser-session lifecycle, when applicable.

## Example Files

| File | When to use it |
| --- | --- |
| [`root-client-flow.ts`](../examples/root-client-flow.ts) | Start here for the main `profile.facts -> data.resolve -> data.waitForResult -> actions.run -> actions.waitForResult` flow in a backend, worker, or custom runtime. |
| [`data-resolve-values.ts`](../examples/data-resolve-values.ts) | You only need a protected `values` artifact for a form, webhook, or backend handoff. |
| [`agentbrowse-bridge.ts`](../examples/agentbrowse-bridge.ts) | You already use AgentBrowse and want the observed-form bridge. |
| [`values-external-api.ts`](../examples/values-external-api.ts) | You already have a request handle or request id and want to forward resolved values into an external API call. |
| [`testing-fetch.ts`](../examples/testing-fetch.ts) | You want deterministic tests with `fetchImpl`. |

## Which Example Should You Start With?

- Start with the root-client narrative in [Getting Started](./getting-started.md)
  and [`root-client-flow.ts`](../examples/root-client-flow.ts) if you are
  integrating MagicPay into a backend, worker, CLI, or custom runtime.
- Use [`agentbrowse-bridge.ts`](../examples/agentbrowse-bridge.ts) only when
  you already have AgentBrowse observed forms and need the optional browser bridge.
- Use [`testing-fetch.ts`](../examples/testing-fetch.ts) when your next task is
  HTTP-level test coverage rather than live integration.
