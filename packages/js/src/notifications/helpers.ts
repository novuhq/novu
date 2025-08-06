import type { InboxService } from '../api';
import type { NotificationsCache } from '../cache';
import type { NovuEventEmitter } from '../event-emitter';
import { Action, ActionTypeEnum, NotificationFilter, Result } from '../types';
import { NovuError } from '../utils/errors';
import { Notification } from './notification';
import type {
  ArchivedArgs,
  CompleteArgs,
  ReadArgs,
  RevertArgs,
  SeenArgs,
  SnoozeArgs,
  UnarchivedArgs,
  UnreadArgs,
  UnsnoozeArgs,
} from './types';

export const read = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: ReadArgs;
}): Result<Notification> => {
  const { notificationId, optimisticValue } = getNotificationDetails(
    args,
    {
      isRead: true,
      readAt: new Date().toISOString(),
      isArchived: false,
      archivedAt: undefined,
    },
    {
      emitter,
      apiService,
    }
  );

  try {
    emitter.emit('notification.read.pending', {
      args,
      data: optimisticValue,
    });

    const response = await apiService.read(notificationId);

    const updatedNotification = new Notification(response, emitter, apiService);
    emitter.emit('notification.read.resolved', { args, data: updatedNotification });

    return { data: updatedNotification };
  } catch (error) {
    emitter.emit('notification.read.resolved', { args, error });

    return { error: new NovuError('Failed to read notification', error) };
  }
};

export const unread = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: UnreadArgs;
}): Result<Notification> => {
  const { notificationId, optimisticValue } = getNotificationDetails(
    args,
    {
      isRead: false,
      readAt: null,
      isArchived: false,
      archivedAt: undefined,
    },
    {
      emitter,
      apiService,
    }
  );
  try {
    emitter.emit('notification.unread.pending', {
      args,
      data: optimisticValue,
    });

    const response = await apiService.unread(notificationId);

    const updatedNotification = new Notification(response, emitter, apiService);
    emitter.emit('notification.unread.resolved', { args, data: updatedNotification });

    return { data: updatedNotification };
  } catch (error) {
    emitter.emit('notification.unread.resolved', { args, error });

    return { error: new NovuError('Failed to unread notification', error) };
  }
};

export const seen = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: SeenArgs;
}): Result<Notification> => {
  const { notificationId, optimisticValue } = getNotificationDetails(
    args,
    {
      isSeen: true,
    },
    {
      emitter,
      apiService,
    }
  );

  try {
    emitter.emit('notification.seen.pending', {
      args,
      data: optimisticValue,
    });

    await apiService.seen(notificationId);

    if (!optimisticValue) {
      throw new Error('Failed to create optimistic value for notification');
    }

    const updatedNotification = new Notification(optimisticValue, emitter, apiService);
    emitter.emit('notification.seen.resolved', { args, data: updatedNotification });

    return { data: updatedNotification };
  } catch (error) {
    emitter.emit('notification.seen.resolved', { args, error });

    return { error: new NovuError('Failed to mark notification as seen', error) };
  }
};

export const archive = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: ArchivedArgs;
}): Result<Notification> => {
  const { notificationId, optimisticValue } = getNotificationDetails(
    args,
    {
      isArchived: true,
      archivedAt: new Date().toISOString(),
      isRead: true,
      readAt: new Date().toISOString(),
    },
    {
      emitter,
      apiService,
    }
  );

  try {
    emitter.emit('notification.archive.pending', {
      args,
      data: optimisticValue,
    });

    const response = await apiService.archive(notificationId);

    const updatedNotification = new Notification(response, emitter, apiService);
    emitter.emit('notification.archive.resolved', { args, data: updatedNotification });

    return { data: updatedNotification };
  } catch (error) {
    emitter.emit('notification.archive.resolved', { args, error });

    return { error: new NovuError('Failed to archive notification', error) };
  }
};

export const unarchive = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: UnarchivedArgs;
}): Result<Notification> => {
  const { notificationId, optimisticValue } = getNotificationDetails(
    args,
    {
      isArchived: false,
      archivedAt: null,
      isRead: true,
      readAt: new Date().toISOString(),
    },
    {
      emitter,
      apiService,
    }
  );

  try {
    emitter.emit('notification.unarchive.pending', {
      args,
      data: optimisticValue,
    });

    const response = await apiService.unarchive(notificationId);

    const updatedNotification = new Notification(response, emitter, apiService);
    emitter.emit('notification.unarchive.resolved', { args, data: updatedNotification });

    return { data: updatedNotification };
  } catch (error) {
    emitter.emit('notification.unarchive.resolved', { args, error });

    return { error: new NovuError('Failed to unarchive notification', error) };
  }
};

export const snooze = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: SnoozeArgs;
}): Result<Notification> => {
  const { notificationId, optimisticValue } = getNotificationDetails(
    args,
    {
      isSnoozed: true,
      snoozedUntil: args.snoozeUntil,
    },
    {
      emitter,
      apiService,
    }
  );

  try {
    emitter.emit('notification.snooze.pending', {
      args,
      data: optimisticValue,
    });

    const response = await apiService.snooze(notificationId, args.snoozeUntil);

    const updatedNotification = new Notification(response, emitter, apiService);
    emitter.emit('notification.snooze.resolved', { args, data: updatedNotification });

    return { data: updatedNotification };
  } catch (error) {
    emitter.emit('notification.snooze.resolved', { args, error });

    return { error: new NovuError('Failed to snooze notification', error) };
  }
};

export const unsnooze = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: UnsnoozeArgs;
}): Result<Notification> => {
  const { notificationId, optimisticValue } = getNotificationDetails(
    args,
    {
      isSnoozed: false,
      snoozedUntil: null,
    },
    {
      emitter,
      apiService,
    }
  );

  try {
    emitter.emit('notification.unsnooze.pending', {
      args,
      data: optimisticValue,
    });

    const response = await apiService.unsnooze(notificationId);

    const updatedNotification = new Notification(response, emitter, apiService);
    emitter.emit('notification.unsnooze.resolved', { args, data: updatedNotification });

    return { data: updatedNotification };
  } catch (error) {
    emitter.emit('notification.unsnooze.resolved', { args, error });

    return { error: new NovuError('Failed to unsnooze notification', error) };
  }
};

export const completeAction = async ({
  emitter,
  apiService,
  args,
  actionType,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: CompleteArgs;
  actionType: ActionTypeEnum;
}): Result<Notification> => {
  const optimisticUpdate: Partial<Notification> =
    actionType === ActionTypeEnum.PRIMARY
      ? {
          primaryAction: {
            ...(('notification' in args ? args.notification.primaryAction : {}) as any),
            isCompleted: true,
          },
        }
      : {
          secondaryAction: {
            ...(('notification' in args ? args.notification.secondaryAction : {}) as any),
            isCompleted: true,
          },
        };
  const { notificationId, optimisticValue } = getNotificationDetails(args, optimisticUpdate, {
    emitter,
    apiService,
  });

  try {
    emitter.emit('notification.complete_action.pending', {
      args,
      data: optimisticValue,
    });

    const response = await apiService.completeAction({ actionType, notificationId });

    const updatedNotification = new Notification(response, emitter, apiService);
    emitter.emit('notification.complete_action.resolved', { args, data: updatedNotification });

    return { data: updatedNotification };
  } catch (error) {
    emitter.emit('notification.complete_action.resolved', { args, error });

    return { error: new NovuError(`Failed to complete ${actionType} action on the notification`, error) };
  }
};

export const revertAction = async ({
  emitter,
  apiService,
  args,
  actionType,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: RevertArgs;
  actionType: ActionTypeEnum;
}): Result<Notification> => {
  const optimisticUpdate: Partial<Notification> =
    actionType === ActionTypeEnum.PRIMARY
      ? {
          primaryAction: {
            ...(('notification' in args ? args.notification.primaryAction : {}) as any),
            isCompleted: false,
          },
        }
      : {
          secondaryAction: {
            ...(('notification' in args ? args.notification.secondaryAction : {}) as any),
            isCompleted: false,
          },
        };

  const { notificationId, optimisticValue } = getNotificationDetails(args, optimisticUpdate, {
    emitter,
    apiService,
  });

  try {
    emitter.emit('notification.revert_action.pending', {
      args,
      data: optimisticValue,
    });

    const response = await apiService.revertAction({ actionType, notificationId });

    const updatedNotification = new Notification(response, emitter, apiService);
    emitter.emit('notification.revert_action.resolved', { args, data: updatedNotification });

    return { data: updatedNotification };
  } catch (error) {
    emitter.emit('notification.revert_action.resolved', { args, error });

    return { error: new NovuError('Failed to fetch notifications', error) };
  }
};

const getNotificationDetails = (
  args: ReadArgs | UnreadArgs | ArchivedArgs | UnarchivedArgs | SnoozeArgs | UnsnoozeArgs,
  update: Partial<Notification>,
  dependencies: {
    emitter: NovuEventEmitter;
    apiService: InboxService;
  }
): { notificationId: string; optimisticValue?: Notification } => {
  if ('notification' in args) {
    return {
      notificationId: args.notification.id,
      optimisticValue: new Notification(
        { ...args.notification, ...update },
        dependencies.emitter,
        dependencies.apiService
      ),
    };
  } else {
    return {
      notificationId: args.notificationId,
    };
  }
};

export const readAll = async ({
  emitter,
  inboxService,
  notificationsCache,
  tags,
  data,
}: {
  emitter: NovuEventEmitter;
  inboxService: InboxService;
  notificationsCache: NotificationsCache;
  tags?: NotificationFilter['tags'];
  data?: Record<string, unknown>;
}): Result<void> => {
  try {
    const notifications = notificationsCache.getUniqueNotifications({ tags, data });
    const optimisticNotifications = notifications.map(
      (notification) =>
        new Notification(
          {
            ...notification,
            isRead: true,
            readAt: new Date().toISOString(),
            isArchived: false,
            archivedAt: undefined,
          },
          emitter,
          inboxService
        )
    );
    emitter.emit('notifications.read_all.pending', { args: { tags, data }, data: optimisticNotifications });

    await inboxService.readAll({ tags, data });

    emitter.emit('notifications.read_all.resolved', { args: { tags, data }, data: optimisticNotifications });

    return {};
  } catch (error) {
    emitter.emit('notifications.read_all.resolved', { args: { tags, data }, error });

    return { error: new NovuError('Failed to read all notifications', error) };
  }
};

export const seenAll = async ({
  emitter,
  inboxService,
  notificationsCache,
  notificationIds,
  tags,
  data,
}: {
  emitter: NovuEventEmitter;
  inboxService: InboxService;
  notificationsCache: NotificationsCache;
  notificationIds?: string[];
  tags?: NotificationFilter['tags'];
  data?: Record<string, unknown>;
}): Result<void> => {
  try {
    const notifications = notificationsCache.getUniqueNotifications({ tags, data });

    // Filter notifications by IDs if provided
    const filteredNotifications =
      notificationIds && notificationIds.length > 0
        ? notifications.filter((notification) => notificationIds.includes(notification.id))
        : notifications;

    const optimisticNotifications = filteredNotifications.map(
      (notification) =>
        new Notification(
          {
            ...notification,
            isSeen: true,
            firstSeenAt: notification.firstSeenAt || new Date().toISOString(),
          },
          emitter,
          inboxService
        )
    );

    emitter.emit('notifications.seen_all.pending', {
      args: { notificationIds, tags, data },
      data: optimisticNotifications,
    });

    await inboxService.markAsSeen({ notificationIds, tags, data });

    emitter.emit('notifications.seen_all.resolved', {
      args: { notificationIds, tags, data },
      data: optimisticNotifications,
    });

    return {};
  } catch (error) {
    emitter.emit('notifications.seen_all.resolved', { args: { notificationIds, tags, data }, error });

    return { error: new NovuError('Failed to mark all notifications as seen', error) };
  }
};

export const archiveAll = async ({
  emitter,
  inboxService,
  notificationsCache,
  tags,
  data,
}: {
  emitter: NovuEventEmitter;
  inboxService: InboxService;
  notificationsCache: NotificationsCache;
  tags?: NotificationFilter['tags'];
  data?: Record<string, unknown>;
}): Result<void> => {
  try {
    const notifications = notificationsCache.getUniqueNotifications({ tags, data });
    const optimisticNotifications = notifications.map(
      (notification) =>
        new Notification(
          {
            ...notification,
            isRead: true,
            readAt: new Date().toISOString(),
            isArchived: true,
            archivedAt: new Date().toISOString(),
          },
          emitter,
          inboxService
        )
    );
    emitter.emit('notifications.archive_all.pending', { args: { tags, data }, data: optimisticNotifications });

    await inboxService.archiveAll({ tags, data });

    emitter.emit('notifications.archive_all.resolved', { args: { tags, data }, data: optimisticNotifications });

    return {};
  } catch (error) {
    emitter.emit('notifications.archive_all.resolved', { args: { tags, data }, error });

    return { error: new NovuError('Failed to archive all notifications', error) };
  }
};

export const archiveAllRead = async ({
  emitter,
  inboxService,
  notificationsCache,
  tags,
  data,
}: {
  emitter: NovuEventEmitter;
  inboxService: InboxService;
  notificationsCache: NotificationsCache;
  tags?: NotificationFilter['tags'];
  data?: Record<string, unknown>;
}): Result<void> => {
  try {
    const notifications = notificationsCache.getUniqueNotifications({ tags, data, read: true });
    const optimisticNotifications = notifications.map(
      (notification) =>
        new Notification(
          { ...notification, isArchived: true, archivedAt: new Date().toISOString() },
          emitter,
          inboxService
        )
    );
    emitter.emit('notifications.archive_all_read.pending', { args: { tags, data }, data: optimisticNotifications });

    await inboxService.archiveAllRead({ tags, data });

    emitter.emit('notifications.archive_all_read.resolved', { args: { tags, data }, data: optimisticNotifications });

    return {};
  } catch (error) {
    emitter.emit('notifications.archive_all_read.resolved', { args: { tags, data }, error });

    return { error: new NovuError('Failed to archive all read notifications', error) };
  }
};
