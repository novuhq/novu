import { InboxService } from '../api';
import { NovuEventEmitter } from '../event-emitter';
import { BaseModule } from '../base-module';
import { ActionTypeEnum, NotificationFilter, Result } from '../types';
import {
  archive,
  archiveAll,
  archiveAllRead,
  completeAction,
  read,
  readAll,
  revertAction,
  unarchive,
  unread,
} from './helpers';
import { Notification } from './notification';
import type {
  ArchivedArgs,
  CompleteArgs,
  FiltersCountResponse,
  ListNotificationsArgs,
  ListNotificationsResponse,
  InstanceArgs,
  ReadArgs,
  UnarchivedArgs,
  UnreadArgs,
  RevertArgs,
  FilterCountArgs,
  CountArgs,
  FilterCountResponse,
  FiltersCountArgs,
  CountResponse,
  BaseArgs,
} from './types';
import { NovuError } from '../utils/errors';
import { NotificationsCache } from '../cache';

export class Notifications extends BaseModule {
  #useCache: boolean;

  readonly cache: NotificationsCache;

  constructor({
    useCache,
    inboxServiceInstance,
    eventEmitterInstance,
  }: {
    useCache: boolean;
    inboxServiceInstance: InboxService;
    eventEmitterInstance: NovuEventEmitter;
  }) {
    super({
      eventEmitterInstance,
      inboxServiceInstance,
    });
    this.cache = new NotificationsCache({
      emitter: eventEmitterInstance,
    });
    this.#useCache = useCache;
  }

  async list({ limit = 10, ...restOptions }: ListNotificationsArgs = {}): Result<ListNotificationsResponse> {
    return this.callWithSession(async () => {
      const args = { limit, ...restOptions };
      try {
        const shouldUseCache = 'useCache' in args ? args.useCache : this.#useCache;
        let data: ListNotificationsResponse | undefined = shouldUseCache ? this.cache.getAll(args) : undefined;
        this._emitter.emit('notifications.list.pending', { args, data });

        if (!data) {
          const response = await this._inboxService.fetchNotifications({
            limit,
            ...restOptions,
          });

          data = {
            hasMore: response.hasMore,
            filter: response.filter,
            notifications: response.data.map((el) => new Notification(el, this._emitter, this._inboxService)),
          };

          if (shouldUseCache) {
            this.cache.set(args, data);
            data = this.cache.getAll(args);
          }
        }

        this._emitter.emit('notifications.list.resolved', { args, data });

        return { data };
      } catch (error) {
        this._emitter.emit('notifications.list.resolved', { args, error });

        return { error: new NovuError('Failed to fetch notifications', error) };
      }
    });
  }

  async count(args?: FilterCountArgs): Result<FilterCountResponse>;
  async count(args?: FiltersCountArgs): Result<FiltersCountResponse>;
  async count(args: CountArgs): Result<CountResponse> {
    return this.callWithSession(async () => {
      const filters: NotificationFilter[] = args && 'filters' in args ? args.filters : [{ ...args }];

      try {
        this._emitter.emit('notifications.count.pending', { args });

        const response = await this._inboxService.count({
          filters,
        });

        const data = args && 'filters' in args ? { counts: response.data } : response.data[0];

        this._emitter.emit('notifications.count.resolved', {
          args,
          data,
        });

        return { data };
      } catch (error) {
        this._emitter.emit('notifications.count.resolved', { args, error });

        return { error: new NovuError('Failed to count notifications', error) };
      }
    });
  }

  async read(args: BaseArgs): Result<Notification>;
  async read(args: InstanceArgs): Result<Notification>;
  async read(args: ReadArgs): Result<Notification> {
    return this.callWithSession(async () =>
      read({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }

  async unread(args: BaseArgs): Result<Notification>;
  async unread(args: InstanceArgs): Result<Notification>;
  async unread(args: UnreadArgs): Result<Notification> {
    return this.callWithSession(async () =>
      unread({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }

  async archive(args: BaseArgs): Result<Notification>;
  async archive(args: InstanceArgs): Result<Notification>;
  async archive(args: ArchivedArgs): Result<Notification> {
    return this.callWithSession(async () =>
      archive({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }

  async unarchive(args: BaseArgs): Result<Notification>;
  async unarchive(args: InstanceArgs): Result<Notification>;
  async unarchive(args: UnarchivedArgs): Result<Notification> {
    return this.callWithSession(async () =>
      unarchive({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }

  async completePrimary(args: BaseArgs): Result<Notification>;
  async completePrimary(args: InstanceArgs): Result<Notification>;
  async completePrimary(args: CompleteArgs): Result<Notification> {
    return this.callWithSession(async () =>
      completeAction({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
        actionType: ActionTypeEnum.PRIMARY,
      })
    );
  }

  async completeSecondary(args: BaseArgs): Result<Notification>;
  async completeSecondary(args: InstanceArgs): Result<Notification>;
  async completeSecondary(args: CompleteArgs): Result<Notification> {
    return this.callWithSession(async () =>
      completeAction({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
        actionType: ActionTypeEnum.SECONDARY,
      })
    );
  }

  async revertPrimary(args: BaseArgs): Result<Notification>;
  async revertPrimary(args: InstanceArgs): Result<Notification>;
  async revertPrimary(args: RevertArgs): Result<Notification> {
    return this.callWithSession(async () =>
      revertAction({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
        actionType: ActionTypeEnum.PRIMARY,
      })
    );
  }

  async revertSecondary(args: BaseArgs): Result<Notification>;
  async revertSecondary(args: InstanceArgs): Result<Notification>;
  async revertSecondary(args: RevertArgs): Result<Notification> {
    return this.callWithSession(async () =>
      revertAction({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
        actionType: ActionTypeEnum.SECONDARY,
      })
    );
  }

  async readAll({ tags }: { tags?: NotificationFilter['tags'] } = {}): Result<void> {
    return this.callWithSession(async () =>
      readAll({
        emitter: this._emitter,
        inboxService: this._inboxService,
        notificationsCache: this.cache,
        tags,
      })
    );
  }

  async archiveAll({ tags }: { tags?: NotificationFilter['tags'] } = {}): Result<void> {
    return this.callWithSession(async () =>
      archiveAll({
        emitter: this._emitter,
        inboxService: this._inboxService,
        notificationsCache: this.cache,
        tags,
      })
    );
  }

  async archiveAllRead({ tags }: { tags?: NotificationFilter['tags'] } = {}): Result<void> {
    return this.callWithSession(async () =>
      archiveAllRead({
        emitter: this._emitter,
        inboxService: this._inboxService,
        notificationsCache: this.cache,
        tags,
      })
    );
  }

  clearCache({ filter }: { filter?: NotificationFilter } = {}): void {
    if (filter) {
      return this.cache.clear(filter ?? {});
    }

    return this.cache.clearAll();
  }
}
