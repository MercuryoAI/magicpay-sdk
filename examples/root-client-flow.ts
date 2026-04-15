import {
  createMagicPayClient,
  type MagicPayGatewayConfig,
  type MagicPayRequestedField,
} from '@mercuryo-ai/magicpay-sdk';

export interface RootClientBridgeInput {
  pageRef?: string;
  fillRef?: string;
  scopeRef?: string;
}

export interface RootClientFormStep {
  url: string;
  merchantName: string;
  fields: MagicPayRequestedField[];
  pageTitle?: string;
  formPurpose?: string;
  itemRef?: string;
  saveHint?: {
    category: string;
    displayName: string;
    schemaRef?: string;
  };
  bridge?: RootClientBridgeInput;
}

export interface RootClientActionStep {
  capability: string;
  url: string;
  merchantName: string;
  pageTitle?: string;
  itemRef?: string;
  params?: Record<string, unknown>;
  display?: {
    summary?: string;
    presentation?: Record<string, unknown>;
  };
  bridge?: RootClientBridgeInput;
}

export interface RootClientFlowParams {
  gateway: MagicPayGatewayConfig;
  sessionId: string;
  form: RootClientFormStep;
  action?: RootClientActionStep;
}

function buildExampleRequestId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

function toBridgeInput(bridge: RootClientBridgeInput | undefined) {
  if (!bridge?.pageRef && !bridge?.fillRef && !bridge?.scopeRef) {
    return undefined;
  }

  return {
    ...(bridge.pageRef ? { pageRef: bridge.pageRef } : {}),
    ...(bridge.fillRef ? { fillRef: bridge.fillRef } : {}),
    ...(bridge.scopeRef ? { scopeRef: bridge.scopeRef } : {}),
  };
}

export async function runRootClientFlow(params: RootClientFlowParams) {
  const client = createMagicPayClient({
    gateway: params.gateway,
  });

  const facts = await client.profile.facts();
  const formBridge = toBridgeInput(params.form.bridge);

  const dataHandle = await client.data.resolve(params.sessionId, {
    clientRequestId: buildExampleRequestId('magicpay-data'),
    fields: params.form.fields,
    context: {
      url: params.form.url,
      ...(params.form.pageTitle ? { pageTitle: params.form.pageTitle } : {}),
      ...(params.form.formPurpose ? { formPurpose: params.form.formPurpose } : {}),
      merchantName: params.form.merchantName,
    },
    ...(params.form.itemRef ? { targetItemRef: params.form.itemRef } : {}),
    ...(params.form.saveHint ? { saveHint: params.form.saveHint } : {}),
    ...(formBridge ? { bridge: formBridge } : {}),
  });

  const dataResult = await client.data.waitForResult(params.sessionId, dataHandle);
  if (!dataResult.ok) {
    throw new Error(`Data request failed: ${dataResult.reason}`);
  }
  if (dataResult.artifact.kind !== 'values') {
    throw new Error(`Expected a values artifact, received ${dataResult.artifact.kind}.`);
  }

  if (!params.action) {
    return {
      facts,
      dataResult,
    };
  }

  const actionBridge = toBridgeInput(params.action.bridge);
  const actionHandle = await client.actions.run(params.sessionId, {
    clientRequestId: buildExampleRequestId('magicpay-action'),
    capability: params.action.capability,
    ...(params.action.itemRef ? { itemRef: params.action.itemRef } : {}),
    ...(params.action.params ? { params: params.action.params } : {}),
    ...(params.action.display ? { display: params.action.display } : {}),
    context: {
      url: params.action.url,
      ...(params.action.pageTitle ? { pageTitle: params.action.pageTitle } : {}),
      merchantName: params.action.merchantName,
    },
    ...(actionBridge ? { bridge: actionBridge } : {}),
  });

  const actionResult = await client.actions.waitForResult(params.sessionId, actionHandle);
  if (!actionResult.ok) {
    throw new Error(`Action request failed: ${actionResult.reason}`);
  }

  return {
    facts,
    dataResult,
    actionResult,
  };
}
