# Error Reference

Use this document when you need the exact failure kinds returned by the public
MagicPay SDK helpers.

## `buildRequestInputForObservedForm(...)`

| Kind | When it happens | What to do |
| --- | --- | --- |
| `host_resolution_failed` | No usable host could be resolved from the page URL, host, or catalog. | Pass a valid page URL or a catalog with a host. |
| `stored_secret_not_available` | The chosen `storedSecretRef` is not available for the observed form and host. | Fetch the catalog again or choose a different stored secret. |

## `client.secrets.poll(...)` And `client.secrets.pollUntil(...)`

| Kind | When it happens | What to do |
| --- | --- | --- |
| `not_found` | The request ID does not exist in the session. | Recreate the request or refresh local state. |
| `aborted` | The caller aborted the poll. | Decide whether to resume or stop. |
| `other` | MagicPay returned another transport or backend failure. | Inspect `status`, `errorCode`, and logs. |
| `timeout` | `pollUntil(...)` exceeded its timeout. | Continue polling later or report a timeout to the user. |

## `client.secrets.claim(...)`

| Kind | When it happens | What to do |
| --- | --- | --- |
| `not_fulfilled` | The request is not approved yet. | Keep polling or ask the user to approve it. |
| `already_claimed` | The one-time secret payload was already claimed. | Create a new secret request. |
| `aborted` | The caller aborted the claim request. | Retry only if the application still needs the payload. |
| `other` | MagicPay returned another transport or backend failure. | Inspect `status`, `errorCode`, and logs. |

## Gateway Errors

The root package exposes transport helpers through
`MagicPayRequestError`, `getMagicPayErrorCode(...)`,
`getMagicPayErrorMessage(...)`, and `isMagicPayRequestErrorStatus(...)`.

Use them when you need to normalize thrown transport failures before returning
them to your own logs, telemetry, or UI.
