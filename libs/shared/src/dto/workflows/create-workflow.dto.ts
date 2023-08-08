import { NotificationStepDto } from './workflow.dto';
import { IPreferenceChannels } from '../../entities/subscriber-preference';
import { NotificationTemplateCustomData } from '../../types';

export interface ICreateWorkflowDto {
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
