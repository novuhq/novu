import type { TriggerAgentOverride, WorkflowAgentConfig } from '@novu/shared';

/**
 * Resolve the effective agent for a workflow execution.
 *
 * - `undefined` (omitted) → inherit the workflow-assigned agent
 * - `null` → disable agent-derived defaults for this execution
 * - `{ identifier }` → use the trigger-selected agent
 */
export function resolveEffectiveTriggerAgent(
  jobAgent: TriggerAgentOverride | undefined,
  workflowAgent: WorkflowAgentConfig | null | undefined
): WorkflowAgentConfig | null {
  if (jobAgent === undefined) {
    return workflowAgent ?? null;
  }

  if (jobAgent === null) {
    return null;
  }

  return { identifier: jobAgent.identifier };
}
