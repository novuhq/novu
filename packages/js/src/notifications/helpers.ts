import { Action, ActionTypeEnum, NotificationFilter, Result } from '../types';
import type { InboxService } from '../api';
import type { NovuEventEmitter } from '../event-emitter';
import { Notification } from './notification';
import type { ArchivedArgs, CompleteArgs, ReadArgs, RevertArgs, UnarchivedArgs, UnreadArgs } from './types';
import { NovuError } from '../utils/errors';
import type { NotificationsCache } from '../cache';

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
  args: ReadArgs | UnreadArgs | ArchivedArgs | UnarchivedArgs,
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
}: {
  emitter: NovuEventEmitter;
  inboxService: InboxService;
  notificationsCache: NotificationsCache;
  tags?: NotificationFilter['tags'];
}): Result<void> => {
  try {
    const notifications = notificationsCache.getUniqueNotifications({ tags });
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
    emitter.emit('notifications.read_all.pending', { args: { tags }, data: optimisticNotifications });

    await inboxService.readAll({ tags });

    emitter.emit('notifications.read_all.resolved', { args: { tags }, data: optimisticNotifications });

    return {};
  } catch (error) {
    emitter.emit('notifications.read_all.resolved', { args: { tags }, error });

    return { error: new NovuError('Failed to read all notifications', error) };
  }
};

export const archiveAll = async ({
  emitter,
  inboxService,
  notificationsCache,
  tags,
}: {
  emitter: NovuEventEmitter;
  inboxService: InboxService;
  notificationsCache: NotificationsCache;
  tags?: NotificationFilter['tags'];
}): Result<void> => {
  try {
    const notifications = notificationsCache.getUniqueNotifications({ tags });
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
    emitter.emit('notifications.archive_all.pending', { args: { tags }, data: optimisticNotifications });

    await inboxService.archiveAll({ tags });

    emitter.emit('notifications.archive_all.resolved', { args: { tags }, data: optimisticNotifications });

    return {};
  } catch (error) {
    emitter.emit('notifications.archive_all.resolved', { args: { tags }, error });

    return { error: new NovuError('Failed to archive all notifications', error) };
  }
};

export const archiveAllRead = async ({
  emitter,
  inboxService,
  notificationsCache,
  tags,
}: {
  emitter: NovuEventEmitter;
  inboxService: InboxService;
  notificationsCache: NotificationsCache;
  tags?: NotificationFilter['tags'];
}): Result<void> => {
  try {
    const notifications = notificationsCache.getUniqueNotifications({ tags, read: true });
    const optimisticNotifications = notifications.map(
      (notification) =>
        new Notification(
          { ...notification, isArchived: true, archivedAt: new Date().toISOString() },
          emitter,
          inboxService
        )
    );
    emitter.emit('notifications.archive_all_read.pending', { args: { tags }, data: optimisticNotifications });

    await inboxService.archiveAllRead({ tags });

    emitter.emit('notifications.archive_all_read.resolved', { args: { tags }, data: optimisticNotifications });

    return {};
  } catch (error) {
    emitter.emit('notifications.archive_all_read.resolved', { args: { tags }, error });

    return { error: new NovuError('Failed to archive all read notifications', error) };
  }
};
