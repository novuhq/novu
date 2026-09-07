import { StepAlreadyExistsError } from '../../errors';
import type { DiscoverStepOutput, DiscoverWorkflowOutput } from '../../types';

export async function discoverStep(
  targetWorkflow: DiscoverWorkflowOutput,
  stepId: string,
  step: DiscoverStepOutput
): Promise<void> {
  if (targetWorkflow.steps.some((workflowStep) => workflowStep.stepId === stepId)) {
    throw new StepAlreadyExistsError(stepId);
  } else {
    targetWorkflow.steps.push(step);
  }
}
