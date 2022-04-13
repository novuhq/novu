import { LogCodeEnum, LogStatusEnum } from '@novu/shared';

export class LogEntity {
  _id?: string;

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

  _organizationId: string;

  _environmentId: string;
}
