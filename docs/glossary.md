# Glossary

## session

One MagicPay workflow session. The session groups the broader flow that your
runtime is continuing.

## catalog

The host-scoped list of stored secrets that can be requested for the current
protected step.

## storedSecretRef

The stable identifier of the stored secret you want MagicPay to provide for a
request.

## secret request

One approval request for one protected step. It leads to a one-time claim if
the request is fulfilled.

## claim

The one-time retrieval of approved secret values.

## fillRef

The stable identifier of the protected fill target tied to a request.

## pageRef

The stable identifier of the observed page that contains the protected target.

## scopeRef

The stable identifier of a protected page section inside the current step.
