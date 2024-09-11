import { NotificationStepDto } from '../workflows';
import { IPreferenceChannels } from '../../entities/subscriber-preference';
import { NotificationTemplateCustomData } from '../../types';
import { INotificationGroup } from '../../entities/notification-group';

export interface ICreateNotificationTemplateDto {
  name: string;

  tags: string[];

  description?: string;

  steps: NotificationStepDto[];

  notificationGroupId?: string;

  notificationGroup?: INotificationGroup;

  active?: boolean;

  draft?: boolean;

  critical?: boolean;

  preferenceSettings?: IPreferenceChannels;

  blueprintId?: string;

  data?: NotificationTemplateCustomData;
}
