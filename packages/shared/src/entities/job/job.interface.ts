import { ChannelTypeEnum, EnvironmentId, ITenantDefine, OrganizationId, StepTypeEnum } from '../../types';
import { INotificationTemplateStep } from '../notification-template';
import { IWorkflowStepMetadata } from '../step';
import { JobStatusEnum } from './status.enum';

export interface IJob {
  _id: string;
  identifier: string;
  payload: any;

  overrides: Record<string, Record<string, unknown>>;
  step: INotificationTemplateStep;
  tenant?: ITenantDefine;
  transactionId: string;
  _notificationId: string;
  subscriberId: string;
  _subscriberId: string;
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  providerId?: string;
  _userId: string;
  delay?: number;
  _parentId?: string;
  status: JobStatusEnum;
  error?: any;
  createdAt: string;
  updatedAt: string;
  _templateId: string;
  digest?: IWorkflowStepMetadata & {
    events?: any[];
  };
  type?: StepTypeEnum;
  _actorId?: string;
  scheduleExtensionsCount?: number;
  // Activity feed channel preview metadata. Populated from the delivered
  // MessageEntity so the activity feed can render the actual message content
  // (email HTML, SMS text, push/chat body) without re-fetching per step.
  messageId?: string;
  channel?: ChannelTypeEnum;
  messageContent?: string | null;
  messageSubject?: string | null;
  messageTitle?: string | null;
}
