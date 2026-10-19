import { CustomDataType } from '../../types';
import { NotificationStepDto } from '../workflows';

export interface IUpdateNotificationTemplateDto {
  name?: string;

  tags?: string[];

  description?: string;

  identifier?: string;

  critical?: boolean;

  steps?: NotificationStepDto[];

  notificationGroupId?: string;

  data?: CustomDataType;
}
