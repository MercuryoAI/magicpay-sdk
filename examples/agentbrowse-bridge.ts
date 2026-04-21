import {
  fill,
  match,
  observe,
  type AgentbrowseMatchResolver,
  type BrowserSessionState,
  type ProtectedFillForm,
} from '@mercuryo-ai/agentbrowse';
import { fillProtectedForm } from '@mercuryo-ai/agentbrowse/protected-fill';
import {
  createMagicPayClient,
  type MagicPayGatewayConfig,
  type MagicPayRequestArtifact,
} from '@mercuryo-ai/magicpay-sdk';
import {
  buildObservedFormCandidateItems,
  buildObservedFormMatchCandidates,
  buildResolveInput,
  prepareProtectedFill,
  selectObservedFormCandidateItem,
} from '@mercuryo-ai/magicpay-sdk/agentbrowse';
import { fetchVaultCatalog } from '@mercuryo-ai/magicpay-sdk/core';

/**
 * End-to-end bridge example: observe → match → resolve → fill.
 *
 * The AgentBrowse primitives own the matching decision and the browser
 * apply step. A small MagicPay-specific resolver adapter sits between
 * them, using the composable helpers from
 * `@mercuryo-ai/magicpay-sdk/agentbrowse` to talk to the SDK.
 */
export interface AgentbrowseBridgeParams {
  gateway: MagicPayGatewayConfig;
  browserSession: BrowserSessionState;
  sessionId: string;
  merchantName: string;
  observeGoal: string;
  itemRef?: string;
}

function isValuesArtifact(
  artifact: MagicPayRequestArtifact
): artifact is Extract<MagicPayRequestArtifact, { kind: 'values' }> {
  return artifact.kind === 'values';
}

export async function completeObservedFormWithMagicPay(params: AgentbrowseBridgeParams) {
  const client = createMagicPayClient({ gateway: params.gateway });

  const observation = await observe(params.browserSession, params.observeGoal);
  if (!observation.success || !observation.url || !Array.isArray(observation.fillableForms)) {
    throw new Error('AgentBrowse did not return observed forms.');
  }

  const observedForms = observation.fillableForms as unknown as ProtectedFillForm[];
  const fillableForm =
    observedForms.find((candidate) => candidate.purpose === 'login') ?? observedForms[0] ?? null;
  if (!fillableForm) {
    throw new Error('No protected fill form was observed.');
  }

  const vaultCatalog = await fetchVaultCatalog(params.gateway, params.sessionId, observation.url);
  const candidateItems = buildObservedFormCandidateItems(fillableForm, vaultCatalog);
  const selectedCandidate = selectObservedFormCandidateItem(candidateItems, params.itemRef);

  // Build a MagicPay-specific resolver adapter. It implements only the
  // two capabilities this flow needs: `resolve` (fetch the values
  // artifact through MagicPay) and `fill` (apply the values through
  // the protected-fill path). AgentBrowse itself has no knowledge of
  // MagicPay — everything vendor-specific is contained here.
  const magicpayResolver: AgentbrowseMatchResolver = {
    async resolve(plan) {
      if (!('fillRef' in plan)) {
        throw new Error('This resolver only handles grouped (form-scoped) plans.');
      }

      const input = buildResolveInput({
        clientRequestId: `${fillableForm.fillRef}-resolve`,
        merchantName: params.merchantName,
        fillableForm,
        ...(plan.itemRef ? { targetItemRef: plan.itemRef } : {}),
        urlOrHost: observation.url,
        page: {
          ...(observation.url ? { url: observation.url } : {}),
          ...(observation.title ? { title: observation.title } : {}),
        },
      });
      if (!input.success) {
        throw new Error(input.reason);
      }

      const handle = await client.data.resolve(params.sessionId, input.input);
      const result = await client.data.waitForResult(params.sessionId, handle, {
        intervalMs: 1_000,
      });
      if (!result.ok) {
        throw new Error(result.message ?? result.reason);
      }
      if (!isValuesArtifact(result.artifact)) {
        throw new Error(`MagicPay returned a ${result.artifact.kind} artifact; expected values.`);
      }

      return {
        kind: 'artifact',
        artifact: result.artifact,
        requestId: result.requestId,
        resolutionPath: result.resolutionPath,
        ...(result.itemRef ? { itemRef: result.itemRef } : {}),
        claimedAt: new Date().toISOString(),
      };
    },
    async fill(session, form, ready) {
      if (
        !ready.artifact ||
        typeof ready.artifact !== 'object' ||
        (ready.artifact as { kind?: unknown }).kind !== 'values'
      ) {
        return {
          success: false,
          outcomeType: 'unsupported',
          reason: 'Artifact is not a values artifact.',
        };
      }

      const artifact = ready.artifact as Extract<MagicPayRequestArtifact, { kind: 'values' }>;
      const prepared = prepareProtectedFill({
        fillableForm: form,
        catalog: null,
        protectedValues: artifact.values,
        storedSecretRef: ready.itemRef ?? null,
      });

      return fillProtectedForm({
        session,
        fillableForm: prepared.fillableForm,
        protectedValues: prepared.protectedValues,
        ...(prepared.fieldPolicies ? { fieldPolicies: prepared.fieldPolicies } : {}),
      });
    },
  };

  // match — AgentBrowse picks the grouped candidate (the helpers above
  // shape it) and returns a needs_resolution_group plan.
  const matched = await match(fillableForm, {
    from: buildObservedFormMatchCandidates({
      fillableForm,
      merchantName: params.merchantName,
      selectedCandidate,
      ...(params.itemRef ? { explicitItemRef: params.itemRef } : {}),
    }),
  });

  // fill — resolves through magicpayResolver.resolve (triggers the
  // approval round-trip) and then applies through magicpayResolver.fill
  // (which delegates to fillProtectedForm).
  const result = await fill(params.browserSession, fillableForm, matched, {
    resolver: magicpayResolver,
  });

  return {
    result,
    selectedItemRef: selectedCandidate?.itemRef ?? null,
  };
}
