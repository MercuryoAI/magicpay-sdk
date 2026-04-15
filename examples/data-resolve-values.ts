import {
  createMagicPayClient,
  type MagicPayGatewayConfig,
  type MagicPayDataResolveInput,
} from '@mercuryo-ai/magicpay-sdk';

export interface DataResolveValuesParams {
  gateway: MagicPayGatewayConfig;
  sessionId: string;
  input: MagicPayDataResolveInput;
  intervalMs?: number;
  timeoutMs?: number;
  clientRequestId?: string;
}

export async function resolveValues(params: DataResolveValuesParams) {
  const client = createMagicPayClient({
    gateway: params.gateway,
  });

  const handle = await client.data.resolve(params.sessionId, {
    ...params.input,
    ...(params.clientRequestId ? { clientRequestId: params.clientRequestId } : {}),
  });

  const result = await client.data.waitForResult(params.sessionId, handle, {
    ...(params.intervalMs !== undefined ? { intervalMs: params.intervalMs } : {}),
    ...(params.timeoutMs !== undefined ? { timeoutMs: params.timeoutMs } : {}),
  });

  if (!result.ok) {
    throw new Error(result.message ?? result.reason);
  }
  if (result.artifact.kind !== 'values') {
    throw new Error(`Expected a values artifact, received ${result.artifact.kind}.`);
  }

  return {
    handle,
    result,
    values: result.artifact.values,
  };
}
