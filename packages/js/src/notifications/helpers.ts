import { Action, ActionTypeEnum, Result } from '../types';
import { InboxService } from '../api';
import type { NovuEventEmitter } from '../event-emitter';
import { Notification } from './notification';
import { ArchivedArgs, CompleteArgs, ReadArgs, RevertArgs, UnarchivedArgs, UnreadArgs } from './types';
import { NovuError } from '../utils/errors';

export const read = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: ReadArgs;
}): Result<Notification> => {
  const { notificationId, optimisticValue } = getNotificationDetails(args, {
    isRead: true,
    readAt: new Date().toISOString(),
    isArchived: false,
    archivedAt: undefined,
  });

  try {
    emitter.emit('notification.read.pending', {
      args,
      data: optimisticValue,
    });

    const response = await apiService.read(notificationId);

    const updatedNotification = new Notification(response);
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
  const { notificationId, optimisticValue } = getNotificationDetails(args, {
    isRead: false,
    readAt: null,
    isArchived: false,
    archivedAt: undefined,
  });
  try {
    emitter.emit('notification.unread.pending', {
      args,
      data: optimisticValue,
    });

    const response = await apiService.unread(notificationId);

    const updatedNotification = new Notification(response);
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
  const { notificationId, optimisticValue } = getNotificationDetails(args, {
    isArchived: true,
    archivedAt: new Date().toISOString(),
    isRead: true,
    readAt: new Date().toISOString(),
  });

  try {
    emitter.emit('notification.archive.pending', {
      args,
      data: optimisticValue,
    });

    const response = await apiService.archive(notificationId);

    const updatedNotification = new Notification(response);
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
  const { notificationId, optimisticValue } = getNotificationDetails(args, {
    isArchived: false,
    archivedAt: null,
    isRead: true,
    readAt: new Date().toISOString(),
  });

  try {
    emitter.emit('notification.unarchive.pending', {
      args,
      data: optimisticValue,
    });

    const response = await apiService.unarchive(notificationId);

    const updatedNotification = new Notification(response);
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
  const optimisticAction: Action =
    'notification' in args
      ? {
          isCompleted: true,
          label: args.notification.primaryAction?.label ?? '',
        }
      : {
          isCompleted: true,
          label: '',
        };

  const { notificationId, optimisticValue } = getNotificationDetails(
    args,
    actionType === ActionTypeEnum.PRIMARY
      ? {
          primaryAction: optimisticAction,
        }
      : { secondaryAction: optimisticAction }
  );

  try {
    emitter.emit('notification.complete_action.pending', {
      args,
      data: optimisticValue,
    });

    const response = await apiService.completeAction({ actionType, notificationId });

    const updatedNotification = new Notification(response);
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
  const optimisticAction: Action =
    'notification' in args
      ? {
          isCompleted: false,
          label: args.notification.primaryAction?.label ?? '',
        }
      : {
          isCompleted: false,
          label: '',
        };

  const { notificationId, optimisticValue } = getNotificationDetails(
    args,
    actionType === ActionTypeEnum.PRIMARY
      ? {
          primaryAction: optimisticAction,
        }
      : { secondaryAction: optimisticAction }
  );

  try {
    emitter.emit('notification.revert_action.pending', {
      args,
      data: optimisticValue,
    });

    const response = await apiService.revertAction({ actionType, notificationId });

    const updatedNotification = new Notification(response);
    emitter.emit('notification.revert_action.resolved', { args, data: updatedNotification });

    return { data: updatedNotification };
  } catch (error) {
    emitter.emit('notification.revert_action.resolved', { args, error });

    return { error: new NovuError('Failed to fetch notifications', error) };
  }
};

const getNotificationDetails = (
  args: ReadArgs | UnreadArgs | ArchivedArgs | UnarchivedArgs,
  update: Partial<Notification>
): { notificationId: string; optimisticValue?: Notification } => {
  if ('notification' in args) {
    return {
      notificationId: args.notification.id,
      optimisticValue: new Notification({ ...args.notification, ...update }),
    };
  } else {
    return {
      notificationId: args.notificationId,
    };
  }
};
