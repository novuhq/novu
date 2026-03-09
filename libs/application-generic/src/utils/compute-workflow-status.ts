import { StepIssues, WorkflowStatusEnum } from '@novu/shared';
import { NotificationStep } from '../value-objects';

export function computeWorkflowStatus(workflowActive: boolean, steps: NotificationStep[]) {
  if (!workflowActive) {
    return WorkflowStatusEnum.INACTIVE;
  }

  const hasIssues = steps.some((step) => hasControlIssues(step.issues));
  if (!hasIssues) {
    return WorkflowStatusEnum.ACTIVE;
  }

  return WorkflowStatusEnum.ERROR;
}

export function hasControlIssues(issue: StepIssues | undefined) {
  return issue?.controls && Object.keys(issue.controls).length > 0;
}
