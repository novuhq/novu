import { StepIssueSeverityEnum, StepIssues, WorkflowStatusEnum } from '@novu/shared';

export function computeWorkflowStatus(workflowActive: boolean, steps: Array<{ issues?: StepIssues }>) {
  if (!workflowActive) {
    return WorkflowStatusEnum.INACTIVE;
  }

  const hasIssues = steps.some((step) => hasControlIssues(step.issues));
  if (!hasIssues) {
    return WorkflowStatusEnum.ACTIVE;
  }

  return WorkflowStatusEnum.ERROR;
}

/**
 * A workflow is only `ERROR` when a step has a *blocking* control issue. Non-blocking
 * `warning`-severity issues (e.g. rich chat card degradation on Teams/Telegram/WhatsApp) are
 * surfaced in the dashboard but must not flip the workflow status. Issues without a `severity`
 * are treated as blocking for backwards compatibility.
 */
export function hasControlIssues(issue: StepIssues | undefined): boolean {
  if (!issue?.controls) {
    return false;
  }

  return Object.values(issue.controls).some((controlIssues) =>
    controlIssues.some((controlIssue) => controlIssue.severity !== StepIssueSeverityEnum.WARNING)
  );
}
