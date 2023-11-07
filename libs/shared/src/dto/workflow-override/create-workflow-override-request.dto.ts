import { IWorkflowOverrideRequestDto } from './shared';

export interface ICreateWorkflowOverrideRequestDto extends IWorkflowOverrideRequestDto {
  workflowId?: string;

  triggerIdentifier?: string;

  tenantIdentifier?: string;
}
