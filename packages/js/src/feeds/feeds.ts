import { BaseModule } from '../base-module';
import { Notification } from './notification';
import { PaginatedResponse, NotificationStatus, TODO } from '../types';
import type {
  FetchFeedArgs,
  FetchCountArgs,
  MarkNotificationAsArgs,
  MarkAllNotificationsAsArgs,
  RemoveNotificationArgs,
  RemoveAllNotificationsArgs,
  MarkNotificationActionAsArgs,
  MarkNotificationsAsArgs,
  RemoveNotificationsArgs,
  MarkNotificationAsByIdArgs,
  MarkNotificationAsByInstanceArgs,
  MarkNotificationsAsByIdsArgs,
  MarkNotificationsAsByInstancesArgs,
  RemoveNotificationByIdArgs,
  RemoveNotificationByInstanceArgs,
  RemoveNotificationsByIdsArgs,
  RemoveNotificationsByInstancesArgs,
  MarkNotificationActionAsByIdArgs,
  MarkNotificationActionAsByInstanceArgs,
} from './types';
import { READ_OR_UNREAD, SEEN_OR_UNSEEN } from '../utils/notification-utils';
import {
  mapFromApiNotification,
  markActionAs,
  markNotificationAs,
  markNotificationsAs,
  remove,
  removeNotifications,
} from './helpers';

export class Feeds extends BaseModule {
  async fetch({ page = 0, status, ...restOptions }: FetchFeedArgs = {}): Promise<PaginatedResponse<Notification>> {
    return this.callWithSession(async () => {
      const args = { page, status, ...restOptions };
      try {
        this._emitter.emit('feeds.fetch.pending', { args });

        const response = await this._apiService.getNotificationsList(page, {
          ...restOptions,
          ...(status && SEEN_OR_UNSEEN.includes(status) && { seen: status === NotificationStatus.SEEN }),
          ...(status && READ_OR_UNREAD.includes(status) && { seen: status === NotificationStatus.READ }),
        });
        const modifiedResponse: PaginatedResponse<Notification> = {
          ...response,
          data: response.data.map((el) => new Notification(mapFromApiNotification(el as TODO))),
        };

        this._emitter.emit('feeds.fetch.success', { args, result: modifiedResponse });

        return modifiedResponse;
      } catch (error) {
        this._emitter.emit('feeds.fetch.error', { args, error });
        throw error;
      }
    });
  }

  async fetchCount({ feedIdentifier, status = NotificationStatus.UNSEEN }: FetchCountArgs = {}): Promise<number> {
    return this.callWithSession(async () => {
      const args = { feedIdentifier, status };
      try {
        this._emitter.emit('feeds.fetch_count.pending', { args });

        let response: { count: number };
        if (SEEN_OR_UNSEEN.includes(status)) {
          response = await this._apiService.getUnseenCount({
            feedIdentifier,
            seen: status === NotificationStatus.SEEN,
          });
        } else {
          response = await this._apiService.getUnreadCount({
            feedIdentifier,
            read: status === NotificationStatus.READ,
          });
        }

        this._emitter.emit('feeds.fetch_count.success', { args, result: response.count });

        return response.count;
      } catch (error) {
        this._emitter.emit('feeds.fetch_count.error', { args, error });
        throw error;
      }
    });
  }

  async markNotificationAs(args: MarkNotificationAsByIdArgs): Promise<Notification>;
  async markNotificationAs(args: MarkNotificationAsByInstanceArgs): Promise<Notification>;
  async markNotificationAs(args: MarkNotificationAsArgs): Promise<Notification> {
    return this.callWithSession(async () =>
      markNotificationAs({
        emitter: this._emitter,
        apiService: this._apiService,
        args,
      })
    );
  }

  async markNotificationsAs(args: MarkNotificationsAsByIdsArgs): Promise<Notification[]>;
  async markNotificationsAs(args: MarkNotificationsAsByInstancesArgs): Promise<Notification[]>;
  async markNotificationsAs(args: MarkNotificationsAsArgs): Promise<Notification[]> {
    return this.callWithSession(async () =>
      markNotificationsAs({
        apiService: this._apiService,
        emitter: this._emitter,
        args,
      })
    );
  }

  async markAllNotificationsAs({
    feedIdentifier,
    status = NotificationStatus.SEEN,
  }: MarkAllNotificationsAsArgs): Promise<number> {
    return this.callWithSession(async () => {
      const args = { feedIdentifier, status };
      try {
        this._emitter.emit('feeds.mark_all_notifications_as.pending', { args });

        let response = 0;
        if (status === NotificationStatus.SEEN) {
          response = await this._apiService.markAllMessagesAsSeen(feedIdentifier);
        } else {
          response = await this._apiService.markAllMessagesAsRead(feedIdentifier);
        }

        this._emitter.emit('feeds.mark_all_notifications_as.success', {
          args,
          result: response,
        });

        return response;
      } catch (error) {
        this._emitter.emit('feeds.mark_all_notifications_as.error', { args, error });
        throw error;
      }
    });
  }

  async markNotificationActionAs(args: MarkNotificationActionAsByIdArgs): Promise<Notification>;
  async markNotificationActionAs(args: MarkNotificationActionAsByInstanceArgs): Promise<Notification>;
  async markNotificationActionAs(args: MarkNotificationActionAsArgs): Promise<Notification> {
    return this.callWithSession(async () =>
      markActionAs({
        apiService: this._apiService,
        emitter: this._emitter,
        args,
      })
    );
  }

  async removeNotification(args: RemoveNotificationByIdArgs): Promise<void>;
  async removeNotification(args: RemoveNotificationByInstanceArgs): Promise<Notification>;
  async removeNotification(args: RemoveNotificationArgs): Promise<Notification | void> {
    return this.callWithSession(async () =>
      remove({
        apiService: this._apiService,
        emitter: this._emitter,
        args,
      })
    );
  }

  async removeNotifications(args: RemoveNotificationsByIdsArgs): Promise<void>;
  async removeNotifications(args: RemoveNotificationsByInstancesArgs): Promise<Notification[]>;
  async removeNotifications(args: RemoveNotificationsArgs): Promise<Notification[] | void> {
    return this.callWithSession(async () =>
      removeNotifications({
        apiService: this._apiService,
        emitter: this._emitter,
        args,
      })
    );
  }

  async removeAllNotifications(args: RemoveAllNotificationsArgs): Promise<void> {
    return this.callWithSession(async () => {
      try {
        const { feedIdentifier } = args;
        this._emitter.emit('feeds.remove_all_notifications.pending', { args });

        await this._apiService.removeAllMessages(feedIdentifier);

        this._emitter.emit('feeds.remove_all_notifications.success', { args, result: undefined });
      } catch (error) {
        this._emitter.emit('feeds.remove_all_notifications.error', { args, error });
        throw error;
      }
    });
  }
}
