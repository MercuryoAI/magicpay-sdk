# MagicPay SDK Examples

These examples are small integration snippets for the public MagicPay SDK.

They intentionally focus on one boundary at a time:

- root request, poll, and claim flow
- AgentBrowse bridge flow
- claim handoff into an external API call
- deterministic testing with `fetchImpl`

Before you run or adapt them, provide your own:

- MagicPay API key
- `sessionId`
- host URL
- approval UX
- browser session, when an example uses AgentBrowse

## Files

- [`request-poll-claim.ts`](./request-poll-claim.ts)
- [`agentbrowse-bridge.ts`](./agentbrowse-bridge.ts)
- [`claim-external-api.ts`](./claim-external-api.ts)
- [`testing-fetch.ts`](./testing-fetch.ts)

The package frontdoor stays at [README.md](../README.md), and the docs index is
[docs/README.md](../docs/README.md).
