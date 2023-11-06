import { IWorkflowOverride } from '../../entities/workflow-override';
import { IPreferenceChannels } from '../../entities/subscriber-preference';

export type ICreateWorkflowOverrideResponseDto = IWorkflowOverride;

export interface ICreateWorkflowOverrideRequestDto {
  _workflowId?: string;

  triggerIdentifier?: string;

  tenantIdentifier: string;

  active?: boolean;

  preferenceSettings?: IPreferenceChannels;
}
