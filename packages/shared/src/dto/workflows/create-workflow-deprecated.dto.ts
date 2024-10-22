import { NotificationStepDto } from './workflow.dto';
import { CustomDataType } from '../../types';

interface IPreferenceChannelsDto {
  email?: boolean;
  sms?: boolean;
  in_app?: boolean;
  chat?: boolean;
  push?: boolean;
}

/**
 * @deprecated use CreateWorkflowDto instead
 */
export interface ICreateWorkflowDto {
  name: string;

  tags: string[];

  description?: string;

  steps: NotificationStepDto[];

  notificationGroupId: string;

  active?: boolean;

  draft?: boolean;

  critical?: boolean;

  preferenceSettings?: IPreferenceChannelsDto;

  blueprintId?: string;

  data?: CustomDataType;
}
