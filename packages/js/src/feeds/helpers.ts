import type { ApiService } from '@novu/client';

import type { NovuEventEmitter } from '../event-emitter';
import { NotificationActionStatus, NotificationButton, NotificationStatus, TODO } from '../types';
import { Notification } from './notification';
import {
  MarkNotificationActionAsArgs,
  MarkNotificationAsArgs,
  MarkNotificationsAsArgs,
  RemoveNotificationArgs,
  RemoveNotificationsArgs,
} from './types';

export const mapFromApiNotification = (apiNotification: TODO): Notification =>
  new Notification({
    id: apiNotification.id,
    feedIdentifier: apiNotification._feedId,
    createdAt: apiNotification.createdAt,
    avatar: apiNotification.actor,
    body: apiNotification.content,
    read: apiNotification.read,
    seen: apiNotification.seen,
    deleted: apiNotification.deleted,
    cta: apiNotification.cta,
  });

const getOptimisticMarkAs = (status: NotificationStatus): Partial<Notification> => {
  switch (status) {
    case NotificationStatus.READ:
      return { read: true, seen: true };
    case NotificationStatus.UNREAD:
      return { read: false, seen: true };
    case NotificationStatus.SEEN:
      return { seen: true };
    case NotificationStatus.UNSEEN:
      return { seen: false };
    default:
      return {};
  }
};

const getFallbackMarkAs = (status: NotificationStatus, notification: Notification): Partial<Notification> => {
  switch (status) {
    case NotificationStatus.READ:
    case NotificationStatus.UNREAD:
      return { read: notification.read, seen: notification.seen };
    case NotificationStatus.SEEN:
    case NotificationStatus.UNSEEN:
      return { seen: notification.seen };
    default:
      return {};
  }
};

export const markNotificationAs = async ({
  emitter,
  apiService,
  args: { id, notification, status = NotificationStatus.SEEN },
}: {
  emitter: NovuEventEmitter;
  apiService: ApiService;
  args: MarkNotificationAsArgs;
}): Promise<Notification> => {
  const isNotification = typeof notification !== 'undefined';
  const notificationId = isNotification ? notification.id : id ?? '';
  const args = { id, notification, status };
  try {
    emitter.emit('notification.mark_as.pending', {
      args,
      optimistic: isNotification ? new Notification({ ...notification, ...getOptimisticMarkAs(status) }) : undefined,
    });

    const response = await apiService.markMessagesAs({
      messageId: [notificationId],
      markAs: status,
    });
    const updatedNotification = new Notification(mapFromApiNotification(response[0] as TODO));

    emitter.emit('notification.mark_as.success', { args, result: updatedNotification });

    return updatedNotification;
  } catch (error) {
    emitter.emit('notification.mark_as.error', {
      args,
      error,
      fallback: isNotification
        ? new Notification({ ...notification, ...getFallbackMarkAs(status, notification) })
        : undefined,
    });
    throw error;
  }
};

const getOptimisticMarkActionAs = (notification: Notification, button: NotificationButton): Partial<Notification> => ({
  cta: {
    action: {
      ...notification.cta.action,
      status: NotificationActionStatus.DONE,
      result: {
        ...notification.cta.action?.result,
        type: button,
      },
    },
    ...notification.cta,
  },
});

const getFallbackMarkActionAs = (notification: Notification): Partial<Notification> => {
  const oldStatus = notification.cta.action?.status;
  const oldResultType = notification.cta.action?.result?.type;

  return {
    cta: {
      action: {
        ...notification.cta.action,
        status: oldStatus,
        result: {
          ...notification.cta.action?.result,
          type: oldResultType,
        },
      },
      ...notification.cta,
    },
  };
};

export const markActionAs = async ({
  emitter,
  apiService,
  args: { id, notification, button = NotificationButton.PRIMARY, status = NotificationActionStatus.DONE },
}: {
  emitter: NovuEventEmitter;
  apiService: ApiService;
  args: MarkNotificationActionAsArgs;
}): Promise<Notification> => {
  const isNotification = typeof notification !== 'undefined';
  const notificationId = isNotification ? notification.id : id ?? '';
  const args = { id, notification, button, status };
  try {
    emitter.emit('notification.mark_action_as.pending', {
      args,
      optimistic: isNotification
        ? new Notification({ ...notification, ...getOptimisticMarkActionAs(notification, button) })
        : undefined,
    });

    const response = await apiService.updateAction(notificationId, button, status);
    const updatedNotification = new Notification(mapFromApiNotification(response as TODO));

    emitter.emit('notification.mark_action_as.success', {
      args,
      result: updatedNotification,
    });

    return updatedNotification;
  } catch (error) {
    emitter.emit('notification.mark_action_as.error', {
      args,
      error,
      fallback: isNotification
        ? new Notification({ ...notification, ...getFallbackMarkActionAs(notification) })
        : undefined,
    });
    throw error;
  }
};

export const remove = async ({
  emitter,
  apiService,
  args: { id, notification },
}: {
  emitter: NovuEventEmitter;
  apiService: ApiService;
  args: RemoveNotificationArgs;
}): Promise<Notification | void> => {
  const isNotification = typeof notification !== 'undefined';
  const notificationId = isNotification ? notification.id : id ?? '';
  const args = { id, notification };
  try {
    const deletedNotification = isNotification
      ? new Notification({ ...notification, ...{ deleted: true } })
      : undefined;
    emitter.emit('notification.remove.pending', {
      args,
      optimistic: deletedNotification,
    });

    await apiService.removeMessage(notificationId);

    emitter.emit('notification.remove.success', { args, result: deletedNotification });

    return deletedNotification;
  } catch (error) {
    emitter.emit('notification.remove.error', {
      args,
      error,
      fallback: isNotification ? new Notification({ ...notification, ...{ deleted: false } }) : undefined,
    });
    throw error;
  }
};

export const removeNotifications = async ({
  emitter,
  apiService,
  args: { ids, notifications },
}: {
  emitter: NovuEventEmitter;
  apiService: ApiService;
  args: RemoveNotificationsArgs;
}): Promise<Notification[] | void> => {
  const args = { ids, notifications };
  const isNotificationArray = notifications && notifications.length > 0;
  try {
    const optimisticNotifications = isNotificationArray
      ? notifications.map((el) => new Notification({ ...el, deleted: true }))
      : undefined;
    emitter.emit('feeds.remove_notifications.pending', { args, optimistic: optimisticNotifications });

    const notificationIds = isNotificationArray ? notifications.map((el) => el.id) : ids ?? [];
    await apiService.removeMessages(notificationIds);

    emitter.emit('feeds.remove_notifications.success', { args, result: optimisticNotifications });

    return optimisticNotifications;
  } catch (error) {
    const fallbackNotifications = isNotificationArray
      ? notifications.map((el) => new Notification({ ...el, deleted: false }))
      : undefined;

    emitter.emit('feeds.remove_notifications.error', { args, error, fallback: fallbackNotifications });
    throw error;
  }
};

export const markNotificationsAs = async ({
  emitter,
  apiService,
  args: { ids, notifications, status = NotificationStatus.SEEN },
}: {
  emitter: NovuEventEmitter;
  apiService: ApiService;
  args: MarkNotificationsAsArgs;
}): Promise<Notification[]> => {
  const args = { ids, notifications, status };
  const isNotificationArray = notifications && notifications.length > 0;
  try {
    const optimisticNotifications = isNotificationArray
      ? notifications.map((el) => new Notification({ ...el, ...getOptimisticMarkAs(status) }))
      : undefined;
    emitter.emit('feeds.mark_notifications_as.pending', { args, optimistic: optimisticNotifications });

    const notificationIds = isNotificationArray
      ? notifications.map((el) => (typeof el === 'string' ? el : el.id))
      : ids ?? [];
    const response = await apiService.markMessagesAs({
      messageId: notificationIds,
      markAs: status,
    });

    const updatedNotifications = response.map((el) => new Notification(mapFromApiNotification(el as TODO)));
    emitter.emit('feeds.mark_notifications_as.success', {
      args,
      result: updatedNotifications,
    });

    return updatedNotifications;
  } catch (error) {
    const fallbackNotifications = isNotificationArray
      ? notifications.map((el) => new Notification({ ...el, ...getFallbackMarkAs(status, el) }))
      : undefined;
    emitter.emit('feeds.mark_notifications_as.error', { args, error, fallback: fallbackNotifications });
    throw error;
  }
};
