# Integration Modes

MagicPay SDK separates the approval-and-claim domain from the browser runtime.
That keeps the root package useful for backends, workers, MCP tools, and custom
automation stacks that do not depend on AgentBrowse.

## Mode A: Runtime-Agnostic Secret Flow

Use only `@mercuryo-ai/magicpay-sdk` when your runtime already knows:

- how to describe the protected step
- how to consume a claimed secret payload
- how to continue after the claim succeeds

This is the normal choice for:

- backend workers
- custom browser runtimes
- API-only flows
- agent systems that already own orchestration outside the SDK

In this mode you:

1. fetch the catalog
2. create a request
3. poll until approval or another terminal status
4. claim the payload
5. hand the payload to your own runtime

## Mode B: Explicit AgentBrowse Bridge

Use `@mercuryo-ai/magicpay-sdk/agentbrowse` only when your runtime already uses
`@mercuryo-ai/agentbrowse` and starts from observed protected forms.

This mode adds helpers for:

- enriching observed forms with stored-secret candidates
- building request input from an observed form
- preparing protected-fill input from a fulfilled claim

It does not replace AgentBrowse. It narrows the handoff between:

- an observed protected form
- a MagicPay approval request
- a guarded fill step after the claim succeeds

## Mode C: Pure Domain Helpers

Use `@mercuryo-ai/magicpay-sdk/core` when you want the pure helpers without the
networked client wrapper.

This entrypoint is useful when you already own transport but still want the
MagicPay status and catalog logic:

- `describeSecretRequestStatus(...)`
- `evaluateSecretRequestForFill(...)`
- `resolveSecretCatalogContext(...)`
- session-state classifiers and builders

## Which One Should You Choose?

| Start from | Import | What you get |
| --- | --- | --- |
| You already know the protected step and only need MagicPay network calls | `@mercuryo-ai/magicpay-sdk` | The networked client plus public types |
| You already have AgentBrowse observed forms | `@mercuryo-ai/magicpay-sdk/agentbrowse` | Bridge helpers from observed forms to MagicPay request and fill inputs |
| You need only pure state logic | `@mercuryo-ai/magicpay-sdk/core` | No networked client, only pure helpers |

## What Stays Outside The SDK

MagicPay SDK does not own:

- human approval UX
- browser-session lifecycle
- page observation
- final business logic after the claim

Those remain in your application or in the runtime you already use.

## Next Steps

- For the first root-client integration, use [Getting Started](./getting-started.md).
- For the AgentBrowse path, open
  [`examples/agentbrowse-bridge.ts`](../examples/agentbrowse-bridge.ts).
- For lookup details, use [API Reference](./api-reference.md).

