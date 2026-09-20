import { SeverityLevelEnum } from '@novu/shared';

interface IWorkflowForVariables {
  name?: string;
  description?: string;
  tags?: string[];
  severity?: SeverityLevelEnum;
  triggers?: Array<{ identifier?: string }>;
}

/**
 * The `workflow` namespace exposed to Liquid templates and json-logic step conditions.
 * Only the fields advertised by the dashboard variable schema (`buildWorkflowSchema`) are
 * returned, so persisted entity internals (ids, `rawData`, step control values) never reach
 * rendered content or outbound HTTP requests.
 * `workflowId` is the trigger identifier; the persisted entity has no such field.
 */
export function buildWorkflowVariables(workflow: IWorkflowForVariables): Record<string, unknown> {
  return {
    workflowId: workflow.triggers?.[0]?.identifier,
    name: workflow.name,
    description: workflow.description,
    tags: workflow.tags,
    severity: workflow.severity,
  };
}
