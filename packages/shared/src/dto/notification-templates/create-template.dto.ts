import { NotificationStepDto } from '../workflows';
import { CustomDataType } from '../../types';

export interface IPreferenceChannelsDto {
  email?: boolean;
  sms?: boolean;
  in_app?: boolean;
  chat?: boolean;
  push?: boolean;
}

export interface INotificationGroupDto {
  _id?: string;

  name: string;

  _environmentId: string;

  _organizationId: string;

  _parentId?: string;
}

export interface ICreateNotificationTemplateDto {
  name: string;

  tags: string[];

  description?: string;

  steps: NotificationStepDto[];

  notificationGroupId?: string;

  notificationGroup?: INotificationGroupDto;

  active?: boolean;

  draft?: boolean;

  critical?: boolean;

  preferenceSettings?: IPreferenceChannelsDto;

  blueprintId?: string;

  data?: CustomDataType;
}
