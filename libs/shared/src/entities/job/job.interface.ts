import { EnvironmentId, ITenantDefine, OrganizationId, StepTypeEnum } from '../../types';
import { IWorkflowStepMetadata } from '../step';
import { JobStatusEnum } from './status.enum';
import { INotificationTemplateStep } from '../notification-template';

export interface IJob {
  _id: string;
  identifier: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error?: any;
  createdAt: string;
  updatedAt: string;
  expireAt?: string;
  _templateId: string;
  digest?: IWorkflowStepMetadata & {
    events?: any[];
  };
  type?: StepTypeEnum;
  _actorId?: string;
}
