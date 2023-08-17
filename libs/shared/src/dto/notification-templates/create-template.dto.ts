import { NotificationStepDto } from '../workflows';
import { IPreferenceChannels } from '../../entities/subscriber-preference';
import { NotificationTemplateCustomData } from '../../types';

export interface ICreateNotificationTemplateDto {
  name: string;

  tags: string[];

  description?: string;

  steps: NotificationStepDto[];

  notificationGroupId: string;

  active?: boolean;

  draft?: boolean;

  critical?: boolean;

  preferenceSettings?: IPreferenceChannels;

  blueprintId?: string;

  data?: NotificationTemplateCustomData;
}
