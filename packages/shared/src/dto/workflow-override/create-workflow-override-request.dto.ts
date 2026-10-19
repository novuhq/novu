import { IWorkflowOverrideRequestDto } from './workflow-override.dto';

export interface ICreateWorkflowOverrideRequestDto extends IWorkflowOverrideRequestDto {
  workflowId: string;

  tenantId: string;
}
