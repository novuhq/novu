import { DiscoverWorkflowOutput } from '@novu/framework/internal';
import { buildWorkflowPreferences, WorkflowPreferences } from '@novu/shared';
import { createHash } from 'crypto';

/**
 * Pure mapping helpers shared between the persisted sync path (`Sync`) and the
 * stateless local-mode path (`BuildVirtualWorkflows`), so the two
 * interpretations of a bridge `discover` response cannot drift.
 */

export function getDiscoveredWorkflowName(workflow: DiscoverWorkflowOutput): string {
  return workflow.name || workflow.workflowId;
}

export function getDiscoveredWorkflowDescription(workflow: DiscoverWorkflowOutput): string {
  return workflow.description || '';
}

export function getDiscoveredWorkflowTags(workflow: DiscoverWorkflowOutput): string[] {
  return workflow.tags || [];
}

export function getDiscoveredWorkflowPreferences(workflow: DiscoverWorkflowOutput): WorkflowPreferences {
  return buildWorkflowPreferences(workflow.preferences || {});
}

export function getDiscoveredWorkflowActive(workflow: DiscoverWorkflowOutput): boolean {
  return (workflow as Record<string, any>)?.active ?? true;
}

export function buildDiscoveredWorkflowRawData(workflow: DiscoverWorkflowOutput): Record<string, unknown> {
  const rawData = { ...workflow } as Record<string, unknown>;

  if (rawData.payload && typeof rawData.payload === 'object') {
    const { unknownSchema: _payloadUnknownSchema, ...payloadRest } = rawData.payload as Record<string, unknown>;
    rawData.payload = payloadRest;
  }

  if (rawData.controls && typeof rawData.controls === 'object') {
    const { unknownSchema: _controlsUnknownSchema, ...controlsRest } = rawData.controls as Record<string, unknown>;
    rawData.controls = controlsRest;
  }

  return rawData;
}

/**
 * Deterministic 24-char hex identifier for non-persisted (virtual) resources.
 * Downstream slug encoding (`buildSlug` -> `encodeBase62`) expects hex input,
 * and determinism keeps ids stable across repeated `discover` calls.
 */
export function buildVirtualInternalId(seed: string): string {
  return createHash('md5').update(seed).digest('hex').slice(0, 24);
}
