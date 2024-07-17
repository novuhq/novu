import { BaseModule } from '../base-module';
import { ActionTypeEnum, NotificationFilter } from '../types';
import { archive, completeAction, read, revertAction, unarchive, unread } from './helpers';
import { Notification } from './notification';
import type {
  ArchivedArgs,
  CompleteArgs,
  FetchCountArgs,
  FetchCountResponse,
  FetchFeedArgs,
  FetchFeedResponse,
  InstanceArgs,
  ReadArgs,
  UnarchivedArgs,
  UnreadArgs,
  RevertArgs,
} from './types';

export class Feeds extends BaseModule {
  async fetch({ limit = 10, ...restOptions }: FetchFeedArgs = {}): Promise<FetchFeedResponse> {
    return this.callWithSession(async () => {
      const args = { limit, ...restOptions };
      try {
        this._emitter.emit('feeds.fetch.pending', { args });

        const response = await this._inboxService.fetchNotifications({
          limit,
          ...restOptions,
        });

        const modifiedResponse: FetchFeedResponse = {
          ...response,
          data: response.data.map((el) => new Notification(el)),
        };

        this._emitter.emit('feeds.fetch.success', { args, result: modifiedResponse });

        return modifiedResponse;
      } catch (error) {
        this._emitter.emit('feeds.fetch.error', { args, error });
        throw error;
      }
    });
  }

  async fetchCount(countArgs: FetchCountArgs = {}): Promise<FetchCountResponse> {
    return this.callWithSession(async () => {
      const args = { archived: countArgs.archived, read: countArgs.read, tags: countArgs.tags };
      try {
        this._emitter.emit('feeds.fetch_count.pending', { args });

        const response = await this._inboxService.count({
          archived: countArgs.archived,
          read: countArgs.read,
          tags: countArgs.tags,
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
      read({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }

  async unread(args: InstanceArgs): Promise<Notification>;
  async unread(args: UnreadArgs): Promise<Notification> {
    return this.callWithSession(async () =>
      unread({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }

  async archive(args: InstanceArgs): Promise<Notification>;
  async archive(args: ArchivedArgs): Promise<Notification> {
    return this.callWithSession(async () =>
      archive({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }

  async unarchive(args: InstanceArgs): Promise<Notification>;
  async unarchive(args: UnarchivedArgs): Promise<Notification> {
    return this.callWithSession(async () =>
      unarchive({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }

  async completePrimary(args: InstanceArgs): Promise<Notification>;
  async completePrimary(args: CompleteArgs): Promise<Notification> {
    return this.callWithSession(async () =>
      completeAction({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
        actionType: ActionTypeEnum.PRIMARY,
      })
    );
  }

  async completeSecondary(args: InstanceArgs): Promise<Notification>;
  async completeSecondary(args: CompleteArgs): Promise<Notification> {
    return this.callWithSession(async () =>
      completeAction({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
        actionType: ActionTypeEnum.SECONDARY,
      })
    );
  }

  async revertPrimary(args: InstanceArgs): Promise<Notification>;
  async revertPrimary(args: RevertArgs): Promise<Notification> {
    return this.callWithSession(async () =>
      revertAction({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
        actionType: ActionTypeEnum.PRIMARY,
      })
    );
  }

  async revertSecondary(args: InstanceArgs): Promise<Notification>;
  async revertSecondary(args: RevertArgs): Promise<Notification> {
    return this.callWithSession(async () =>
      revertAction({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
        actionType: ActionTypeEnum.SECONDARY,
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

  async archiveAll({ tags }: { tags?: NotificationFilter['tags'] } = {}): Promise<void> {
    return this.callWithSession(async () => {
      try {
        this._emitter.emit('feeds.archive_all.pending', { args: { tags } });

        await this._inboxService.archiveAll({ tags });

        this._emitter.emit('feeds.archive_all.success', { args: { tags }, result: undefined });
      } catch (error) {
        this._emitter.emit('feeds.archive_all.error', { args: { tags }, error });
        throw error;
      }
    });
  }

  async archiveAllRead({ tags }: { tags?: NotificationFilter['tags'] } = {}): Promise<void> {
    return this.callWithSession(async () => {
      try {
        this._emitter.emit('feeds.archive_all_read.pending', { args: { tags } });

        await this._inboxService.archiveAllRead({ tags });

        this._emitter.emit('feeds.archive_all_read.success', { args: { tags }, result: undefined });
      } catch (error) {
        this._emitter.emit('feeds.archive_all_read.error', { args: { tags }, error });
        throw error;
      }
    });
  }
}
