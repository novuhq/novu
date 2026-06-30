import { InboxService } from '../../api';
import { NovuEventEmitter } from '../../event-emitter';
import { ensureNotificationInstance } from '../../notifications/helpers';
import { InboxNotification } from '../../types';
import { Notification } from '../../notifications/notification';

export function createNotification({
  emitter,
  inboxService,
  notification,
}: {
  emitter: NovuEventEmitter;
  inboxService: InboxService;
  notification: InboxNotification;
}): Notification {
  return ensureNotificationInstance({
    notification,
    emitter,
    inboxService,
  });
}
