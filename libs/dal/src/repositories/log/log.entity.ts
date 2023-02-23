import { Types } from 'mongoose';
import { LogCodeEnum, LogStatusEnum } from '@novu/shared';

import type { OrganizationId } from '../organization';
import type { EnvironmentId } from '../environment';

export class LogEntity {
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

export type LogDBModel = Omit<
  LogEntity,
  'createdAt' | '_messageId' | '_subscriberId' | '_notificationId' | '_organizationId' | '_environmentId'
> & {
  createdAt: Date;

  _messageId: Types.ObjectId;

  _subscriberId: Types.ObjectId;

  _notificationId: Types.ObjectId;

  _organizationId: Types.ObjectId;

  _environmentId: Types.ObjectId;
};
