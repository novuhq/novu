import type { TriggerAgentOverride } from '@novu/shared';

/**
 * Map the public trigger `agentId` field onto the internal TriggerAgentOverride shape.
 *
 * - `undefined` (omitted) → inherit the workflow-assigned agent
 * - `null` → disable agent-derived defaults for this execution
 * - string → override with that public agent identifier
 */
export function toTriggerAgentOverride(agentId: string | null | undefined): TriggerAgentOverride | undefined {
  if (agentId === undefined) {
    return undefined;
  }

  if (agentId === null) {
    return null;
  }

  return { identifier: agentId };
}
