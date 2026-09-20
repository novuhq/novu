/**
 * The `workflow` namespace exposed to Liquid templates and json-logic step conditions.
 * `workflowId` is the trigger identifier; the persisted entity has no such field, but the
 * dashboard variable schema (`buildWorkflowSchema`) advertises it.
 */
export function buildWorkflowVariables<T extends { triggers?: Array<{ identifier?: string }> }>(
  workflow: T
): Record<string, unknown> {
  return {
    ...workflow,
    workflowId: workflow.triggers?.[0]?.identifier,
  };
}
