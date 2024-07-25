import { Action, ActionTypeEnum } from '../types';
import { InboxService } from '../api';
import type { NovuEventEmitter } from '../event-emitter';
import { Notification } from './notification';
import { ArchivedArgs, CompleteArgs, ReadArgs, RevertArgs, UnarchivedArgs, UnreadArgs } from './types';

export const read = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: ReadArgs;
}): Promise<Notification> => {
  const { notificationId, optimisticValue } = getNotificationDetails(args, {
    isRead: true,
    readAt: new Date().toISOString(),
    isArchived: false,
    archivedAt: undefined,
  });

  try {
    emitter.emit('notification.read.pending', {
      args,
      optimistic: optimisticValue,
    });

    const response = await apiService.read(notificationId);

    const updatedNotification = new Notification(response);
    emitter.emit('notification.read.success', { args, result: updatedNotification });

    return updatedNotification;
  } catch (error) {
    emitter.emit('notification.read.error', { args, error });
    throw error;
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
}): Promise<Notification> => {
  const { notificationId, optimisticValue } = getNotificationDetails(args, {
    isRead: false,
    readAt: null,
    isArchived: false,
    archivedAt: undefined,
  });
  try {
    emitter.emit('notification.unread.pending', {
      args,
      optimistic: optimisticValue,
    });

    const response = await apiService.unread(notificationId);

    const updatedNotification = new Notification(response);
    emitter.emit('notification.unread.success', { args, result: updatedNotification });

    return updatedNotification;
  } catch (error) {
    emitter.emit('notification.unread.error', { args, error });
    throw error;
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
}): Promise<Notification> => {
  const { notificationId, optimisticValue } = getNotificationDetails(args, {
    isArchived: true,
    archivedAt: new Date().toISOString(),
    isRead: true,
    readAt: new Date().toISOString(),
  });

  try {
    emitter.emit('notification.archive.pending', {
      args,
      optimistic: optimisticValue,
    });

    const response = await apiService.archive(notificationId);

    const updatedNotification = new Notification(response);
    emitter.emit('notification.archive.success', { args, result: updatedNotification });

    return updatedNotification;
  } catch (error) {
    emitter.emit('notification.archive.error', { args, error });
    throw error;
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
}): Promise<Notification> => {
  const { notificationId, optimisticValue } = getNotificationDetails(args, {
    isArchived: false,
    archivedAt: null,
    isRead: true,
    readAt: new Date().toISOString(),
  });

  try {
    emitter.emit('notification.unarchive.pending', {
      args,
      optimistic: optimisticValue,
    });

    const response = await apiService.unarchive(notificationId);

    const updatedNotification = new Notification(response);
    emitter.emit('notification.unarchive.success', { args, result: updatedNotification });

    return updatedNotification;
  } catch (error) {
    emitter.emit('notification.unarchive.error', { args, error });
    throw error;
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
}): Promise<Notification> => {
  const optimisticAction: Action =
    'notification' in args
      ? {
          isCompleted: true,
          label: args.notification.primaryAction?.label ?? '',
          url: args.notification.primaryAction?.url,
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
      optimistic: optimisticValue,
    });

    const response = await apiService.completeAction({ actionType, notificationId });

    const updatedNotification = new Notification(response);
    emitter.emit('notification.complete_action.success', { args, result: updatedNotification });

    return updatedNotification;
  } catch (error) {
    emitter.emit('notification.complete_action.error', { args, error });
    throw error;
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
}): Promise<Notification> => {
  const optimisticAction: Action =
    'notification' in args
      ? {
          isCompleted: false,
          label: args.notification.primaryAction?.label ?? '',
          url: args.notification.primaryAction?.url,
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
      optimistic: optimisticValue,
    });

    const response = await apiService.revertAction({ actionType, notificationId });

    const updatedNotification = new Notification(response);
    emitter.emit('notification.revert_action.success', { args, result: updatedNotification });

    return updatedNotification;
  } catch (error) {
    emitter.emit('notification.revert_action.error', { args, error });
    throw error;
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
