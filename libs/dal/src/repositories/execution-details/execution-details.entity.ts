import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';

import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';
import type { ChangePropsValueType } from '../../types/helpers';

export class ExecutionDetailsEntity {
  _id: string;
  _jobId: string;
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
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
  createdAt: string;
  expireAt?: string;
  raw?: string | null;
  webhookStatus?: string;
}

export type ExecutionDetailsDBModel = ChangePropsValueType<
  ExecutionDetailsEntity,
  '_environmentId' | '_organizationId' | '_notificationId' | '_notificationTemplateId' | '_subscriberId'
>;
