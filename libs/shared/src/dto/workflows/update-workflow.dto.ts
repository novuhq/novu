import { NotificationStepDto } from './workflow.dto';

export interface IUpdateWorkflowDto {
  name?: string;

  tags?: string[];

  description?: string;

  identifier?: string;

  critical?: boolean;

  steps?: NotificationStepDto[];

  notificationGroupId?: string;
}
