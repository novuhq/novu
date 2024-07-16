import { InboxNotification, NotificationFilter } from '../api/types';
import type { NotificationActionStatus, NotificationButton, NotificationStatus } from '../types';
import { Notification } from './notification';

export type FetchFeedArgs = {
  tags?: InboxNotification['tags'];
  read?: boolean;
  archived?: boolean;
  limit?: number;
  after?: string;
  offset?: number;
};

export type FetchFeedResponse = { data: Notification[]; hasMore: boolean; filter: NotificationFilter };

export type FetchCountArgs = {
  tags?: InboxNotification['tags'];
  read?: boolean;
  archived?: boolean;
};

export type FetchCountResponse = {
  data: {
    count: number;
  };
  filter: NotificationFilter;
};

type BaseArgs = {
  notificationId: string;
};

export type InstanceArgs = {
  notification: Notification;
};

export type ReadArgs = BaseArgs | InstanceArgs;
export type UnreadArgs = BaseArgs | InstanceArgs;
export type ArchivedArgs = BaseArgs | InstanceArgs;
export type UnarchivedArgs = BaseArgs | InstanceArgs;

export type MarkNotificationAsBaseArgs = {
  status?: NotificationStatus;
};

export type MarkNotificationAsByIdArgs = MarkNotificationAsBaseArgs & {
  id: string;
};

export type MarkNotificationAsByInstanceArgs = MarkNotificationAsBaseArgs & {
  notification: Notification;
};

export type MarkNotificationsAsByIdsArgs = MarkNotificationAsBaseArgs & {
  ids: string[];
};

export type MarkNotificationsAsByInstancesArgs = MarkNotificationAsBaseArgs & {
  notifications: Notification[];
};

export type MarkNotificationAsArgs = Partial<MarkNotificationAsByIdArgs> & Partial<MarkNotificationAsByInstanceArgs>;

export type MarkNotificationsAsArgs = Partial<MarkNotificationsAsByIdsArgs> &
  Partial<MarkNotificationsAsByInstancesArgs>;

export type MarkAllNotificationsAsArgs = {
  feedIdentifier?: string | string[];
  status?: NotificationStatus.READ | NotificationStatus.SEEN;
};

export type RemoveNotificationByIdArgs = {
  id: string;
};

export type RemoveNotificationByInstanceArgs = {
  notification: Notification;
};

export type RemoveNotificationArgs = Partial<RemoveNotificationByIdArgs> & Partial<RemoveNotificationByInstanceArgs>;

export type RemoveNotificationsByIdsArgs = {
  ids: Array<string>;
};

export type RemoveNotificationsByInstancesArgs = {
  notifications: Array<Notification>;
};

export type RemoveNotificationsArgs = Partial<RemoveNotificationsByIdsArgs> &
  Partial<RemoveNotificationsByInstancesArgs>;

export type RemoveAllNotificationsArgs = {
  feedIdentifier?: string;
};

export type MarkNotificationActionAsBaseArgs = {
  button?: NotificationButton;
  status?: NotificationActionStatus;
};

export type MarkNotificationActionAsByIdArgs = MarkNotificationActionAsBaseArgs & {
  id: string;
};

export type MarkNotificationActionAsByInstanceArgs = MarkNotificationActionAsBaseArgs & {
  notification: Notification;
};

export type MarkNotificationActionAsArgs = Partial<MarkNotificationActionAsByIdArgs> &
  Partial<MarkNotificationActionAsByInstanceArgs>;
