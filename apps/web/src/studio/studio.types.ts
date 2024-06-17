/**
 * @deprecated Temporary type until framework types are available
 */
export type BridgeWorkflowStepType = 'email' | 'in_app' | 'sms' | 'chat' | 'push' | 'digest' | 'delay' | 'custom';

/**
 * @deprecated Temporary type until framework types are available
 */
export interface IBridgeWorkflowStep {
  stepId: string;
  type: BridgeWorkflowStepType;
}

/**
 * @deprecated Temporary type until framework types are available
 */
export interface IBridgeWorkflow {
  workflowId: string;
  code: string;
  steps: IBridgeWorkflowStep[];
}
