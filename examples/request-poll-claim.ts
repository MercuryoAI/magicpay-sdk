import {
  createMagicPayClient,
  type MagicPayGatewayConfig,
  type StoredSecretFieldKey,
  type StoredSecretKind,
} from '@mercuryo-ai/magicpay-sdk';

export interface RequestPollClaimParams {
  gateway: MagicPayGatewayConfig;
  sessionId: string;
  pageUrl: string;
  merchantName: string;
  fillRef: string;
  storedSecretRef: string;
  purpose: StoredSecretKind;
  fields: StoredSecretFieldKey[];
  clientRequestId?: string;
  scopeRef?: string;
  pageTitle?: string;
}

export async function requestPollAndClaim(params: RequestPollClaimParams) {
  const client = createMagicPayClient({
    gateway: params.gateway,
  });

  const catalog = await client.secrets.fetchCatalog(params.sessionId, params.pageUrl);

  const created = await client.secrets.createRequest({
    sessionId: params.sessionId,
    clientRequestId: params.clientRequestId ?? `${params.fillRef}-request`,
    fillRef: params.fillRef,
    purpose: params.purpose,
    merchantName: params.merchantName,
    page: {
      url: params.pageUrl,
      ...(params.pageTitle ? { title: params.pageTitle } : {}),
    },
    secretHint: {
      storedSecretRef: params.storedSecretRef,
      kind: params.purpose,
      host: catalog.host,
      ...(params.scopeRef ? { scopeRef: params.scopeRef } : {}),
      fields: params.fields,
    },
  });

  const ready = await client.secrets.pollUntil(params.sessionId, created.requestId, {
    stopWhen: 'fulfilled',
  });

  if (!ready.success) {
    throw new Error(ready.reason);
  }
  if (ready.result.snapshot.status !== 'fulfilled') {
    throw new Error(`Request ended as ${ready.result.snapshot.status}`);
  }

  const claim = await client.secrets.claim(params.sessionId, created.requestId);
  if (!claim.success) {
    throw new Error(claim.reason);
  }

  return claim.result;
}

