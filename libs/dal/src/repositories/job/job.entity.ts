import { ChannelTypeEnum, DigestUnitEnum, DigestTypeEnum } from '@novu/shared';
import { NotificationStepEntity } from '../notification-template';

export enum JobStatusEnum {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  CANCELED = 'canceled',
}

export class JobEntity {
  _id?: string;
  identifier: string;
  payload: any;
  step: NotificationStepEntity;
  transactionId: string;
  _notificationId: string;
  _subscriberId: string;
  _environmentId: string;
  _organizationId: string;
  _userId: string;
  delay?: number;
  _parentId?: string;
  status: JobStatusEnum;
  error?: any;
  createdAt?: string;
  _templateId: string;
  digest?: {
    events?: any[];
    amount?: number;
    unit?: DigestUnitEnum;
    batchkey?: string;
    type: DigestTypeEnum;
    backoffunit?: DigestUnitEnum;
    backoffamount?: number;
  };
  type?: ChannelTypeEnum;
}
