import { CustomDataType } from '../../types';
import { NotificationStepDto } from './workflow-deprecated.dto';

/**
 * @deprecated use UpdateWorkflowDto instead
 */
export interface IUpdateWorkflowDto {
  name?: string;

  tags?: string[];

  description?: string;

  identifier?: string;

  critical?: boolean;

  steps?: NotificationStepDto[];

  notificationGroupId?: string;

  data?: CustomDataType;
}
