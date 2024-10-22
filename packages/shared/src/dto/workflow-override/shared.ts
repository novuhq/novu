import { IPreferenceChannelsDto } from '../notification-templates';

export interface IWorkflowOverrideRequestDto {
  active?: boolean;

  preferenceSettings?: IPreferenceChannelsDto;
}
