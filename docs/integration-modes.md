# Integration Modes

MagicPay SDK has one primary SDK entrypoint and two optional subpaths.

The primary entrypoint is the root package. The optional subpaths exist for
specialized integrations that want pure helpers or an existing AgentBrowse
bridge.

## At A Glance

| If you start from | Import | Why |
| --- | --- | --- |
| A known protected step and your own request input | `@mercuryo-ai/magicpay-sdk` | Main client for catalog, request, poll, claim, and session helpers |
| Pure request and session state logic | `@mercuryo-ai/magicpay-sdk/core` | Pure helpers without the networked client wrapper |
| Observed protected forms from an existing AgentBrowse runtime | `@mercuryo-ai/magicpay-sdk/agentbrowse` | Optional bridge from observed forms to MagicPay request and fill input |

## Root SDK

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

This is the default choice for most integrators.

## Pure Helpers

Use `@mercuryo-ai/magicpay-sdk/core` when you already own transport but still
want the MagicPay request, session, and catalog logic:

- `describeSecretRequestStatus(...)`
- `evaluateSecretRequestForFill(...)`
- `resolveSecretCatalogContext(...)`
- session-state builders and classifiers

This subpath is useful when the root client would add too much abstraction for
your stack.

## Optional AgentBrowse Bridge

Use `@mercuryo-ai/magicpay-sdk/agentbrowse` only when your runtime already uses
`@mercuryo-ai/agentbrowse` and starts from observed protected forms.

This optional bridge adds helpers for:

- enriching observed forms with stored-secret candidates
- building request input from an observed form
- preparing protected-fill input from a fulfilled claim

It narrows the handoff between:

- an observed protected form
- a MagicPay approval request
- a guarded fill step after the claim succeeds

## What Stays Outside The SDK

MagicPay SDK does not own:

- human approval UX
- browser-session lifecycle
- page observation
- final business logic after the claim

Those remain in your application or in the runtime you already use.

## Next Steps

- For the first root-client integration, use
  [Getting Started](./getting-started.md).
- For the optional AgentBrowse path, open
  [`examples/agentbrowse-bridge.ts`](../examples/agentbrowse-bridge.ts).
- For lookup details, use [API Reference](./api-reference.md).
