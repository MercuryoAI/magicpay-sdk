import {
  createMagicPayClient,
  type MagicPayGatewayConfig,
  type MagicPayRequestHandle,
  type MagicPayWaitForResultOptions,
} from '@mercuryo-ai/magicpay-sdk';

export interface ValuesExternalApiParams<TPayload> {
  gateway: MagicPayGatewayConfig;
  sessionId: string;
  request: MagicPayRequestHandle | string;
  endpoint: string;
  buildPayload: (values: Record<string, string>) => TPayload;
  wait?: MagicPayWaitForResultOptions;
}

export async function sendResolvedValuesToExternalApi<TPayload>(
  params: ValuesExternalApiParams<TPayload>
) {
  const client = createMagicPayClient({
    gateway: params.gateway,
  });

  const result = await client.data.waitForResult(params.sessionId, params.request, params.wait);
  if (!result.ok) {
    throw new Error(result.message ?? result.reason);
  }
  if (result.artifact.kind !== 'values') {
    throw new Error(`Expected a values artifact, received ${result.artifact.kind}.`);
  }

  const response = await fetch(params.endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(
      params.buildPayload(result.artifact.values as Record<string, string>)
    ),
  });

  if (!response.ok) {
    throw new Error(`External API failed with ${response.status}`);
  }

  return {
    result,
    response,
  };
}
