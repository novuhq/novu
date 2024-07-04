import type { NotificationActionStatus, NotificationButton, NotificationStatus } from '../types';
import { Notification } from './notification';

export type FetchFeedArgs = {
  page?: number;
  feedIdentifier?: string | string[];
  status?: NotificationStatus;
  limit?: number;
  payload?: Record<string, unknown>;
};

export type FetchCountArgs = {
  feedIdentifier?: string | string[];
  status?: NotificationStatus;
};

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
