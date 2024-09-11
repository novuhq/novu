import { IWorkflowOverrideRequestDto } from './shared';

export interface ICreateWorkflowOverrideRequestDto extends IWorkflowOverrideRequestDto {
  workflowId: string;

  tenantId: string;
}
