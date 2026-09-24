import { SeverityLevelEnum, type WorkflowJobMetadata } from '@novu/shared';

export type { WorkflowJobMetadata };

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
 * Stateless / bridge-only jobs carry the code-first discovery metadata on the job step because
 * they have no persisted workflow entity to resolve at send time.
 */
export function buildWorkflowVariablesForJob(job: {
  workflow?: IWorkflowForVariables;
  workflowMetadata?: WorkflowJobMetadata;
  identifier: string;
  tags?: string[];
  severity?: SeverityLevelEnum;
}): WorkflowVariables {
  if (job.workflow) {
    return buildWorkflowVariables(job.workflow);
  }

  return buildWorkflowVariables({
    name: job.workflowMetadata?.name ?? job.identifier,
    description: job.workflowMetadata?.description,
    triggers: [{ identifier: job.identifier }],
    tags: job.tags,
    severity: job.severity,
  });
}
