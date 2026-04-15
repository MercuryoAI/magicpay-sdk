# Integration Modes

## Short Answer

**Use `@mercuryo-ai/magicpay-sdk` and stop reading.** 90% of integrations
go through the root package. The subpaths exist for specialised use cases;
if you are not sure whether yours qualifies, it does not.

## Why Three Entrypoints

MagicPay SDK has one primary entry and two optional subpaths.

The standard flow is:

- `profile.facts()` for open reusable data;
- `data.resolve(...)` plus `data.waitForResult(...)` for protected or
  mixed-value field resolution;
- `actions.run(...)` plus `actions.waitForResult(...)` for protected actions.

The optional subpaths cover specialized integrations that want pure helpers
or the AgentBrowse bridge.

## At A Glance

| If you start from | Import | Why |
| --- | --- | --- |
| A known runtime task and explicit request context | `@mercuryo-ai/magicpay-sdk` | Main client for sessions, profile facts, data resolution, and actions |
| Pure request and session state logic | `@mercuryo-ai/magicpay-sdk/core` | Pure helpers without the networked root client |
| Observed protected forms from an existing AgentBrowse runtime | `@mercuryo-ai/magicpay-sdk/agentbrowse` | Optional bridge from observed forms to MagicPay request input |

## Root SDK

Use only `@mercuryo-ai/magicpay-sdk` when your runtime already knows:

- the current page or task context;
- how to continue after MagicPay returns resolved values or an action result;
- how to own the surrounding browser or provider orchestration.

This is the normal choice for:

- backend workers;
- custom browser runtimes;
- API-only flows;
- agent systems that already own orchestration outside the SDK.

In this mode you let the SDK hide:

1. request creation;
2. waiting and retry logic;
3. result retrieval;
4. session stop handling.

## Pure Helpers

Use `@mercuryo-ai/magicpay-sdk/core` when you already own the HTTP layer but
still want MagicPay's request and session logic:

- request-state classifiers;
- session-state builders;
- host and bridge helpers.

This subpath is useful when the root client would add too much abstraction for
your stack.

## Optional AgentBrowse Bridge

Use `@mercuryo-ai/magicpay-sdk/agentbrowse` only when your runtime already uses
`@mercuryo-ai/agentbrowse` and starts from observed browser forms.

This optional bridge adds helpers for:

- enriching observed forms with host-specific candidate inventory;
- building request input from an observed form;
- preparing protected-fill input from a lower-level fulfilled claim.

The bridge keeps browser observation and MagicPay request shape aligned
inside one typed helper, so integrators do not need to wire them together
manually.

## What Stays Outside The SDK

MagicPay SDK does not own:

- human approval UX;
- browser-session lifecycle;
- page observation;
- final business logic after a successful result.

Those remain in your application or in the runtime you already use.

## Next Steps

- For the first root-client integration, use
  [Getting Started](./getting-started.md).
- For the optional AgentBrowse path, open
  [`examples/agentbrowse-bridge.ts`](../examples/agentbrowse-bridge.ts).
- For lookup details, use [API Reference](./api-reference.md).
