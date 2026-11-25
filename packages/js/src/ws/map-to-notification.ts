import {
  ActionTypeEnum,
  type ChannelType,
  type InboxNotification,
  NotificationActionStatus,
  type SeverityLevelEnum,
  type Subscriber,
  type Workflow,
} from '../types';
import { sanitizeInAppRedirect } from '../utils/in-app-redirect-url';

type SocketMessageButton = { type?: ActionTypeEnum; content: string; url?: string; target?: unknown };

/** A notification as the socket servers send it in `notification_received`. */
export type SocketMessage = {
  _id: string;
  transactionId: string;
  content: string;
  read: boolean;
  seen: boolean;
  archived: boolean;
  snoozedUntil?: string | null;
  deliveredAt?: string[];
  createdAt: string;
  lastReadDate?: string | null;
  firstSeenDate?: string | null;
  archivedAt?: string | null;
  channel: ChannelType;
  subscriber: {
    _id?: string;
    subscriberId: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    locale?: string;
    data?: Record<string, unknown>;
    timezone?: string;
    email?: string;
    phone?: string;
  };
  subject?: string;
  avatar?: string;
  cta: {
    data?: { url?: string; target?: unknown };
    action?: {
      buttons?: SocketMessageButton[];
      result?: { type?: ActionTypeEnum };
      status?: NotificationActionStatus;
    };
  };
  tags?: string[];
  data?: NotificationData;
  workflow?: Workflow;
  severity: SeverityLevelEnum;
};

export const mapToNotification = ({
  _id,
  transactionId,
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
  data,
  workflow,
  severity,
}: SocketMessage): InboxNotification => {
  const to: Subscriber = {
    id: subscriber._id,
    subscriberId: subscriber.subscriberId,
    firstName: subscriber.firstName,
    lastName: subscriber.lastName,
    avatar: subscriber.avatar,
    locale: subscriber.locale,
    data: subscriber.data,
    timezone: subscriber.timezone,
    email: subscriber.email,
    phone: subscriber.phone,
  };
  const primaryCta = cta.action?.buttons?.find((button) => button.type === ActionTypeEnum.PRIMARY);
  const secondaryCta = cta.action?.buttons?.find((button) => button.type === ActionTypeEnum.SECONDARY);
  const actionType = cta.action?.result?.type;
  const actionStatus = cta.action?.status;

  return {
    id: _id,
    transactionId,
    subject,
    body: content,
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
      isCompleted: actionType === ActionTypeEnum.PRIMARY && actionStatus === NotificationActionStatus.DONE,
      redirect: sanitizeInAppRedirect(primaryCta.url, primaryCta.target),
    },
    secondaryAction: secondaryCta && {
      label: secondaryCta.content,
      isCompleted: actionType === ActionTypeEnum.SECONDARY && actionStatus === NotificationActionStatus.DONE,
      redirect: sanitizeInAppRedirect(secondaryCta.url, secondaryCta.target),
    },
    channelType: channel,
    tags,
    redirect: sanitizeInAppRedirect(cta.data?.url, cta.data?.target),
    data,
    workflow,
    severity,
  };
};
