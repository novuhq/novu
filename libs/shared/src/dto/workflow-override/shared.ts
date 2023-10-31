import { IPreferenceChannels } from '../../entities/subscriber-preference';

export interface IWorkflowOverrideRequestDto {
  _workflowId?: string;

  triggerIdentifier?: string;

  tenantIdentifier?: string;

  active?: boolean;

  preferenceSettings?: IPreferenceChannels;
}
