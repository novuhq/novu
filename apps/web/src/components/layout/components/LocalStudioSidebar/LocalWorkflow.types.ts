import { BridgeWorkflowStepType } from '../../../../studio/types';

/**
 * @deprecated these are placeholder types until we leverage shared types
 */
export type LocalWorkflowStep = {
  type: BridgeWorkflowStepType;
  stepId: string;
};

/**
 * @deprecated these are placeholder types until we leverage shared types
 */
export type LocalWorkflow = {
  workflowId: string;
  steps: LocalWorkflowStep[];
};
