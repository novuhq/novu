import { NotificationStep } from '@novu/application-generic';
import { StepIssues, WorkflowStatusEnum } from '@novu/shared';

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
