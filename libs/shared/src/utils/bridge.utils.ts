import { WorkflowTypeEnum } from '../types';

export const isBridgeWorkflow = (workflowType?: WorkflowTypeEnum): boolean => {
  return workflowType === WorkflowTypeEnum.BRIDGE || workflowType === WorkflowTypeEnum.ECHO;
};
