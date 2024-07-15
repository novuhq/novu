import { NotificationFilter } from 'src/api/types';
import { BaseModule } from '../base-module';
import { NotificationStatus, TODO } from '../types';
import {
  mapFromApiNotification,
  markActionAs,
  markArchived,
  markNotificationAs,
  markNotificationsAs,
  markRead,
  markUnarchived,
  markUnread,
  remove,
  removeNotifications,
} from './helpers';
import { Notification } from './notification';
import type {
  ArchivedArgs,
  FetchCountArgs,
  FetchCountResponse,
  FetchFeedArgs,
  FetchFeedResponse,
  InstanceArgs,
  MarkAllNotificationsAsArgs,
  MarkNotificationActionAsArgs,
  MarkNotificationActionAsByIdArgs,
  MarkNotificationActionAsByInstanceArgs,
  MarkNotificationAsArgs,
  MarkNotificationAsByIdArgs,
  MarkNotificationAsByInstanceArgs,
  MarkNotificationsAsArgs,
  MarkNotificationsAsByIdsArgs,
  MarkNotificationsAsByInstancesArgs,
  ReadArgs,
  RemoveAllNotificationsArgs,
  RemoveNotificationArgs,
  RemoveNotificationByIdArgs,
  RemoveNotificationByInstanceArgs,
  RemoveNotificationsArgs,
  RemoveNotificationsByIdsArgs,
  RemoveNotificationsByInstancesArgs,
  UnarchivedArgs,
  UnreadArgs,
} from './types';

export class Feeds extends BaseModule {
  async fetch({ limit = 10, ...restOptions }: FetchFeedArgs = {}): Promise<FetchFeedResponse> {
    return this.callWithSession(async () => {
      const args = { status, ...restOptions };
      try {
        this._emitter.emit('feeds.fetch.pending', { args });

        const response = await this._inboxService.fetchNotifications({
          limit,
          ...restOptions,
        });

        const modifiedResponse: FetchFeedResponse = {
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

  async fetchCount({ archived, read, tags }: FetchCountArgs = {}): Promise<FetchCountResponse> {
    return this.callWithSession(async () => {
      const args = { archived, read, tags };
      try {
        this._emitter.emit('feeds.fetch_count.pending', { args });

        const response = await this._inboxService.count({
          archived,
          read,
          tags,
        });

        this._emitter.emit('feeds.fetch_count.success', { args, result: response });

        return response;
      } catch (error) {
        this._emitter.emit('feeds.fetch_count.error', { args, error });
        throw error;
      }
    });
  }

  async read(args: InstanceArgs): Promise<Notification>;
  async read(args: ReadArgs): Promise<Notification> {
    return this.callWithSession(async () =>
      markRead({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }

  async unread(args: InstanceArgs): Promise<Notification>;
  async unread(args: UnreadArgs): Promise<Notification> {
    return this.callWithSession(async () =>
      markUnread({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }

  async archived(args: InstanceArgs): Promise<Notification>;
  async archived(args: ArchivedArgs): Promise<Notification> {
    return this.callWithSession(async () =>
      markArchived({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }

  async unarchived(args: InstanceArgs): Promise<Notification>;
  async unarchived(args: UnarchivedArgs): Promise<Notification> {
    return this.callWithSession(async () =>
      markUnarchived({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }

  async readAll({ tags }: { tags?: NotificationFilter['tags'] } = {}): Promise<void> {
    return this.callWithSession(async () => {
      try {
        this._emitter.emit('feeds.read_all.pending', { args: { tags } });

        await this._inboxService.readAll({ tags });

        this._emitter.emit('feeds.read_all.success', { args: { tags }, result: undefined });
      } catch (error) {
        this._emitter.emit('feeds.read_all.error', { args: { tags }, error });
        throw error;
      }
    });
  }

  async archivedAll({ tags }: { tags?: NotificationFilter['tags'] } = {}): Promise<void> {
    return this.callWithSession(async () => {
      try {
        this._emitter.emit('feeds.archived_all.pending', { args: { tags } });

        await this._inboxService.archivedAll({ tags });

        this._emitter.emit('feeds.archived_all.success', { args: { tags }, result: undefined });
      } catch (error) {
        this._emitter.emit('feeds.archived_all.error', { args: { tags }, error });
        throw error;
      }
    });
  }

  async readArchivedAll({ tags }: { tags?: NotificationFilter['tags'] } = {}): Promise<void> {
    return this.callWithSession(async () => {
      try {
        this._emitter.emit('feeds.read_archived_all.pending', { args: { tags } });

        await this._inboxService.readArchivedAll({ tags });

        this._emitter.emit('feeds.read_archived_all.success', { args: { tags }, result: undefined });
      } catch (error) {
        this._emitter.emit('feeds.read_archived_all.error', { args: { tags }, error });
        throw error;
      }
    });
  }

  /**
   * @deprecated
   */
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

  /**
   * @deprecated
   */
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

  /**
   * @deprecated
   */
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

  /**
   * @deprecated
   */
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
