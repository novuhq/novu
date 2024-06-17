import type { ChannelTypeEnum, IActor, IMessageCTA, INotificationDto, ISubscriberResponseDto } from '@novu/shared';

export class Notification {
  _id: string;
  _subscriberId: string;
  _feedId?: string | null;
  createdAt: string;
  updatedAt: string;
  actor?: IActor;
  subscriber?: ISubscriberResponseDto;
  transactionId: string;
  templateIdentifier: string;
  content: string;
  read: boolean;
  seen: boolean;
  cta: IMessageCTA;
  payload: Record<string, unknown>;
  overrides: Record<string, unknown>;

  constructor(notification: INotificationDto) {
    this._id = notification._id;
    this._subscriberId = notification._subscriberId;
    this._feedId = notification._feedId;
    this.createdAt = notification.createdAt;
    this.updatedAt = notification.updatedAt;
    this.actor = notification.actor;
    this.subscriber = notification.subscriber;
    this.transactionId = notification.transactionId;
    this.templateIdentifier = notification.templateIdentifier;
    this.content = notification.content;
    this.read = notification.read;
    this.seen = notification.seen;
    this.cta = notification.cta;
    this.payload = notification.payload;
    this.overrides = notification.overrides;
  }
}
