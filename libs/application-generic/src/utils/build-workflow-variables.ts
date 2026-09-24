import { SeverityLevelEnum } from '@novu/shared';

export interface IWorkflowForVariables {
  name?: string;
  description?: string;
  tags?: string[];
  severity?: SeverityLevelEnum;
  triggers?: Array<{ identifier?: string }>;
}

export type WorkflowVariables = {
  workflowId?: string;
  name?: string;
  description?: string;
  tags?: string[];
  severity?: SeverityLevelEnum;
};

/**
 * The `workflow` namespace exposed to Liquid templates and json-logic step conditions.
 * Only the fields advertised by the dashboard variable schema (`buildWorkflowSchema`) are
 * returned, so persisted entity internals (ids, `rawData`, step control values) never reach
 * rendered content or outbound HTTP requests.
 * `workflowId` is the trigger identifier; the persisted entity has no such field.
 */
export function buildWorkflowVariables(workflow: IWorkflowForVariables): WorkflowVariables {
  return {
    workflowId: workflow.triggers?.[0]?.identifier,
    name: workflow.name,
    description: workflow.description,
    tags: workflow.tags,
    severity: workflow.severity,
  };
}

/**
 * Integration-condition evaluation data for a send job.
 * When the persisted workflow is missing (stateless / bridge-only jobs), name and workflowId
 * both fall back to the trigger identifier rather than inventing a template entity.
 */
export function buildWorkflowVariablesForJob(job: {
  workflow?: IWorkflowForVariables;
  identifier: string;
  tags?: string[];
  severity?: SeverityLevelEnum;
}): WorkflowVariables {
  if (job.workflow) {
    return buildWorkflowVariables(job.workflow);
  }

  return buildWorkflowVariables({
    name: job.identifier,
    triggers: [{ identifier: job.identifier }],
    tags: job.tags,
    severity: job.severity,
  });
}
