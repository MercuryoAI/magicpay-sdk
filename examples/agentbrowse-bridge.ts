import {
  act,
  observe,
  type BrowserSessionState,
  type ProtectedFillForm,
} from '@mercuryo-ai/agentbrowse';
import { fillProtectedForm } from '@mercuryo-ai/agentbrowse/protected-fill';
import {
  createMagicPayClient,
  type MagicPayGatewayConfig,
} from '@mercuryo-ai/magicpay-sdk';
import {
  buildRequestInputForObservedForm,
  enrichObservedFormsForUrl,
  prepareProtectedFillFromClaim,
} from '@mercuryo-ai/magicpay-sdk/agentbrowse';

export interface AgentbrowseBridgeParams {
  gateway: MagicPayGatewayConfig;
  browserSession: BrowserSessionState;
  sessionId: string;
  merchantName: string;
  storedSecretRef: string;
  observeGoal: string;
}

function asErrorMessage(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

export async function completeObservedFormWithMagicPay(
  params: AgentbrowseBridgeParams
) {
  const client = createMagicPayClient({
    gateway: params.gateway,
  });

  const observation = await observe(params.browserSession, params.observeGoal);
  if (!observation.success || !observation.url || !Array.isArray(observation.fillableForms)) {
    throw new Error('AgentBrowse did not return observed forms.');
  }

  const observedForms = observation.fillableForms as unknown as ProtectedFillForm[];
  const catalog = await client.secrets.fetchCatalog(params.sessionId, observation.url);
  const enrichedForms = enrichObservedFormsForUrl(
    observedForms,
    { [catalog.host]: catalog },
    observation.url
  );
  const form =
    enrichedForms.find((candidate) => candidate.purpose === 'login') ??
    enrichedForms[0] ??
    null;

  if (!form) {
    throw new Error('No protected fill form was observed.');
  }

  const requestInput = buildRequestInputForObservedForm({
    sessionId: params.sessionId,
    merchantName: params.merchantName,
    storedSecretRef: params.storedSecretRef,
    urlOrHost: observation.url,
    catalog,
    fillableForm: form,
    page: {
      ref: form.pageRef,
      url: observation.url,
      ...(observation.title ? { title: observation.title } : {}),
    },
  });

  if (!requestInput.success) {
    throw new Error(requestInput.reason);
  }

  const created = await client.secrets.createRequest(requestInput.input);
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

  const prepared = prepareProtectedFillFromClaim({
    fillableForm: form,
    catalog,
    claim: claim.result,
    request: created.snapshot,
  });

  const fillResult = await fillProtectedForm({
    session: params.browserSession,
    fillableForm: prepared.fillableForm,
    protectedValues: prepared.protectedValues,
    fieldPolicies: prepared.fieldPolicies,
  });

  if (!fillResult.success) {
    throw new Error(fillResult.reason);
  }

  const submitObservation = await observe(
    params.browserSession,
    'Find the single actionable submit target that sends the filled form.'
  );
  if (!submitObservation.success || submitObservation.targets.length === 0) {
    throw new Error(
      asErrorMessage(
        submitObservation.reason ?? submitObservation.message,
        'AgentBrowse did not return a submit target.'
      )
    );
  }

  const submitTarget = submitObservation.targets[0];
  if (!submitTarget?.ref || submitTarget.capability !== 'actionable') {
    throw new Error('AgentBrowse did not return an actionable submit target.');
  }

  const submitAction = await act(params.browserSession, submitTarget.ref, 'click');
  if (!submitAction.success) {
    throw new Error(
      asErrorMessage(
        submitAction.reason ?? submitAction.message,
        'AgentBrowse could not click the submit target.'
      )
    );
  }

  return {
    claim: claim.result,
    fillResult,
    submitAction,
  };
}
