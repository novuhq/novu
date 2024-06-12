import {
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  StepTypeEnum,
} from '@novu/shared';
import { EmailEventStatusEnum, SmsEventStatusEnum } from '@novu/stateless';

import {
  IBulkJobParams,
  IJobParams,
} from '../services/queues/queue-base.service';

export interface IExecutionLogJobDataDto {
  environmentId: string;

  organizationId: string;

  subscriberId: string;

  jobId?: string;

  notificationId: string;

  notificationTemplateId?: string;

  messageId?: string;

  providerId?: string;

  expireAt?: string;

  transactionId: string;

  channel?: StepTypeEnum;

  detail: string;

  source: ExecutionDetailsSourceEnum;

  status: ExecutionDetailsStatusEnum;

  isTest: boolean;

  isRetry: boolean;

  raw?: string | null;

  _subscriberId?: string;

  _id?: string;

  createdAt?: Date;

  webhookStatus?: EmailEventStatusEnum | SmsEventStatusEnum;
}

export interface IExecutionLogJobDto extends IJobParams {
  data?: IExecutionLogJobDataDto;
}

export interface IExecutionLogBulkJobDto extends IBulkJobParams {
  data: IExecutionLogJobDataDto;
}
