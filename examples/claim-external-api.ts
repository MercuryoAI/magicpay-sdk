import {
  createMagicPayClient,
  type MagicPayGatewayConfig,
} from '@mercuryo-ai/magicpay-sdk';

export interface ClaimExternalApiParams<TPayload> {
  gateway: MagicPayGatewayConfig;
  sessionId: string;
  requestId: string;
  endpoint: string;
  buildPayload: (values: Record<string, string>) => TPayload;
  claimId?: string;
}

export async function claimAndCallExternalApi<TPayload>(
  params: ClaimExternalApiParams<TPayload>
) {
  const client = createMagicPayClient({
    gateway: params.gateway,
  });

  const claim =
    typeof params.claimId === 'string'
      ? await client.secrets.claim(params.sessionId, params.requestId, params.claimId)
      : await client.secrets.claim(params.sessionId, params.requestId);

  if (!claim.success) {
    throw new Error(claim.reason);
  }

  const response = await fetch(params.endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(params.buildPayload(claim.result.secret.values)),
  });

  if (!response.ok) {
    throw new Error(`External API failed with ${response.status}`);
  }

  return {
    claim: claim.result,
    response,
  };
}

