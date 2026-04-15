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
  buildObservedFormCandidateItems,
  prepareProtectedFillFromValues,
} from '@mercuryo-ai/magicpay-sdk/agentbrowse';
import { fetchVaultCatalog } from '@mercuryo-ai/magicpay-sdk/core';

export interface AgentbrowseBridgeParams {
  gateway: MagicPayGatewayConfig;
  browserSession: BrowserSessionState;
  sessionId: string;
  merchantName: string;
  observeGoal: string;
  itemRef?: string;
}

function asErrorMessage(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function toRequestedField(form: ProtectedFillForm['fields'][number]) {
  return {
    key: form.fieldKey,
    required: form.required !== false,
    ...(form.label ? { label: form.label } : {}),
    ...(
      form.fieldKey === 'password' ||
      form.fieldKey === 'cvv' ||
      form.fieldKey === 'pan'
        ? { type: 'secret' as const }
        : {}
    ),
  };
}

export async function completeObservedFormWithMagicPay(params: AgentbrowseBridgeParams) {
  const client = createMagicPayClient({
    gateway: params.gateway,
  });

  const observation = await observe(params.browserSession, params.observeGoal);
  if (!observation.success || !observation.url || !Array.isArray(observation.fillableForms)) {
    throw new Error('AgentBrowse did not return observed forms.');
  }

  const observedForms = observation.fillableForms as unknown as ProtectedFillForm[];
  const form =
    observedForms.find((candidate) => candidate.purpose === 'login') ?? observedForms[0] ?? null;

  if (!form) {
    throw new Error('No protected fill form was observed.');
  }

  const vaultCatalog = await fetchVaultCatalog(params.gateway, params.sessionId, observation.url);
  const candidateItems = buildObservedFormCandidateItems(form, vaultCatalog);
  const selectedItem =
    (params.itemRef
      ? candidateItems.find((candidate) => candidate.itemRef === params.itemRef)
      : null) ??
    candidateItems[0] ??
    null;

  const handle = await client.data.resolve(params.sessionId, {
    clientRequestId: `${form.fillRef}-resolve`,
    fields: form.fields.map(toRequestedField),
    context: {
      url: observation.url,
      merchantName: params.merchantName,
      formPurpose: form.purpose,
      ...(observation.title ? { pageTitle: observation.title } : {}),
    },
    bridge: {
      fillRef: form.fillRef,
      pageRef: form.pageRef,
      ...(form.scopeRef ? { scopeRef: form.scopeRef } : {}),
    },
    ...(selectedItem ? { targetItemRef: selectedItem.itemRef } : {}),
  });

  const result = await client.data.waitForResult(params.sessionId, handle, {
    intervalMs: 1_000,
  });

  if (!result.ok) {
    throw new Error(result.message ?? result.reason);
  }
  if (result.artifact.kind !== 'values') {
    throw new Error(`MagicPay returned ${result.artifact.kind}, not values.`);
  }

  const prepared = prepareProtectedFillFromValues({
    fillableForm: form,
    catalog: null,
    protectedValues: result.artifact.values,
    storedSecretRef: result.itemRef ?? selectedItem?.itemRef ?? null,
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
    requestId: result.requestId,
    itemRef: result.itemRef ?? selectedItem?.itemRef ?? null,
    fillResult,
    submitAction,
  };
}
