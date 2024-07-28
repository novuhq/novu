import type { ActionTypeEnum, NotificationFilter } from '../types';
import { Notification } from './notification';

export type FetchFeedArgs = {
  tags?: string[];
  read?: boolean;
  archived?: boolean;
  limit?: number;
  after?: string;
  offset?: number;
};

export type FetchFeedResponse = { data: Notification[]; hasMore: boolean; filter: NotificationFilter };

export type FetchCountArgs = {
  tags?: string[];
  read?: boolean;
  archived?: boolean;
};

export type FetchCountResponse = {
  data: {
    count: number;
  };
  filter: NotificationFilter;
};

export type BaseArgs = {
  notificationId: string;
};

export type InstanceArgs = {
  notification: Notification;
};

export type ActionTypeArgs = { actionType: ActionTypeEnum };

export type ReadArgs = BaseArgs | InstanceArgs;
export type UnreadArgs = BaseArgs | InstanceArgs;
export type ArchivedArgs = BaseArgs | InstanceArgs;
export type UnarchivedArgs = BaseArgs | InstanceArgs;
export type CompleteArgs = BaseArgs | InstanceArgs;
export type RevertArgs = BaseArgs | InstanceArgs;
