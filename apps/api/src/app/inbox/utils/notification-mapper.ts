import type { MessageEntity } from '@novu/dal';
import { ButtonTypeEnum, MessageActionStatusEnum, SeverityLevelEnum } from '@novu/shared';

import type { InboxNotification, Subscriber } from './types';

const mapSingleItem = ({
  _id,
  content,
  read,
  seen,
  archived,
  snoozedUntil,
  deliveredAt,
  createdAt,
  lastReadDate,
  firstSeenDate,
  archivedAt,
  channel,
  subscriber,
  subject,
  avatar,
  cta,
  tags,
  severity,
  data,
  template,
  transactionId,
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
  const actionType = cta.action?.result?.type;
  const actionStatus = cta.action?.status;

  return {
    id: _id,
    transactionId,
    subject,
    body: content as string,
    to,
    isRead: read,
    isSeen: seen,
    isArchived: archived,
    isSnoozed: !!snoozedUntil,
    ...(deliveredAt && {
      deliveredAt,
    }),
    ...(snoozedUntil && {
      snoozedUntil,
    }),
    createdAt,
    readAt: lastReadDate,
    firstSeenAt: firstSeenDate,
    archivedAt,
    avatar,
    primaryAction: primaryCta && {
      label: primaryCta.content,
      isCompleted: actionType === ButtonTypeEnum.PRIMARY && actionStatus === MessageActionStatusEnum.DONE,
      redirect: primaryCta.url
        ? {
            url: primaryCta.url,
            target: primaryCta.target,
          }
        : undefined,
    },
    secondaryAction: secondaryCta && {
      label: secondaryCta.content,
      isCompleted: actionType === ButtonTypeEnum.SECONDARY && actionStatus === MessageActionStatusEnum.DONE,
      redirect: secondaryCta.url
        ? {
            url: secondaryCta.url,
            target: secondaryCta.target,
          }
        : undefined,
    },
    channelType: channel,
    tags,
    severity: severity ?? SeverityLevelEnum.NONE,
    redirect: cta.data?.url
      ? {
          url: cta.data.url,
          target: cta.data.target,
        }
      : undefined,
    data,
    workflow: template
      ? {
          critical: template.critical,
          id: template._id,
          identifier: template.triggers?.[0]?.identifier,
          name: template.name,
          tags: template.tags,
          severity: template.severity ?? SeverityLevelEnum.NONE,
        }
      : undefined,
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
