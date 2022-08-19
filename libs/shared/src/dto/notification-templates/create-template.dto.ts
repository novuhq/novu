import { NotificationStepDto } from './notification-template.dto';
import { IPreferenceChannels } from '../../entities/subscriber-preference';

export interface ICreateNotificationTemplateDto {
  name: string;

  tags: string[];

  description: string;

  steps: NotificationStepDto[];

  notificationGroupId: string;

  active?: boolean;

  draft?: boolean;

  critical?: boolean;

  preferenceSettings?: IPreferenceChannels;
}
