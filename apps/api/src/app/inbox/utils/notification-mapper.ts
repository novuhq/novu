import type { MessageEntity } from '@novu/dal';
import { ButtonTypeEnum } from '@novu/shared';

import type { InboxNotification, Subscriber } from './types';

const mapSingleItem = ({
  _id,
  content,
  read,
  archived,
  createdAt,
  lastReadDate,
  archivedAt,
  channel,
  subscriber,
  actorSubscriber,
  actor,
  cta,
  tags,
}: MessageEntity): InboxNotification => {
  const to: Subscriber = {
    id: subscriber?._id ?? '',
    firstName: subscriber?.firstName,
    lastName: subscriber?.lastName,
    avatar: subscriber?.avatar,
    subscriberId: subscriber?.subscriberId ?? '',
  };
  const primaryCta = cta.action?.buttons?.find((button) => button.type === ButtonTypeEnum.PRIMARY);
  const secondaryCta = cta.action?.buttons?.find((button) => button.type === ButtonTypeEnum.SECONDARY);

  return {
    id: _id,
    // subject: subject,
    body: content as string,
    to,
    read,
    archived,
    createdAt,
    readAt: lastReadDate,
    archivedAt,
    actor: actorSubscriber
      ? {
          id: actorSubscriber._id,
          firstName: actorSubscriber.firstName,
          lastName: actorSubscriber.lastName,
          avatar: actorSubscriber.avatar,
          subscriberId: actorSubscriber.subscriberId,
        }
      : undefined,
    avatar: actor,
    primaryAction: primaryCta && {
      type: primaryCta.type,
      label: primaryCta.content,
      url: cta?.data.url,
    },
    secondaryAction: secondaryCta && {
      type: secondaryCta.type,
      label: secondaryCta.content,
    },
    channelType: channel,
    tags,
  };
};

/**
 * Currently the message entity has a generic interface for the messages from the different channels,
 * so we need to map it to a Notification DTO that is specific message interface for the in-app channel.
 */
export function mapToDto(notification: MessageEntity): InboxNotification;
export function mapToDto(notification: MessageEntity[]): InboxNotification[];
export function mapToDto(notification: MessageEntity | MessageEntity[]): InboxNotification | InboxNotification[] {
  return Array.isArray(notification) ? notification.map((el) => mapSingleItem(el)) : mapSingleItem(notification);
}
