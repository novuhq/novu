import { LogCodeEnum, LogStatusEnum } from '@novu/shared';

import type { OrganizationId } from '../organization';
import type { EnvironmentId } from '../environment';
import type { IEntity, TransformEntityToDbModel } from '../../types';

export class LogEntity implements IEntity {
  _id: string;

  transactionId: string;

  text: string;

  code: LogCodeEnum;

  // eslint-disable-next-line
  raw: any;

  status: LogStatusEnum;

  createdAt: string;

  _messageId: string;

  _notificationId: string;

  _subscriberId: string;

  _organizationId: OrganizationId;

  _environmentId: EnvironmentId;
}

export type LogDBModel = TransformEntityToDbModel<LogEntity>;
