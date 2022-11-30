import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';

export class ExecutionDetailsEntity {
  _id?: string;
  _jobId: string;
  _environmentId: string;
  _organizationId: string;
  _notificationId: string;
  _notificationTemplateId: string;
  _subscriberId: string;
  _messageId?: string;
  providerId?: string;
  transactionId: string;
  channel?: StepTypeEnum;
  detail: string;
  source: ExecutionDetailsSourceEnum;
  status: ExecutionDetailsStatusEnum;
  isTest: boolean;
  isRetry: boolean;
  createdAt?: string;
  raw?: string;
  webhookStatus?: string;
}
