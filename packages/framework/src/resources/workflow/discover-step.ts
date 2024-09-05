import { StepAlreadyExistsError } from '../../errors';
import type { DiscoverStepOutput, DiscoverWorkflowOutput } from '../../types';

export function discoverStep(targetWorkflow: DiscoverWorkflowOutput, stepId: string, step: DiscoverStepOutput): void {
  if (targetWorkflow.steps.some((workflowStep) => workflowStep.stepId === stepId)) {
    throw new StepAlreadyExistsError(stepId);
  } else {
    targetWorkflow.steps.push(step);
  }
}
